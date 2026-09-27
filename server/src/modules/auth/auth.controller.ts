import type { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.userId!);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
