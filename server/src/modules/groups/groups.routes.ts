import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import {
  addMemberHandler,
  createGroupHandler,
  getGroupHandler,
  listGroupsHandler,
  removeMemberHandler,
  updateGroupHandler,
} from './groups.controller.js';

export const groupsRouter = Router();

groupsRouter.use(authGuard);

groupsRouter.post('/', createGroupHandler);
groupsRouter.get('/', listGroupsHandler);
groupsRouter.get('/:id', getGroupHandler);
groupsRouter.patch('/:id', updateGroupHandler);
groupsRouter.post('/:id/members', addMemberHandler);
groupsRouter.delete('/:id/members/:userId', removeMemberHandler);
