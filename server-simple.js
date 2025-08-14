const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuração do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware essenciais
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do multer para upload
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  }
});

// Função para processar texto com IA
async function processText(text, operation) {
  try {
    let prompt;
    
    switch (operation) {
      case 'rewrite':
        prompt = `Reescreva o seguinte texto de forma clara e profissional: "${text}"`;
        break;
      case 'summary':
        prompt = `Resuma o seguinte texto de forma concisa: "${text}"`;
        break;
      case 'expand':
        prompt = `Expanda o seguinte texto com mais detalhes e contexto: "${text}"`;
        break;
      default:
        return text;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro OpenAI:', error);
    return text;
  }
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de processamento
app.post('/process', upload.single('csvFile'), async (req, res) => {
  try {
    const { operation } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Arquivo CSV não encontrado' });
    }

    if (!operation) {
      return res.status(400).json({ success: false, error: 'Operação não especificada' });
    }

    const csvData = [];
    const filePath = req.file.path;

    // Ler CSV
    const readStream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => csvData.push(row))
      .on('end', async () => {
        try {
          // Processar dados
          const processedData = [];
          for (const row of csvData) {
            const processedRow = { ...row };
            
            for (const [key, value] of Object.entries(row)) {
              if (typeof value === 'string' && value.length > 10) {
                processedRow[key] = await processText(value, operation);
              }
            }
            
            processedData.push(processedRow);
          }

          // Gerar CSV processado
          const outputPath = `/tmp/processed_${Date.now()}.csv`;
          const csvWriter = createCsvWriter({
            path: outputPath,
            header: Object.keys(processedData[0] || {}).map(key => ({ id: key, title: key }))
          });

          await csvWriter.writeRecords(processedData);

          // Ler arquivo processado
          const processedCsv = fs.readFileSync(outputPath, 'utf8');

          // Limpar arquivos temporários
          fs.unlinkSync(filePath);
          fs.unlinkSync(outputPath);

          res.json({
            success: true,
            data: processedCsv,
            filename: `processed_${operation}_${req.file.originalname}`,
            downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(processedCsv)}`
          });

        } catch (error) {
          console.error('Erro no processamento:', error);
          res.status(500).json({ success: false, error: error.message });
        }
      });

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API de status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota da API process (compatível com Vercel)
app.post('/api/process', async (req, res) => {
  try {
    const { csvContent, operation = 'rewrite' } = req.body;

    if (!csvContent) {
      return res.status(400).json({ success: false, error: 'Conteúdo CSV não encontrado' });
    }

    // Processar CSV simples
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV vazio' });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const processedLines = [lines[0]]; // Manter cabeçalho

    // Processar apenas as primeiras 3 linhas para evitar timeout
    const dataLines = lines.slice(1, Math.min(4, lines.length));
    
    for (const line of dataLines) {
      const values = line.split(',');
      const processedValues = [];
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]?.trim().replace(/"/g, '');
        if (value && value.length > 10 && isNaN(value)) {
          const processed = await processText(value, operation);
          processedValues.push(`"${processed}"`);
        } else {
          processedValues.push(value);
        }
      }
      
      processedLines.push(processedValues.join(','));
    }

    const processedCsv = processedLines.join('\n');

    res.json({
      success: true,
      data: processedCsv,
      filename: `processed_${operation}_${Date.now()}.csv`,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(processedCsv)}`
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ 
      success: false, 
      error: `Erro no processamento: ${error.message}` 
    });
  }
});

// Rota health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'CSV AI Processor API funcionando!'
  });
});

// Catch-all para arquivos estáticos
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Para desenvolvimento local
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
