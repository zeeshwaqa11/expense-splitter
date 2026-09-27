import type { NextFunction, Request, Response } from 'express';
import { addMemberSchema, createGroupSchema, updateGroupSchema } from './groups.schemas.js';
import * as groupsService from './groups.service.js';

export async function createGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createGroupSchema.parse(req.body);
    const group = await groupsService.createGroup(req.userId!, input);
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
}

export async function listGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await groupsService.listMyGroups(req.userId!);
    res.status(200).json({ groups });
  } catch (err) {
    next(err);
  }
}

export async function getGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await groupsService.getGroup(req.params.id!, req.userId!);
    res.status(200).json({ group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateGroupSchema.parse(req.body);
    const group = await groupsService.updateGroup(req.params.id!, req.userId!, input);
    res.status(200).json({ group });
  } catch (err) {
    next(err);
  }
}

export async function addMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addMemberSchema.parse(req.body);
    const member = await groupsService.addMember(req.params.id!, req.userId!, input);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await groupsService.removeMember(req.params.id!, req.userId!, req.params.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
