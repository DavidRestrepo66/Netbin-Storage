const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/tools.json');

const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

const save = (records) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2), 'utf-8');
};

module.exports = { findAll, save };
