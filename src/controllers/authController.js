const authService = require('../services/authService');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password inválida' });
      await authService.setPassword(req.user.id, newPassword);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async createUser(req, res) {
    try {
      const { email, name, status, password } = req.body;
      const created = await authService.createUser({ email, name, status, password });
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();
