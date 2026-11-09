import { envs } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { resend } from '../../config/resend.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character] ?? character;
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    logger.warn('Email no enviado: falta RESEND_API_KEY', { to, subject });
    return;
  }

  try {
    await resend.emails.send({
      from: envs.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    logger.error('Falló el envío de email', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const url = `${envs.APP_URL}/verificar-email?token=${encodeURIComponent(input.token)}`;

  if (!resend) {
    logger.info('Link de verificación (desarrollo)', { url });
  }

  await sendEmail(
    input.to,
    'Verificá tu email en REVIA',
    `<p>Hola ${escapeHtml(input.name)},</p>
     <p>Confirmá tu email haciendo clic <a href="${url}">acá</a>.</p>
     <p>El link vence en 24 horas.</p>`
  );
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const url = `${envs.APP_URL}/recuperar?token=${encodeURIComponent(input.token)}`;

  if (!resend) {
    logger.info('Link de recuperación (desarrollo)', { url });
  }

  await sendEmail(
    input.to,
    'Recuperá tu contraseña de REVIA',
    `<p>Hola ${escapeHtml(input.name)},</p>
     <p>Restablecé tu contraseña <a href="${url}">acá</a>.</p>
     <p>El link vence en 1 hora. Si no lo pediste, ignorá este email.</p>`
  );
}
