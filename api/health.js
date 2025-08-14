export default function handler(req, res) {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'CSV AI Processor API funcionando!'
  });
}
