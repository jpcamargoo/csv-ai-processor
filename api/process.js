// Função para processar texto com IA (versão otimizada)
async function processText(text, operation) {
  try {
    // Se não tem OpenAI configurada, usar processamento mock
    if (!process.env.OPENAI_API_KEY) {
      switch (operation) {
        case 'rewrite':
          return `[REESCRITO] ${text}`;
        case 'summary':
          return `[RESUMO] ${text.substring(0, 50)}...`;
        case 'expand':
          return `[EXPANDIDO] ${text} - Com mais detalhes e contexto adicional.`;
        default:
          return text;
      }
    }

    // Usar OpenAI se disponível
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let prompt;
    switch (operation) {
      case 'rewrite':
        prompt = `Reescreva o seguinte texto de forma clara e profissional, mantendo o mesmo sentido: "${text}"`;
        break;
      case 'summary':
        prompt = `Crie um resumo conciso e informativo do seguinte texto: "${text}"`;
        break;
      case 'expand':
        prompt = `Expanda o seguinte texto com mais detalhes, contexto e informações relevantes: "${text}"`;
        break;
      default:
        return text;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro OpenAI:', error);
    // Fallback para processamento mock
    switch (operation) {
      case 'rewrite':
        return `[REESCRITO] ${text}`;
      case 'summary':
        return `[RESUMO] ${text.substring(0, 50)}...`;
      case 'expand':
        return `[EXPANDIDO] ${text} - Com mais detalhes.`;
      default:
        return text;
    }
  }
}

export default async function handler(req, res) {
  console.log('Função executada:', req.method, req.url);
  
  try {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      return res.json({ 
        success: true, 
        message: 'API funcionando!', 
        timestamp: new Date(),
        features: ['Excel UTF-8', 'CSV Processing', 'AI Enhancement']
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    // Processar requisição POST
    const { csvContent, operation = 'rewrite' } = req.body || {};

    if (!csvContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conteúdo CSV necessário',
        received: Object.keys(req.body || {})
      });
    }

    console.log('Processando CSV:', csvContent.substring(0, 100), 'Operação:', operation);

    // Processar CSV de forma mais robusta
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV vazio' });
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const processedLines = [headers.map(h => `"${h}"`).join(',')]; // Cabeçalho sempre com vírgulas
    
    // Processar linhas de dados (limitar para evitar timeout)
    const maxLines = Math.min(10, lines.length - 1);
    const dataLines = lines.slice(1, maxLines + 1);
    
    for (const line of dataLines) {
      const values = line.split(delimiter);
      const processedValues = [];
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]?.trim().replace(/"/g, '');
        
        // Processar apenas textos significativos
        if (value && value.length > 10 && isNaN(value) && !/^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            const processed = await processText(value, operation);
            processedValues.push(`"${processed.replace(/"/g, '""')}"`); // Escape aspas duplas
          } catch (error) {
            console.error('Erro ao processar texto:', error);
            processedValues.push(`"${value}"`);
          }
        } else {
          processedValues.push(value ? `"${value}"` : '""');
        }
      }
      
      processedLines.push(processedValues.join(','));
    }

    const result = processedLines.join('\n');
    const filename = `processed_${operation}_excel_utf8_${Date.now()}.csv`;

    console.log('Processamento concluído:', result.length, 'characters,', processedLines.length, 'lines');

    return res.json({
      success: true,
      data: result,
      filename: filename,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFF' + result)}`, // BOM para Excel
      message: `CSV processado com ${operation} - ${processedLines.length} linhas`,
      stats: {
        originalLines: lines.length,
        processedLines: processedLines.length - 1, // Excluir cabeçalho
        operation: operation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro crítico:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Erro interno: ${error.message}`,
      stack: error.stack?.split('\n')[0]
    });
  }
}
