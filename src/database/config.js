const { ConnectionStringParser } = require('connection-string-parser');

const useSsl = (process.env.DATABASE_USE_SSL || 'true') === 'true';
const connectionString = process.env.DATABASE_URL;

const connectionStringParser = new ConnectionStringParser({ scheme: 'postgres' });
const connectionObject = connectionStringParser.parse(connectionString);

// Template
const config = {
  database: connectionObject.endpoint,
  username: connectionObject.username,
  password: connectionObject.password,
  host: connectionObject.hosts[0].host,
  port: connectionObject.hosts[0].port,
  dialect: connectionObject.scheme,
  dialectOptions: {
    ssl: useSsl ? {
      rejectUnauthorized: false,
    } : false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  ssl: useSsl ? {
    rejectUnauthorized: false,
  } : false,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  },
};

// Export
module.exports = {
  development: config,
  test: config,
  production: config,
};