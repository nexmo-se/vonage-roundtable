const { ConnectionStringParser } = require('connection-string-parser');
const Sequelize = require('sequelize');

const ModelGenerator = require('./models');

const useSsl = (process.env.DATABASE_USE_SSL || 'true') === 'true';
const connectionString = process.env.DATABASE_URL;

const connectionStringParser = new ConnectionStringParser({ scheme: 'postgres' });
const connectionObject = connectionStringParser.parse(connectionString);

// Template
const name = connectionObject.endpoint;
const username = connectionObject.username;
const password = connectionObject.password;
const config = {
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
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: true,
}

// console.log(config);

const sequelizeClient = new Sequelize(name, username, password, config);
// console.log(sequelizeClient);
const models = ModelGenerator.getModels(sequelizeClient);
Object.keys(sequelizeClient.models)
  .forEach((m) => {
    const model = sequelizeClient.models[m];
    if (model.associate) {
      model.associate(models);
    }
  });

module.exports = {
  sequelizeClient,
  models,
};
