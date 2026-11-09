import { Sequelize } from 'sequelize';
import { envs } from './envs.js';

const uri = envs.NODE_ENV === 'test' ? envs.TEST_DB_URI : envs.DB_URI;

export const sequelize = new Sequelize(uri, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30_000,
    idle: 10_000,
  },
});
