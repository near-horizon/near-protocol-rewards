import { exec } from 'child_process';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config({ path: '.env.test' });

const execPromise = util.promisify(exec);

async function setupTestDatabase() {
  try {
    // Create test user if it doesn't exist
    await execPromise(`psql -U postgres -c "CREATE USER ${process.env.POSTGRES_USER} WITH PASSWORD '${process.env.POSTGRES_PASSWORD}' SUPERUSER;"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // Drop database if exists
    await execPromise(`psql -U postgres -c "DROP DATABASE IF EXISTS ${process.env.POSTGRES_DB};"`)
      .catch(error => {
        console.warn('Warning dropping database:', error.message);
      });

    // Create test database
    await execPromise(`psql -U postgres -c "CREATE DATABASE ${process.env.POSTGRES_DB} OWNER ${process.env.POSTGRES_USER};"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // Grant all privileges
    await execPromise(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${process.env.POSTGRES_DB} TO ${process.env.POSTGRES_USER};"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // After creating the database:
    await execPromise(`psql -U postgres -c "ALTER DATABASE ${process.env.POSTGRES_DB} OWNER TO ${process.env.POSTGRES_USER};"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // Grant schema permissions
    await execPromise(`psql -U postgres -d ${process.env.POSTGRES_DB} -c "ALTER SCHEMA public OWNER TO ${process.env.POSTGRES_USER};"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    console.log('Test database and user created successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase(); 