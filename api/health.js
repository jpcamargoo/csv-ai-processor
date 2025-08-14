export default function handler(req, res) {
  console.log('Health check:', req.method, req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({ 
    success: true,
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'CSV AI Processor API funcionando!',
    vercel: true
  });
}
