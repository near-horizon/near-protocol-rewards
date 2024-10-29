export enum ErrorCode {
  // ... existing codes ...
  
  // Database specific errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DB_NOT_INITIALIZED = 'DB_NOT_INITIALIZED',
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  
  // Collection errors
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  
  // GitHub specific errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR'
} 