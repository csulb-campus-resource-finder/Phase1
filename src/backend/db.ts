// Imports the Pool class from the 'pg' (node-postgres) library for managing database connection pools.
import { Pool } from 'pg';
// Imports the dotenv library to load environment variables from a .env file into Node.js.
import dotenv from 'dotenv';

// Loads environment variables from the local .env file into process.env.
dotenv.config();

// Creates and exports a new PostgreSQL connection pool instance using the DATABASE_URL connection string.
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Listens for the 'connect' event emitted when a new client connects to the PostgreSQL database.
db.on('connect', () => {
  // Logs a success message to the console when a database connection is established.
  console.log('Connected to the PostgreSQL database successfully.');
});

// Listens for the 'error' event emitted when an idle database client encounters an unexpected error.
db.on('error', (err) => {
  // Logs the unexpected idle database client error to the console.
  console.error('Unexpected error on idle database client', err);
  // Terminates the Node.js process with a failure code (-1) to prevent unstable app behavior.
  process.exit(-1);
});