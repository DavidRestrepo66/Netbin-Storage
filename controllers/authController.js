/**
 * AuthController - Responsabilidad Única: Gestionar autenticación de usuarios.
 * Principio SRP: Este módulo SOLO maneja validación y generación de tokens.
 * Principio DIP: Depende de abstracciones (UserRepository), no de implementaciones concretas.
 */

const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/userRepository');

// Almacén en memoria de sesiones activas (token → userData)
const activeSessions = new Map();

/**
 * login: Valida credenciales y emite un token de sesión.
 */
const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos.'
    });
  }

  const user = UserRepository.findByCredentials(username, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas. Por favor verifique su usuario y contraseña.'
    });
  }

  const token = uuidv4();
  const sessionData = {
    userId: user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    email: user.email,
    createdAt: new Date().toISOString()
  };

  activeSessions.set(token, sessionData);

  return res.status(200).json({
    success: true,
    message: 'Inicio de sesión exitoso.',
    token,
    user: sessionData
  });
};

/**
 * logout: Invalida el token de sesión.
 */
const logout = (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente.' });
};

/**
 * verifyToken: Verifica si un token es válido.
 * Exportado para uso del middleware de autenticación.
 */
const verifyToken = (token) => {
  return activeSessions.get(token) || null;
};

module.exports = { login, logout, verifyToken };
