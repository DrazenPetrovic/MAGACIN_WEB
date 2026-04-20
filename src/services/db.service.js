import mysql from 'mysql2/promise';
import { dbConfig } from '../config/db.js';

export const getConnection = async () => {
  const connection = await mysql.createConnection(dbConfig);
  return connection;
};

export const withConnection = async (fn) => {
  const connection = await getConnection();
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
};
