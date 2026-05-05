const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/reports.json');

const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

const findById = (id) => findAll().find(r => r.id === id) || null;

const save = (reports) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(reports, null, 2), 'utf-8');
};

module.exports = { findAll, findById, save };
