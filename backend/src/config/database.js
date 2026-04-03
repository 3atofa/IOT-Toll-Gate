const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

// Auto-create database if it doesn't exist
const createDatabaseIfNotExists = async () => {
  try {
    // Try to create a connection to the default postgres database
    const tempSequelize = new Sequelize('postgres', process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      dialect: process.env.DB_DIALECT || 'postgres',
      logging: false,
    });

    await tempSequelize.authenticate();
    
    // Create database if not exists
    await tempSequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`, {
      logging: false,
    }).catch((err) => {
      if (err.message.includes('already exists')) {
        console.log(`✓ Database ${process.env.DB_NAME} already exists`);
      }
    });

    await tempSequelize.close();
    console.log(`✓ Database ${process.env.DB_NAME} created or already exists`);
  } catch (error) {
    console.error('Error creating database:', error.message);
    throw error;
  }
};

sequelize.createDatabaseIfNotExists = createDatabaseIfNotExists;

module.exports = sequelize;
