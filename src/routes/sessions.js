'use strict';

const SessionService = require('../services/SessionService');
const UserService = require('../services/UserService');
const { CATEGORIES, DIFFICULTIES } = require('../models/Question');

module.exports = async function sessionRoutes(fastify) {
  /** GET /api/sessions/me — 当前用户历史会话（放在 /:id 前，防止 "me" 被当作 id 匹配） */
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          status: { type: 'string', enum: ['ongoing', 'finished'] },
        },
      },
    },
    async handler(request, reply) {
      const result = await SessionService.listByUser(request.user.id, request.query);
      return reply.send({  result });
    },
  });

  /** POST /api/sessions — 创建新的练习会话 */
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          category:   { type: 'string', enum: CATEGORIES },
          difficulty: { type: 'string', enum: DIFFICULTIES },
          tags:       { type: 'array', items: { type: 'string' } },
          count:      { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
    async handler(request, reply) {
      const session = await SessionService.create(request.user.id, request.body);
      return reply.code(201).send({  session });
    },
  });

  /** GET /api/sessions/:id — 会话详情 */
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    async handler(request, reply) {
      const session = await SessionService.getById(request.params.id, request.user.id);
      return reply.send({  session });
    },
  });

  /** POST /api/sessions/:id/answers — 提交单题作答 */
  fastify.post('/:id/answers', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['questionId'],
        properties: {
          questionId: { type: 'string' },
          userAnswer: { type: 'string', default: '' },
          mastered:   { type: 'boolean', default: false },
          timeSpent:  { type: 'number', minimum: 0, default: 0 },
        },
      },
    },
    async handler(request, reply) {
      const { questionId, ...dto } = request.body;
      const session = await SessionService.submitAnswer(
        request.params.id,
        questionId,
        dto,
        request.user.id
      );
      return reply.send({ data: session });
    },
  });

  /** POST /api/sessions/:id/finish — 结束会话并获取统计结果 */
  fastify.post('/:id/finish', {
    preHandler: [fastify.authenticate],
    async handler(request, reply) {
      const session = await SessionService.finish(request.params.id, request.user.id);
      return reply.send({  session });
    },
  });

  /** GET /api/sessions/favorites — 用户收藏题目列表（注：需在 /:id 之前注册） */
  fastify.get('/favorites', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:  { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
    async handler(request, reply) {
      const items = await UserService.getFavorites(request.user.id, request.query);
      return reply.send({  items });
    },
  });
};
