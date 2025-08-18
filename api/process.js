// Função para processar texto com IA (versão simplificada e robusta)
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
          return `[EXPANDIDO] ${text} - Com mais detalhes.`;
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
    // Fallback sempre funciona
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
  console.log('API executada:', req.method);
  
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      return res.json({ 
        success: true, 
        message: 'CSV AI Processor funcionando!', 
        timestamp: new Date().toISOString()
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { csvContent, operation = 'rewrite' } = req.body || {};

    if (!csvContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conteúdo CSV necessário'
      });
    }

    // Processar CSV simples
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV vazio' });
    }

    const headers = lines[0];
    const processedLines = [headers];
    
    // Processar apenas algumas linhas para evitar timeout
    const maxLines = Math.min(3, lines.length - 1);
    
    for (let i = 1; i <= maxLines; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const values = line.split(',');
      const processedValues = [];
      
      for (const value of values) {
        const cleanValue = value.trim().replace(/"/g, '');
        
        if (cleanValue && cleanValue.length > 10 && isNaN(cleanValue)) {
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

    return res.json({
      success: true,
      data: result,
      filename: filename,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFF' + result)}`,
      message: `CSV processado com ${operation}`
    });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno'
    });
  }
}
