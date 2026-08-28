const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logDirectory = path.join(__dirname, '../logs');
const {StandardCheckoutClient, Env } = require('@phonepe-pg/pg-sdk-node');

const db = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'fgonewild',
  connectionLimit: 10,
  timezone: '+05:30',
  dateStrings: true,
};

// if (isProduction) {
//   const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
//     (key) => !process.env[key]
//   );

//   if (missing.length > 0) {
//     console.warn(
//       `Database environment variables are not configured yet: ${missing.join(', ')}`
//     );
//   }
// }

const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);



const clientId = 'M16EG0S5H527_26081408420';

const clientSecret = 'ZjhiNTIwYmQtMTQyYy00MTE1LTllNDItMzVlMTZkZjQ4ZmQ5';

const clientVersion = 1;

// const environment = process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;


if (!clientId) {
    console.warn(
        'PHONEPE_CLIENT_ID is not configured'
    );
}


if (!clientSecret) {
    console.warn(
        'PHONEPE_CLIENT_SECRET is not configured'
    );
}


const phonePeClient =
    StandardCheckoutClient.getInstance(
        clientId,
        clientSecret,
        clientVersion
    );

module.exports = {
  db,
  clientOrigins,
  log: {
    logDirectory,
    interval: '1d',
  },
  cookieOptions: {
    httpOnly: true,
    secure: isProduction,
    maxAge: 0,
    sameSite: 'lax',
  },
  phonePeClient,
};
