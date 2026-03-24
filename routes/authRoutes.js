/**
 * authRoutes - Responsabilidad Única: Definir rutas de autenticación.
 * Principio SRP: Este módulo SOLO define rutas, no contiene lógica de negocio.
 */

const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/login - Autenticar usuario
router.post('/login', login);

// POST /api/auth/logout - Cerrar sesión (requiere token válido)
router.post('/logout', protect, logout);

module.exports = router;
