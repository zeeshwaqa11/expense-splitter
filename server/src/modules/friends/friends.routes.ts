import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import {
  addFriendHandler,
  listFriendsHandler,
  removeFriendHandler,
} from './friends.controller.js';

export const friendsRouter = Router();

friendsRouter.use(authGuard);

friendsRouter.get('/', listFriendsHandler);
friendsRouter.post('/', addFriendHandler);
friendsRouter.delete('/:friendId', removeFriendHandler);
