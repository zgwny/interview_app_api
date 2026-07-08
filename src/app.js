'use strict';

const Fastify = require('fastify');
const fastifyJwt = require('@fastify/jwt');
const fastifyCors = require('@fastify/cors');
const fastifySensible = require('@fastify/sensible');

const config = require('./config');
const authPlugin = require('./plugins/auth');
const { AppError } = require('./utils/errors');

/**
 * 构建并配置 Fastify 实例
 * @returns {import('fastify').FastifyInstance}
 */
function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
          : undefined,
    },
  });

  // ── 挂载配置，让路由层可以访问 ──────────────────────────────────────
  fastify.decorate('config', config);

  // ── 插件 ──────────────────────────────────────────────────────────
  fastify.register(fastifyCors, { origin: true });
  fastify.register(fastifySensible);
  fastify.register(fastifyJwt, { secret: config.jwt.secret });
  fastify.register(authPlugin);

  // ── 路由 ──────────────────────────────────────────────────────────
  fastify.register(require('./routes/auth'),         { prefix: '/api/auth' });
  fastify.register(require('./routes/questions'),    { prefix: '/api/questions' });
  fastify.register(require('./routes/sessions'),     { prefix: '/api/sessions' });
  fastify.register(require('./routes/admin/users'),  { prefix: '/api/admin/users' });

  // ── 健康检查 ──────────────────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── 全局错误处理 ──────────────────────────────────────────────────
  fastify.setErrorHandler(function (error, request, reply) {
    // 自定义业务异常
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    // Fastify 参数校验错误（JSON Schema 校验失败）
    if (error.validation) {
      return reply.code(400).send({ error: '请求参数错误', details: error.validation });
    }

    // Mongoose CastError（无效的 ObjectId 等）
    if (error.name === 'CastError') {
      return reply.code(400).send({ error: '无效的 ID 格式' });
    }

    // Mongoose 唯一索引冲突
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || '字段';
      return reply.code(409).send({ error: `${field} 已存在` });
    }

    // 未知错误
    fastify.log.error(error);
    return reply.code(500).send({ error: '服务器内部错误' });
  });

  return fastify;
}

module.exports = { buildApp };
