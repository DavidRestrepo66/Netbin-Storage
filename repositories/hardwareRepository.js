/**
 * hardwareRepository.js
 * Responsabilidad: único punto de acceso a data/hardware.json.
 * Ningún otro módulo debe leer o escribir ese archivo directamente.
 *
 * Patrón: lectura síncrona con fs.readFileSync. En caso de que el archivo
 * no exista o esté corrupto, findAll retorna [] en vez de lanzar excepción,
 * evitando que el servidor se caiga en arranque frío.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/hardware.json');

/**
 * Lee y parsea todos los registros de hardware del archivo JSON.
 *
 * @returns {Object[]} Lista de registros de hardware (puede ser vacía).
 */
const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

/**
 * Sobreescribe el archivo con la lista completa de registros.
 * Se usa tanto para crear (append externo + save) como para actualizar.
 *
 * @param {Object[]} records - Lista completa de registros a persistir.
 */
const save = (records) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2), 'utf-8');
};

module.exports = { findAll, save };
