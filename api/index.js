export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({
    success: true,
    message: 'CSV AI Processor API funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      process: '/api/process'
    }
  });
}