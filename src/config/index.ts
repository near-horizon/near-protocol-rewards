import dotenv from 'dotenv';

dotenv.config();

interface Config {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  github: {
    apiUrl: string;
    rateLimit: number;
  };
  near: {
    apiUrl: string;
    networkId: string;
  };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'near_rewards',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  github: {
    apiUrl: 'https://api.github.com',
    rateLimit: 5000
  },
  near: {
    apiUrl: process.env.NEAR_API_URL || 'https://api.nearblocks.io/v1',
    networkId: process.env.NEAR_NETWORK_ID || 'mainnet'
  }
};
