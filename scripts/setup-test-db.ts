import { exec } from 'child_process';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config({ path: '.env.test' });

const execPromise = util.promisify(exec);

async function setupTestDatabase() {
  try {
    // Create test user if it doesn't exist
    await execPromise(`psql -U postgres -c "CREATE USER ${process.env.POSTGRES_USER} WITH PASSWORD '${process.env.POSTGRES_PASSWORD}';"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // Create test database if it doesn't exist
    await execPromise(`psql -U postgres -c "CREATE DATABASE ${process.env.POSTGRES_DB} OWNER ${process.env.POSTGRES_USER};"`)
      .catch(error => {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      });

    // Grant privileges
    await execPromise(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${process.env.POSTGRES_DB} TO ${process.env.POSTGRES_USER};"`)
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