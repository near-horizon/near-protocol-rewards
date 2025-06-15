import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware
app.use(express.json());

/**
 * Health check endpoint
 * @route GET /health
 * @returns {Object} 200 - Status information with timestamp
 */
app.get('/health', (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Server initialization
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 