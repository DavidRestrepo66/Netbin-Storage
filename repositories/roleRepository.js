/**
 * roleRepository.js
 * Responsabilidad: único punto de acceso a data/roles.json.
 * Ver hardwareRepository.js para notas sobre el patrón de diseño aplicado.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/roles.json');

/**
 * Lee y parsea todos los roles del archivo JSON.
 *
 * @returns {Object[]} Lista de roles (puede ser vacía).
 */
const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

/**
 * Busca un rol por su ID único.
 *
 * @param {string} id - ID del rol a buscar.
 * @returns {Object|null} El rol encontrado, o null si no existe.
 */
const findById = (id) => findAll().find(r => r.id === id) || null;

/**
 * Sobreescribe el archivo con la lista completa de roles.
 *
 * @param {Object[]} roles - Lista completa de roles a persistir.
 */
const save = (roles) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(roles, null, 2), 'utf-8');
};

module.exports = { findAll, findById, save };
