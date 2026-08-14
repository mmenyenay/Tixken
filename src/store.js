const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const adapter = new FileSync(path.join(dataDir, 'data.json'));
const db = low(adapter);

db.defaults({
  events: [],
    tickets: [],
      leaderboard: []
      }).write();

      module.exports = db;