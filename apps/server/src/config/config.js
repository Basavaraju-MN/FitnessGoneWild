const path = require('path');

const logDirectory = path.join(__dirname, '../logs');

module.exports = {
 db: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fgonewild',
    connectionLimit: 10,
    timezone: '+05:30',
    dateStrings: true
  },
    log: {
    logDirectory: logDirectory,
    interval: '1d',
  },

  cookieOptions: {
    httpOnly: false,
    secure: false,
    maxAge: 0,
    sameSite: 'Lax',
  }
};