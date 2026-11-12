import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { envs } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { catchAsync } from '../../errors/catchAsync.js';
import { clearAuthCookies, oauthStateCookieOptions, setAuthCookies } from '../../utils/cookies.js';
import { safeRedirectPath } from '../../utils/safeRedirect.js';
import * as authService from './auth.service.js';

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleProfileResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function nextQuery(path: string): string {
  return path === '/' ? '' : `&next=${encodeURIComponent(path)}`;
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body as authService.RegisterInput);

  res.status(201).json({
    status: 'success',
    message: 'Registro exitoso. Verificá tu email para continuar.',
    user: authService.toSelfUser(result.user),
    ...(authService.canExposeDevToken() ? { devVerificationToken: result.verificationToken } : {}),
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as authService.LoginInput);
  setAuthCookies(res, result.token);

  res.status(200).json({
    status: 'success',
    user: authService.toSelfUser(result.user),
  });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);

  res.status(200).json({
    status: 'success',
    user: authService.toSelfUser(user),
  });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(
    req.user!.id,
    req.body as authService.UpdateProfileInput
  );

  res.status(200).json({
    status: 'success',
    user: authService.toSelfUser(user),
  });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  await authService.verifyEmail((req.body as { token: string }).token);

  res.status(200).json({
    status: 'success',
    message: 'Email verificado correctamente.',
  });
});

export const resendVerification = catchAsync(async (req: Request, res: Response) => {
  const token = await authService.resendVerification(req.user!.id);

  res.status(200).json({
    status: 'success',
    message: 'Te enviamos un nuevo link de verificación.',
    ...(authService.canExposeDevToken() ? { devVerificationToken: token } : {}),
  });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const token = await authService.forgotPassword((req.body as { email: string }).email);

  res.status(200).json({
    status: 'success',
    message: 'Si el email existe, te enviamos instrucciones para recuperar la cuenta.',
    ...(authService.canExposeDevToken() && token ? { devResetToken: token } : {}),
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as { token: string; password: string };
  await authService.resetPassword(body.token, body.password);

  res.status(200).json({
    status: 'success',
    message: 'Contraseña actualizada correctamente.',
  });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearAuthCookies(res);

  res.status(200).json({
    status: 'success',
    message: 'Sesión cerrada.',
  });
});

export const completeOnboarding = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.completeOnboarding(
    req.user!.id,
    req.body as authService.CompleteOnboardingInput
  );

  res.status(200).json({
    status: 'success',
    user: authService.toSelfUser(user),
  });
});

export const google = catchAsync(async (req: Request, res: Response) => {
  const next = safeRedirectPath(req.query.next, envs.APP_URL);

  if (!envs.GOOGLE_CLIENT_ID || !envs.GOOGLE_CLIENT_SECRET) {
    res.redirect(`${envs.APP_URL}/ingresar?error=google_no_config${nextQuery(next)}`);
    return;
  }

  const state = randomBytes(16).toString('hex');
  res.cookie('revia_oauth_state', state, oauthStateCookieOptions());

  if (next === '/') {
    res.clearCookie('revia_oauth_next', oauthStateCookieOptions());
  } else {
    res.cookie('revia_oauth_next', next, oauthStateCookieOptions());
  }

  const params = new URLSearchParams({
    client_id: envs.GOOGLE_CLIENT_ID,
    redirect_uri: envs.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

export const googleCallback = catchAsync(async (req: Request, res: Response) => {
  const next = safeRedirectPath(req.cookies?.revia_oauth_next, envs.APP_URL);
  const suffix = nextQuery(next);

  res.clearCookie('revia_oauth_next', oauthStateCookieOptions());

  try {
    const queryError = typeof req.query.error === 'string' ? req.query.error : null;

    if (queryError) {
      res.redirect(`${envs.APP_URL}/ingresar?error=google_denied${suffix}`);
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;
    const savedState = req.cookies?.revia_oauth_state;

    if (!code || !state || !savedState || state !== savedState) {
      res.redirect(`${envs.APP_URL}/ingresar?error=google_state${suffix}`);
      return;
    }

    res.clearCookie('revia_oauth_state', oauthStateCookieOptions());

    if (!envs.GOOGLE_CLIENT_ID || !envs.GOOGLE_CLIENT_SECRET) {
      res.redirect(`${envs.APP_URL}/ingresar?error=google_no_config${suffix}`);
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: envs.GOOGLE_CLIENT_ID,
        client_secret: envs.GOOGLE_CLIENT_SECRET,
        redirect_uri: envs.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('No se pudo intercambiar el código de Google');
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('Google no devolvió access_token');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('No se pudo obtener el perfil de Google');
    }

    const profile = (await profileResponse.json()) as GoogleProfileResponse;

    if (!profile.sub || !profile.email) {
      throw new Error('Perfil de Google incompleto');
    }

    const result = await authService.loginWithGoogle({
      sub: profile.sub,
      email: profile.email.toLowerCase(),
      emailVerified: Boolean(profile.email_verified),
      name: profile.name,
      picture: profile.picture,
    });

    setAuthCookies(res, result.token);
    res.redirect(
      result.user.onboardingCompleted
        ? `${envs.APP_URL}${next}`
        : `${envs.APP_URL}/completar-perfil?next=${encodeURIComponent(next)}`
    );
  } catch (error) {
    logger.error('Falló el login con Google', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.redirect(`${envs.APP_URL}/ingresar?error=google_failed${suffix}`);
  }
});
