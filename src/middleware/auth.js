const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  console.log('🔐 AUTH DEBUG - token recebido:', token ? '✓ Sim' : '✗ Não');
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('🔐 AUTH DEBUG - payload:', { sub: payload.sub, role: payload.role });
    req.user = { id: payload.sub, role: payload.role };
    console.log('🔐 AUTH DEBUG - req.user definido:', req.user);
    next();
  } catch (err) {
    console.log('🔐 AUTH DEBUG - erro no JWT:', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role === 'A') return next();
  return res.status(403).json({ error: 'Acesso negado' });
}

module.exports = { authenticate, requireAdmin };
