// 🚀 CSV + IA Processor v2.1 - API Info
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({
    name: "CSV + IA Processor",
    version: "2.1.0",
    status: "active",
    message: "🚀 API funcionando! Editado pelo GitHub Copilot",
    endpoints: {
      main: "/",
      api: "/api",
      process: "/api/process"
    },
    timestamp: new Date().toISOString()
  });
}