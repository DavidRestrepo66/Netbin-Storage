/**
 * reportRepository.js
 * Responsabilidad: único punto de acceso a data/reports.json.
 *
 * Este archivo almacena las "definiciones" de reportes (nombre, tipo, icono, filtros),
 * NO los datos calculados. Los datos se generan al vuelo en reportController.js.
 * Ver hardwareRepository.js para notas sobre el patrón de diseño aplicado.
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/reports.json');

/**
 * Lee y parsea todas las definiciones de reportes del archivo JSON.
 *
 * @returns {Object[]} Lista de definiciones de reporte (puede ser vacía).
 */
const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

/**
 * Busca una definición de reporte por su ID único.
 *
 * @param {string} id - ID del reporte a buscar.
 * @returns {Object|null} La definición encontrada, o null si no existe.
 */
const findById = (id) => findAll().find(r => r.id === id) || null;

/**
 * Sobreescribe el archivo con la lista completa de definiciones.
 *
 * @param {Object[]} reports - Lista completa de definiciones a persistir.
 */
const save = (reports) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(reports, null, 2), 'utf-8');
};

module.exports = { findAll, findById, save };
