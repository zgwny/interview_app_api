'use strict';

const UserService = require('../services/UserService');

/** POST /api/auth/register */
async function register(request, reply) {
  const { username, email, password } = request.body;
  const user = await UserService.register({ username, email, password });
  return reply.code(201).send({  user });
}

/** POST /api/auth/login */
async function login(request, reply) {
  const { email, password } = request.body;
  const user = await UserService.login({ email, password });

  const token = request.server.jwt.sign(
    { id: user._id.toString(), role: user.role },
    { expiresIn: request.server.config.jwt.expiresIn }
  );

  return reply.send({ data: { token, user: user.toPublic() } });
}

/** GET /api/auth/me — 获取当前登录用户信息 */
async function me(request, reply) {
  const user = await UserService.getById(request.user.id);
  // getById 已内部调用 toPublic()，直接返回 plain object
  return reply.send({  user });
}

module.exports = async function authRoutes(fastify) {
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 2, maxLength: 30 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6, maxLength: 72 },
        },
      },
    },
    handler: register,
  });

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: login,
  });

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: me,
  });
};
