/**
 * consumableRepository.js
 * Responsabilidad: único punto de acceso a data/consumables.json.
 *
 * Los consumibles son materiales de uso frecuente (cables, conectores,
 * tornillos, etc.) con control de cantidad y stock mínimo.
 * Ver hardwareRepository.js para notas sobre el patrón de diseño aplicado.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/consumables.json');

/**
 * Lee y parsea todos los registros de consumibles del archivo JSON.
 *
 * @returns {Object[]} Lista de registros de consumibles (puede ser vacía).
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
