import type { NextFunction, Request, Response } from 'express';
import { addFriendSchema } from './friends.schemas.js';
import * as friendsService from './friends.service.js';

export async function listFriendsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const friends = await friendsService.listFriends(req.userId!);
    res.status(200).json({ friends });
  } catch (err) {
    next(err);
  }
}

export async function addFriendHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addFriendSchema.parse(req.body);
    const friend = await friendsService.addFriend(req.userId!, input.email);
    res.status(201).json({ friend });
  } catch (err) {
    next(err);
  }
}

export async function removeFriendHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await friendsService.removeFriend(req.userId!, req.params.friendId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
