import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { listGroupActivityHandler } from './activity.controller.js';

export const activityRouter = Router({ mergeParams: true });
activityRouter.use(authGuard);
activityRouter.get('/', listGroupActivityHandler);
