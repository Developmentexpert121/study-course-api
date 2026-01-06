import { Sequelize } from 'sequelize';

const env = process.env.NODE_ENV || 'development';
const config = require('../conf/config')[env];

let sequelize;

if (config.use_env_variable) {
  // Production with DATABASE_URL
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    dialect: 'postgres', // ← THIS MUST BE PRESENT
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  // Development
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'postgres', // ← AND THIS MUST BE PRESENT
    logging: env === 'development'
  });
}

export default sequelize;