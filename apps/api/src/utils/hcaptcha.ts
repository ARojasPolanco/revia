import { envs } from '../config/envs.js';
import { AppError } from '../errors/appError.js';

interface HcaptchaResponse {
  success?: boolean;
}

export async function verifyHcaptcha(token?: string): Promise<void> {
  if (!envs.HCAPTCHA_ENABLED) {
    return;
  }

  if (!envs.HCAPTCHA_SECRET) {
    throw new AppError('CAPTCHA mal configurado', 500);
  }

  if (!token) {
    throw new AppError('CAPTCHA requerido', 422);
  }

  const body = new URLSearchParams({
    secret: envs.HCAPTCHA_SECRET,
    response: token,
  });

  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = (await response.json()) as HcaptchaResponse;

  if (!data.success) {
    throw new AppError('CAPTCHA inválido', 422);
  }
}
