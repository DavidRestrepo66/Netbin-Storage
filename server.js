/**
 * server.js - Punto de entrada de la aplicación Netbin Storage.
 * Principio SRP: Solo inicializa el servidor y conecta las rutas.
 * Principio DIP: Depende de abstracciones (rutas/módulos), no de implementaciones directas.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Sirve los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Ruta catch-all: redirige al login ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// ── Arranque del servidor ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║   NETBIN STORAGE - Servidor activo     ║`);
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log(`╚════════════════════════════════════════╝`);
});
