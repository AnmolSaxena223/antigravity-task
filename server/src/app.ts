import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/db';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { xssSanitizer } from './middleware/xss';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import friendsRoutes from './routes/friendsRoutes';
import roomRoutes from './routes/roomRoutes';
import { SocketService } from './services/socketService';
import path from 'path';

// Setup Express application
const app = express();
const server = http.createServer(app);

// 1. Establish database connection
connectDB();

// 2. Configure safety & parsing middlewares
app.use(helmet({
  contentSecurityPolicy: config.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: '*', // Adjust to match client in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssSanitizer);

// Serve static public assets (sounds, icons)
app.use('/public', express.static(path.join(__dirname, '../public')));

// 3. API Limiters & Routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/room', roomRoutes);

// Fallback 404 check
app.use('*', (req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found.' });
});

// Global Error Handler
app.use(errorHandler);

// 4. Initialize real-time gameplay Socket service
const socketService = new SocketService(server);

// Start server listening
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`[Ludo Server] Server running in ${config.NODE_ENV} mode`);
  console.log(`[Ludo Server] URL: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});

export { app, server, socketService };
