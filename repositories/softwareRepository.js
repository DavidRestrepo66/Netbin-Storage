/**
 * softwareRepository.js
 * Responsabilidad: único punto de acceso a data/software.json.
 * Ver hardwareRepository.js para notas sobre el patrón de diseño aplicado.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/software.json');

/**
 * Lee y parsea todos los registros de software del archivo JSON.
 *
 * @returns {Object[]} Lista de registros de software (puede ser vacía).
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
 *
 * @param {Object[]} records - Lista completa de registros a persistir.
 */
const save = (records) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2), 'utf-8');
};

module.exports = { findAll, save };
