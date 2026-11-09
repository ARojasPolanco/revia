import { Router } from 'express';
import * as controller from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/:id', controller.getPublicProfile);
