const reportService = require('../services/reportService');

class ReportController {
  async getObraReport(req, res) {
    try {
      const { obraId } = req.params;
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate e toDate são obrigatórios' });
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        return res.status(400).json({ error: 'Datas devem estar no formato YYYY-MM-DD' });
      }

      const report = await reportService.getObraReport(obraId, fromDate, toDate);
      res.json(report);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ReportController();
