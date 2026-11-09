import { envs } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { resend } from '../../config/resend.js';

const support = 'soporte@revia.com.ar';
const from = envs.EMAIL_FROM;
const appUrl = envs.APP_URL;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value = ''): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function layout(title: string, preheader: string, body: string): string {
  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f6f7f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 0;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:24px;font-weight:800;letter-spacing:-0.4px;color:#0f766e;">
                REVIA
              </div>
              <div style="padding-top:4px;font-size:12px;color:#6b7280;">
                Marketplace de segunda mano en Bahía Blanca
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#171717;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#171717;">
                ${title}
              </h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
              ¿Dudas? Escribinos a ${escapeHtml(support)}.<br />
              <a href="${escapeHtml(appUrl)}" style="color:#0f766e;text-decoration:none;">REVIA</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#374151;">${text}</p>`;
}

function button(url: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border-radius:8px;background:#0f766e;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;
}

function fallbackLink(url: string): string {
  return `
  <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;">
    Si el botón no funciona, copiá este enlace:<br />
    <a href="${escapeHtml(url)}" style="color:#0f766e;text-decoration:underline;">${escapeHtml(url)}</a>
  </p>
`;
}

function note(text: string): string {
  return `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">${text}</p>`;
}

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class MailService {
  private async send(payload: MailInput) {
    if (!resend) {
      logger.warn('Email no enviado: falta RESEND_API_KEY', {
        to: payload.to,
        subject: payload.subject,
      });
      return null;
    }

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: payload.to,
        replyTo: support,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      if (error) {
        logger.error('Resend rechazó el email', {
          name: error.name,
          message: error.message,
        });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error inesperado al enviar email', {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async sendVerificationEmail(input: { to: string; name: string; token: string }) {
    const url = `${appUrl}/verificar-email?token=${encodeURIComponent(input.token)}`;

    if (!resend) {
      logger.info('Link de verificación (desarrollo)', { url });
    }

    return this.send({
      to: input.to,
      subject: 'Verificá tu email - REVIA',
      text: `Verificá tu email en REVIA: ${url}\n\nEl enlace vence en 24 horas. Si no creaste una cuenta, ignorá este mensaje.`,
      html: layout(
        'Verificá tu email',
        'Confirmá tu email para activar tu cuenta de REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, estás a un paso de entrar a REVIA. Confirmá que este email es tuyo.`)}
          ${button(url, 'Verificar mi email')}
          ${fallbackLink(url)}
          ${note('El enlace vence en 24 horas y solo puede usarse una vez. Si no creaste una cuenta, ignorá este mensaje.')}
        `
      ),
    });
  }

  async sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
    const url = `${appUrl}/recuperar?token=${encodeURIComponent(input.token)}`;

    if (!resend) {
      logger.info('Link de recuperación (desarrollo)', { url });
    }

    return this.send({
      to: input.to,
      subject: 'Restablecé tu contraseña - REVIA',
      text: `Restablecé tu contraseña en REVIA: ${url}\n\nEl enlace vence en 1 hora y solo puede usarse una vez. Si no lo pediste, ignorá este mensaje.`,
      html: layout(
        'Restablecé tu contraseña',
        'Recibimos un pedido para restablecer tu contraseña de REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, recibimos un pedido para restablecer tu contraseña. Si fuiste vos, elegí una nueva.`)}
          ${button(url, 'Restablecer mi contraseña')}
          ${fallbackLink(url)}
          ${note('El enlace vence en 1 hora y solo puede usarse una vez. Si no lo pediste, ignorá este mensaje.')}
        `
      ),
    });
  }

  async sendSuspensionEmail(input: { to: string; name: string; reason: string }) {
    return this.send({
      to: input.to,
      subject: 'Tu cuenta fue suspendida - REVIA',
      text: `Tu cuenta de REVIA fue suspendida. Motivo: ${input.reason}.\n\nSi creés que fue un error, escribinos a ${support}.`,
      html: layout(
        'Tu cuenta fue suspendida',
        'Información sobre la suspensión de tu cuenta de REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, tu cuenta de REVIA fue suspendida.`)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">
            <tr>
              <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#374151;">
                <strong style="color:#171717;">Motivo:</strong> ${escapeHtml(input.reason)}
              </td>
            </tr>
          </table>
          ${paragraph(`Si creés que fue un error, escribinos a ${escapeHtml(support)}.`)}
        `
      ),
    });
  }

  async sendKycApprovedEmail(input: { to: string; name: string }) {
    return this.send({
      to: input.to,
      subject: 'Verificación de REVIA aprobada',
      text: 'Tu verificación de identidad de REVIA fue aprobada. Ya podés publicar y cobrar.',
      html: layout(
        'Verificación aprobada',
        'Tu identidad fue verificada en REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, tu Verificación de REVIA fue aprobada.`)}
          ${paragraph('Ya podés publicar artículos y cobrar tus ventas.')}
          ${button(`${appUrl}/publicar`, 'Publicar un artículo')}
        `
      ),
    });
  }

  async sendKycRejectedEmail(input: { to: string; name: string; reason: string }) {
    return this.send({
      to: input.to,
      subject: 'Verificación de REVIA rechazada',
      text: `Tu verificación de identidad de REVIA fue rechazada. Motivo: ${input.reason}.\n\nPodés reintentar desde tu cuenta.`,
      html: layout(
        'Verificación rechazada',
        'No pudimos verificar tu identidad en REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, no pudimos completar tu Verificación de REVIA.`)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">
            <tr>
              <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#374151;">
                <strong style="color:#171717;">Motivo:</strong> ${escapeHtml(input.reason)}
              </td>
            </tr>
          </table>
          ${paragraph('Podés reintentar la verificación desde tu cuenta o escribirnos si creés que fue un error.')}
        `
      ),
    });
  }

  async sendKycManualReviewEmail(input: { to: string; name: string }) {
    return this.send({
      to: input.to,
      subject: 'Verificación de REVIA en revisión',
      text: 'Tu verificación de identidad de REVIA está en revisión. Te avisamos cuando termine.',
      html: layout(
        'Verificación en revisión',
        'Estamos revisando tu Verificación de REVIA.',
        `
          ${paragraph(`Hola ${escapeHtml(input.name)}, tu Verificación de REVIA quedó en revisión manual.`)}
          ${paragraph('Te vamos a avisar por email cuando tengamos una respuesta.')}
        `
      ),
    });
  }
}

export const mailService = new MailService();

export function sendVerificationEmail(input: {
  to: string;
  name: string;
  token: string;
}): Promise<unknown> {
  return mailService.sendVerificationEmail(input);
}

export function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  token: string;
}): Promise<unknown> {
  return mailService.sendPasswordResetEmail(input);
}
