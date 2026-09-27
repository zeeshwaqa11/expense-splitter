import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { loginHandler, meHandler, registerHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.get('/me', authGuard, meHandler);
