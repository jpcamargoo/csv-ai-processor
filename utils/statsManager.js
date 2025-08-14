// Sistema de estatísticas simples
const fs = require('fs');
const path = require('path');

class StatsManager {
  constructor() {
    this.statsFile = path.join(__dirname, '..', 'data', 'stats.json');
    this.ensureStatsFile();
  }

  ensureStatsFile() {
    const dir = path.dirname(this.statsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(this.statsFile)) {
      const initialStats = {
        totalUploads: 0,
        totalProcessed: 0,
        totalErrors: 0,
        totalTokens: 0,
        lastReset: new Date().toISOString(),
        processingTypes: {
          rewrite: 0,
          summarize: 0,
          expand: 0
        }
      };
      fs.writeFileSync(this.statsFile, JSON.stringify(initialStats, null, 2));
    }
  }

  getStats() {
    try {
      const data = fs.readFileSync(this.statsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler estatísticas:', error);
      return null;
    }
  }

  updateStats(type, data = {}) {
    const stats = this.getStats();
    if (!stats) return;

    switch (type) {
      case 'upload':
        stats.totalUploads += 1;
        break;
      case 'processed':
        stats.totalProcessed += (data.count || 1);
        stats.totalTokens += (data.tokens || 0);
        if (data.processingType) {
          stats.processingTypes[data.processingType] += (data.count || 1);
        }
        break;
      case 'error':
        stats.totalErrors += 1;
        break;
    }

    try {
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Erro ao salvar estatísticas:', error);
    }
  }

  resetStats() {
    const stats = this.getStats();
    if (!stats) return;

    Object.keys(stats).forEach(key => {
      if (typeof stats[key] === 'number') {
        stats[key] = 0;
      } else if (typeof stats[key] === 'object' && key === 'processingTypes') {
        Object.keys(stats[key]).forEach(subKey => {
          stats[key][subKey] = 0;
        });
      }
    });

    stats.lastReset = new Date().toISOString();

    try {
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Erro ao resetar estatísticas:', error);
    }
  }
}

module.exports = new StatsManager();
