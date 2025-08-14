const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { uploadLimiter, apiLimiter } = require('./middleware/rateLimiter');
const statsManager = require('./utils/statsManager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(helmet()); // Segurança
app.use(compression()); // Compressão
app.use(cors());
app.use(apiLimiter); // Rate limiting global
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração do Multer para upload de arquivos
const upload = multer({ 
  dest: path.join(__dirname, 'uploads'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log(`📄 Arquivo recebido: ${file.originalname}, tipo: ${file.mimetype}`);
    
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos!'));
    }
  }
});

// Middleware para tratamento de erros do Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Erro Multer:', error.message);
    return res.status(400).json({ 
      success: false,
      error: `Erro no upload: ${error.message}` 
    });
  }
  
  if (error.message.includes('CSV')) {
    console.error('Erro de arquivo:', error.message);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
  
  next(error);
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de teste da API
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando!',
    timestamp: new Date().toISOString() 
  });
});

// Rota para testar a chave da OpenAI
app.get('/api/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testando chave da OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Diga apenas 'Teste OK' para confirmar que a API está funcionando"
        }
      ],
      max_tokens: 10
    });

    const response = completion.choices[0].message.content.trim();
    
    res.json({
      success: true,
      message: 'Chave da OpenAI funcionando!',
      response: response,
      tokens: completion.usage?.total_tokens || 0
    });
    
  } catch (error) {
    console.error('❌ Erro no teste da OpenAI:', error.message);
    
    let errorMessage = 'Problema com a chave da OpenAI: ';
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      errorMessage = '🔑 Chave da OpenAI inválida ou expirada. Você precisa configurar uma nova chave!';
    } else if (error.message.includes('quota') || error.message.includes('billing')) {
      errorMessage = '💳 Cota da OpenAI esgotada. Verifique seu plano/pagamento na OpenAI.';
    } else if (error.message.includes('rate_limit')) {
      errorMessage = '⏱️ Limite de requisições atingido. Tente novamente em alguns minutos.';
    } else {
      errorMessage += error.message;
    }
    
    res.status(400).json({
      success: false,
      error: errorMessage,
      needNewKey: error.message.includes('401') || error.message.includes('authentication')
    });
  }
});

// Rota de estatísticas
app.get('/api/stats', (req, res) => {
  const stats = statsManager.getStats();
  if (stats) {
    res.json({
      success: true,
      stats: {
        ...stats,
        uptime: process.uptime(),
        version: require('./package.json').version
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar estatísticas'
    });
  }
});

// Rota de teste de upload (sem IA)
app.post('/api/test-upload', upload.single('csvFile'), (req, res) => {
  try {
    console.log('🧪 Teste de upload recebido');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Nenhum arquivo enviado' 
      });
    }
    
    console.log('📄 Arquivo:', req.file.originalname);
    console.log('📏 Tamanho:', req.file.size);
    console.log('🗂️ Tipo:', req.file.mimetype);
    
    // Limpar arquivo temporário
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      success: true,
      message: 'Upload de teste funcionou!',
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de upload:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Rota para upload e processamento do CSV
app.post('/upload-csv', uploadLimiter, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📥 Recebendo requisição de upload...');
    
    if (!req.file) {
      console.log('❌ Nenhum arquivo enviado');
      return res.status(400).json({ 
        success: false,
        error: 'Nenhum arquivo foi enviado' 
      });
    }

    console.log(`📄 Arquivo recebido: ${req.file.originalname}`);
    statsManager.updateStats('upload');
    
    const { processingType = 'rewrite' } = req.body;
    const csvData = [];
    const processedData = [];

    // Ler o arquivo CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        csvData.push(row);
      })
      .on('end', async () => {
        try {
          console.log(`📊 ${csvData.length} linhas encontradas no CSV`);

          // Processar cada linha com IA
          for (const [index, row] of csvData.entries()) {
            try {
              console.log(`🤖 Processando linha ${index + 1}/${csvData.length}...`);
              const processedRow = await processRowWithAI(row, processingType);
              processedData.push(processedRow);
              
            } catch (error) {
              console.error(`❌ Erro ao processar linha ${index + 1}:`, error.message);
              // Manter dados originais em caso de erro
              processedData.push({ 
                ...row, 
                conteudo_processado: `ERRO: ${error.message}`,
                erro_processamento: true
              });
            }
          }

          // Criar diretório outputs se não existir
          const outputDir = path.join(__dirname, 'outputs');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
          }

          // Gerar novo CSV
          const outputFilename = `processed_${Date.now()}.csv`;
          const outputPath = path.join(outputDir, outputFilename);

          if (processedData.length === 0) {
            throw new Error('Nenhum dado foi processado');
          }

          const csvWriter = createCsvWriter({
            path: outputPath,
            header: Object.keys(processedData[0] || {}).map(key => ({
              id: key,
              title: key
            }))
          });

          await csvWriter.writeRecords(processedData);
          console.log(`✅ CSV processado salvo: ${outputFilename}`);

          // Atualizar estatísticas
          const totalTokens = processedData.reduce((sum, row) => sum + (row.tokens_usados || 0), 0);
          statsManager.updateStats('processed', {
            count: processedData.length,
            tokens: totalTokens,
            processingType: processingType
          });

          // Limpar arquivo temporário
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          res.json({
            success: true,
            message: `${processedData.length} linhas processadas com sucesso!`,
            downloadUrl: `/download/${outputFilename}`,
            preview: processedData.slice(0, 5), // Primeiras 5 linhas para preview
            processedCount: processedData.length,
            processingType: processingType
          });

        } catch (error) {
          console.error('❌ Erro no processamento final:', error);
          statsManager.updateStats('error');
          res.status(500).json({ 
            success: false,
            error: `Erro no processamento: ${error.message}` 
          });
        }
      })
      .on('error', (error) => {
        console.error('❌ Erro ao ler CSV:', error);
        res.status(400).json({ 
          success: false,
          error: `Erro ao ler arquivo CSV: ${error.message}` 
        });
      });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ 
      success: false,
      error: `Erro interno do servidor: ${error.message}` 
    });
  }
});

// Função para processar linha com IA
async function processRowWithAI(row, processingType) {
  // Assumir que a primeira coluna contém o texto principal
  const columns = Object.keys(row);
  const values = Object.values(row);
  const mainText = values[0] || '';
  
  if (!mainText || !mainText.trim()) {
    return { 
      ...row, 
      conteudo_original: mainText,
      conteudo_processado: 'Texto vazio - não processado',
      tipo_processamento: processingType,
      processado_em: new Date().toISOString()
    };
  }

  // Criar o prompt baseado no tipo de processamento
  let prompt = '';
  let systemPrompt = 'Você é um assistente especializado em processamento de texto.';
  
  switch (processingType) {
    case 'rewrite':
      prompt = `Reescreva este texto de forma criativa e original, mantendo o sentido principal: "${mainText}"`;
      systemPrompt += ' Reescreva textos de forma criativa preservando o significado original.';
      break;
    case 'summarize':
      prompt = `Faça um resumo conciso e objetivo deste texto: "${mainText}"`;
      systemPrompt += ' Crie resumos concisos e informativos.';
      break;
    case 'expand':
      prompt = `Expanda este texto com mais detalhes, informações relevantes e contexto: "${mainText}"`;
      systemPrompt += ' Expanda textos com informações úteis e relevantes.';
      break;
    default:
      prompt = `Melhore e otimize este texto: "${mainText}"`;
      systemPrompt += ' Melhore textos tornando-os mais claros e informativos.';
  }

    try {
      console.log(`🤖 Enviando para IA: "${mainText.substring(0, 50)}..."`);
      
      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
        temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
        // Removido timeout - não é suportado na nova versão da API
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('Resposta vazia da API de IA');
      }

      const processedText = completion.choices[0].message.content.trim();
      
      if (!processedText) {
        throw new Error('Texto processado está vazio');
      }

      console.log(`✅ Processado com sucesso: "${processedText.substring(0, 50)}..."`);

      return {
        ...row,
        conteudo_original: mainText,
        conteudo_processado: processedText,
        tipo_processamento: processingType,
        processado_em: new Date().toISOString(),
        tokens_usados: completion.usage?.total_tokens || 0
      };

  } catch (error) {
    console.error(`❌ Erro na API de IA para texto "${mainText.substring(0, 30)}...":`, error.message);
    
    // Verificar se é erro de rate limit ou quota
    if (error.message.includes('rate_limit') || error.message.includes('quota')) {
      throw new Error(`Limite de API atingido: ${error.message}`);
    }
    
    // Verificar se é erro de API key
    if (error.message.includes('api_key') || error.message.includes('authentication')) {
      throw new Error('Erro de autenticação da API OpenAI - verifique a chave');
    }
    
    throw new Error(`Erro na IA: ${error.message}`);
  }
}

// Rota para download do arquivo processado
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'outputs', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Iniciar servidor apenas se não estiver no Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Upload de CSV: POST /upload-csv`);
    console.log(`💾 Downloads em: /download/:filename`);
  });
}

// Exportar para Vercel
module.exports = app;
