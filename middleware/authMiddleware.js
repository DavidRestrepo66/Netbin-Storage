/**
 * authMiddleware - Responsabilidad Única: Proteger rutas privadas.
 * Principio SRP: Solo valida tokens, no ejecuta lógica de negocio.
 */

const { verifyToken } = require('../controllers/authController');

const protect = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Token no proporcionado.'
    });
  }

  const session = verifyToken(token);
  if (!session) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido o sesión expirada.'
    });
  }

  req.user = session;
  next();
};

module.exports = { protect };
