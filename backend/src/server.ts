import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { initSocketServer } from './config/socket';
import { initJobExpirationCron } from './utils/cron.utils';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.io Server
const io = initSocketServer(server);

// Start HTTP Server
server.listen(config.port, () => {
  logger.info(`🚀 Hirely Backend API server running on port ${config.port} (${config.nodeEnv})`);
  logger.info(`🔗 CORS allowed origin: ${config.frontendUrl}`);
  logger.info(`🩺 Health check: GET http://localhost:${config.port}/api/health`);

  // Connect to MongoDB & Start Cron Tasks
  connectDatabase().then(() => {
    initJobExpirationCron();
  });
});

export { app, server, io };
