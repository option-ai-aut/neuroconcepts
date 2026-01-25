import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestrator', runtime: 'lambda' });
});

app.post('/leads', (req, res) => {
  // TODO: Implement lead intake logic
  console.log('Received lead:', req.body);
  res.status(201).json({ message: 'Lead received' });
});

// Export for Lambda
export const handler = serverless(app);

// Local dev support
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Orchestrator service running on port ${port}`);
  });
}
