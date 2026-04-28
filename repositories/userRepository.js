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
 * Solo permite el acceso a usuarios activos.
 * @param {string} username
 * @param {string} password
 * @returns {Object|null} Usuario encontrado o null
 */
const findByCredentials = (username, password) => {
  const users = findAll();
  return users.find(
    (u) => u.username === username && u.password === password && u.activo !== false
  ) || null;
};

/**
 * Persiste la lista completa de usuarios en el archivo JSON.
 * @param {Array} users
 */
const save = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

module.exports = { findAll, findByCredentials, save };
