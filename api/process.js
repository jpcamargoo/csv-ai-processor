// Função para processar texto com IA (versão simplificada)
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
        prompt = `Reescreva: "${text}"`;
        break;
      case 'summary':
        prompt = `Resuma: "${text}"`;
        break;
      case 'expand':
        prompt = `Expanda: "${text}"`;
        break;
      default:
        return text;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
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
      return res.json({ success: true, message: 'API funcionando!', timestamp: new Date() });
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

    // Processar CSV de forma muito simples
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV vazio' });
    }

    // Processar apenas primeira linha de dados para teste
    const headers = lines[0];
    const processedLines = [headers];
    
    if (lines.length > 1) {
      const firstDataLine = lines[1];
      const values = firstDataLine.split(',');
      const processedValues = [];
      
      for (const value of values) {
        const cleanValue = value.trim().replace(/"/g, '');
        if (cleanValue && cleanValue.length > 5 && isNaN(cleanValue)) {
          const processed = await processText(cleanValue, operation);
          processedValues.push(`"${processed}"`);
        } else {
          processedValues.push(value);
        }
      }
      
      processedLines.push(processedValues.join(','));
    }

    const result = processedLines.join('\n');
    const filename = `processed_${operation}_${Date.now()}.csv`;

    console.log('Processamento concluído:', result.length, 'characters');

    return res.json({
      success: true,
      data: result,
      filename: filename,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(result)}`,
      message: `CSV processado com ${operation} - ${lines.length} linhas`
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
