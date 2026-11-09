import { Resend } from 'resend';
import { envs } from './envs.js';

export const resend =
  envs.RESEND_API_KEY && envs.NODE_ENV !== 'test' ? new Resend(envs.RESEND_API_KEY) : null;
