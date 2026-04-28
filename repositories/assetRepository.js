const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/assets.json');

const findAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
};

const save = (assets) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(assets, null, 2), 'utf-8');
};

module.exports = { findAll, save };
