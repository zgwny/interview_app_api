'use strict';

const fp = require('fastify-plugin');
const { UnauthorizedError } = require('../utils/errors');

/**
 * 认证插件：
 *  - 注册 preHandler `fastify.authenticate`（强制登录）
 *  - 注册 preHandler `fastify.optionalAuth`（可选登录）
 *  - 注册 preHandler `fastify.requireAdmin`（强制管理员）
 */
async function authPlugin(fastify) {
  /** 强制登录：解析 Bearer token，将 payload 写入 request.user */
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      throw new UnauthorizedError();
    }
  });

  /** 可选登录：有 token 则解析，没有也不报错 */
  fastify.decorate('optionalAuth', async function (request) {
    const auth = request.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        await request.jwtVerify();
      } catch {
        // token 无效时忽略，不阻断请求
      }
    }
  });

  /** 管理员专用：先验证 token，再检查 role */
  fastify.decorate('requireAdmin', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
    if (request.user.role !== 'admin') {
      const { ForbiddenError } = require('../utils/errors');
      throw new ForbiddenError();
    }
  });
}

// fastify-plugin 让装饰器在整个应用范围内可见
module.exports = fp(authPlugin, { name: 'auth' });
