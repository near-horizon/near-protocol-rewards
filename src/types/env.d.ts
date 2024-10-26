declare namespace NodeJS {
  interface ProcessEnv {
    // Node environment
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;

    // React App Environment Variables
    REACT_APP_PROJECT_ID: string;
    REACT_APP_NEAR_ACCOUNT: string;
    REACT_APP_GITHUB_REPO: string;
    REACT_APP_GITHUB_TOKEN: string;

    // Database Configuration
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_DB: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;

    // Redis Configuration
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_PASSWORD?: string;

    // API Configuration
    GITHUB_TOKEN?: string;
    NEAR_API_URL?: string;
    NEAR_NETWORK_ID?: string;
  }
}

// For static file imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// For JSON imports
declare module '*.json' {
  const value: any;
  export default value;
}
