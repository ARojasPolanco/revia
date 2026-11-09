import { Resend } from 'resend';
import { envs } from './envs.js';

export const resend = envs.RESEND_API_KEY ? new Resend(envs.RESEND_API_KEY) : null;
