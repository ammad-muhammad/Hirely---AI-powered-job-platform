import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { config } from './config/env';
import { checkDbConnection } from './config/database';
import apiRouter from './routes/index';
import { errorHandler } from './middlewares/errorHandler';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { sanitizeNoSqlInput } from './middlewares/sanitize.middleware';
import { configurePassport } from './config/passport';

// Configure Passport strategy
configurePassport();

export const createApp = (): Application => {
  const app = express();

  // Enable trust proxy behind reverse proxies (Railway / Render / Heroku) for secure cookies & SSL
  if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration (withCredentials enabled for httpOnly cookies)
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting (skipped in dev/testing mode)
  app.use(globalRateLimiter);

  // Cookie parser middleware
  app.use(cookieParser());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session & Passport authentication middleware
  app.use(
    session({
      secret: config.jwtSecret || 'hirely_session_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Sanitize req.query, req.body, and req.params against NoSQL injection
  app.use(sanitizeNoSqlInput);

  // Database connection check middleware (prevents 10s Mongoose buffering timeouts)
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    checkDbConnection(req, res, next);
  });

  // Serve static uploads directory for local PDF resumes & documents
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
          res.setHeader('Content-Type', 'application/pdf');
        }
      },
    })
  );

  // API Routes
  app.use('/api', apiRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
