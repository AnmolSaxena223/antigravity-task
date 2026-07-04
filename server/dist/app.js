"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const xss_1 = require("./middleware/xss");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const friendsRoutes_1 = __importDefault(require("./routes/friendsRoutes"));
const roomRoutes_1 = __importDefault(require("./routes/roomRoutes"));
const socketService_1 = require("./services/socketService");
const path_1 = __importDefault(require("path"));
// Setup Express application
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// 1. Establish database connection
(0, db_1.connectDB)();
// 2. Configure safety & parsing middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: env_1.config.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use((0, cors_1.default)({
    origin: '*', // Adjust to match client in production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, express_mongo_sanitize_1.default)());
app.use(xss_1.xssSanitizer);
// Serve static public assets (sounds, icons)
app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../public')));
// 3. API Limiters & Routes
app.use('/api', rateLimiter_1.apiLimiter);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/payment', paymentRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/friends', friendsRoutes_1.default);
app.use('/api/room', roomRoutes_1.default);
// Fallback 404 check
app.use('*', (req, res, next) => {
    res.status(404).json({ success: false, message: 'Resource not found.' });
});
// Global Error Handler
app.use(errorHandler_1.errorHandler);
// 4. Initialize real-time gameplay Socket service
const socketService = new socketService_1.SocketService(server);
exports.socketService = socketService;
// Start server listening
const PORT = env_1.config.PORT;
server.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`[Ludo Server] Server running in ${env_1.config.NODE_ENV} mode`);
    console.log(`[Ludo Server] URL: http://localhost:${PORT}`);
    console.log(`==============================================\n`);
});
