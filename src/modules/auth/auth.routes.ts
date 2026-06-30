import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post('/register', controller.register);
  app.post('/login', controller.login);
  app.post('/refresh', controller.refresh);
  app.post('/logout', controller.logout);
  
  // Protected routes
  app.register(async (instance) => {
    instance.addHook('preHandler', instance.authenticate);
    instance.get('/me', controller.me);
  });
}
