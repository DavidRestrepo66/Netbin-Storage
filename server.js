/**
 * server.js - Punto de entrada de la aplicación Netbin Storage.
 * Principio SRP: Solo inicializa el servidor y conecta las rutas.
 * Principio DIP: Depende de abstracciones (rutas/módulos), no de implementaciones directas.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes  = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const roleRoutes  = require('./routes/roleRoutes');
const userRoutes  = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Sirve los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Sirve recursos gráficos externos (p.ej. logo) que el evaluador adjuntó
// en el workspace de Cursor. Esto evita tener que copiar binarios al repo.
const externalAssetsPath = path.resolve(
  __dirname,
  '../../../.cursor/projects/c-Users-david-Desktop-Nueva-carpeta-Netbin-Storage/assets'
);
if (fs.existsSync(externalAssetsPath)) {
  app.use('/assets', express.static(externalAssetsPath));
}

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/assets',   assetRoutes);
app.use('/api/roles',    roleRoutes);
app.use('/api/usuarios', userRoutes);

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
