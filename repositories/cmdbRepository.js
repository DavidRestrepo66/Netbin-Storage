/**
 * cmdbRepository.js
 * Responsabilidad: único punto de acceso a data/cmdb.json.
 *
 * La CMDB (Configuration Management Database) registra los dispositivos
 * de red activos: equipo, modelo, rol en la topología y número de serie.
 * Ver hardwareRepository.js para notas sobre el patrón de diseño aplicado.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/cmdb.json');

/**
 * Lee y parsea todos los registros de la CMDB.
 *
 * @returns {Object[]} Lista de entradas de la CMDB (puede ser vacía).
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
