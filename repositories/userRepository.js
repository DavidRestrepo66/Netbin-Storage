/**
 * UserRepository - Responsabilidad Única: Acceso a datos de usuarios.
 * Principio SRP: Solo se dedica a buscar y filtrar usuarios del archivo JSON.
 * Principio DIP: El controlador depende de esta abstracción, no del archivo directamente.
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * Lee todos los usuarios del archivo JSON.
 * @returns {Array} Lista de usuarios
 */
const findAll = () => {
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(raw);
};

/**
 * Busca un usuario por username y contraseña.
 * La contraseña se compara directamente (en producción usaría bcrypt).
 * @param {string} username
 * @param {string} password
 * @returns {Object|null} Usuario encontrado o null
 */
const findByCredentials = (username, password) => {
  const users = findAll();
  return users.find(
    (u) => u.username === username && u.password === password
  ) || null;
};

module.exports = { findAll, findByCredentials };
