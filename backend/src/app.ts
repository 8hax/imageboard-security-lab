import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';  
import { boardRoutes } from './routes/board.routes';
import { authRoutes } from './routes/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';
import { postsRoutes } from './routes/posts.routes';
import { adminRoutes } from './routes/admin.routes';

const app = express();

//Middlewares globais

app.use(helmet());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,               // necessário para enviar cookies
}));

app.use(express.json());

app.use(cookieParser());

//Rotas

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
});

app.use('/boards', authMiddleware, boardRoutes);

app.use('/auth', authRoutes);

app.use('/posts', postsRoutes);

app.use('/admin', adminRoutes);

export default app;