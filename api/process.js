const multipart = require('parse-multipart-data');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ success: false, error: 'Content-Type deve ser multipart/form-data' });
    }

    const boundary = contentType.split('boundary=')[1];
    const body = Buffer.from(req.body);
    const parts = multipart.parse(body, boundary);

    let csvContent = '';
    let operation = 'rewrite';

    // Processar partes do multipart
    for (const part of parts) {
      if (part.name === 'csvFile') {
        csvContent = part.data.toString('utf8');
      } else if (part.name === 'operation') {
        operation = part.data.toString('utf8');
      }
    }

    if (!csvContent) {
      return res.status(400).json({ success: false, error: 'Arquivo CSV não encontrado' });
    }

    // Processar CSV simples
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const processedLines = [lines[0]]; // Manter cabeçalho

    // Processar apenas as primeiras 5 linhas para evitar timeout
    const dataLines = lines.slice(1, Math.min(6, lines.length));
    
    for (const line of dataLines) {
      const values = line.split(',');
      const processedValues = [];
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]?.trim();
        if (value && value.length > 10 && typeof value === 'string') {
          const processed = await processText(value, operation);
          processedValues.push(processed);
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
}
