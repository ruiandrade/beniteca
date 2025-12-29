const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('./userService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  async login(email, password) {
    const user = await userService.getUserByEmail(email);
    if (!user) throw new Error('Credenciais inválidas');

    // Admin/Other only; if no password set, deny
    if (!user.passwordHash) throw new Error('Conta sem password definida');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Credenciais inválidas');

    const token = jwt.sign({ sub: user.id, role: user.status }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.status } };
  }

  async setPassword(userId, newPassword) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword, saltRounds);
    await userService.updateUser(userId, { passwordHash: hash });
    return true;
  }

  async createUser({ email, name, status = 'O', password }) {
    const existing = await userService.getUserByEmail(email);
    if (existing) throw new Error('Já existe um utilizador com este email');
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const created = await userService.createUser({ email, name, status });
    if (hash) await userService.updateUser(created.id, { passwordHash: hash });
    return { id: created.id, email: created.email, name: created.name, status: created.status };
  }
}

module.exports = new AuthService();
