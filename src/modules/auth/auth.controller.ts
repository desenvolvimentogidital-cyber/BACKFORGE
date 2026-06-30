import { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '../../generated/prisma-client/index.js';
import { AuthService } from './auth.service.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';
import { isProductionEnvironment } from '../../shared/env.js';

const authService = new AuthService();
const REFRESH_COOKIE_NAME = 'backforge_refresh';

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    path: '/auth',
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function getRefreshToken(request: FastifyRequest) {
  const body = refreshSchema.parse(request.body ?? {});
  return request.cookies[REFRESH_COOKIE_NAME] || body.refreshToken;
}

function sendSession<T extends { refreshToken: string }>(reply: FastifyReply, session: T, statusCode = 200) {
  const { refreshToken, ...publicSession } = session;
  setRefreshCookie(reply, refreshToken);
  return reply.status(statusCode).send(publicSession);
}

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const session = await authService.register(data);
      return sendSession(reply, session, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      throw error;
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const session = await authService.login(data);
      return sendSession(reply, session);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return reply.status(401).send({ error: error.message });
      }

      throw error;
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = getRefreshToken(request);
      if (!refreshToken) {
        return reply.status(401).send({ error: 'Refresh token required' });
      }
      const tokens = await authService.refresh(refreshToken);
      setRefreshCookie(reply, tokens.refreshToken);
      return reply.send({ accessToken: tokens.accessToken });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid refresh token') {
        return reply.status(401).send({ error: error.message });
      }

      throw error;
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = getRefreshToken(request);
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    return reply.status(204).send();
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as any).sub;
    const user = await authService.getMe(userId);
    return reply.send(user);
  }
}
