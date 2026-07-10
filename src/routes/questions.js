'use strict';

const QuestionService = require('../services/QuestionService');
const UserService = require('../services/UserService');
const { DIFFICULTIES } = require('../models/Question');

module.exports = async function questionRoutes(fastify) {
  /** GET /api/questions — 分页列表 */
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category:   { type: 'string' },          // 动态分类，不再 enum 校验
          difficulty: { type: 'string', enum: DIFFICULTIES },
          tag:        { type: 'string' },
          keyword:    { type: 'string' },
          page:       { type: 'integer', minimum: 1, default: 1 },
          limit:      { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sort:       { type: 'string', enum: ['createdAt', 'viewCount', 'favoriteCount'], default: 'createdAt' },
        },
      },
    },
    async handler(request, reply) {
      const result = await QuestionService.list(request.query);
      return reply.send({  result });
    },
  });

  /** GET /api/questions/:id — 题目详情 */
  fastify.get('/:id', {
    preHandler: [fastify.optionalAuth],
    async handler(request, reply) {
      const question = await QuestionService.getById(request.params.id);
      return reply.send({  question });
    },
  });

  /** POST /api/questions — 新建题目（需登录） */
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'content', 'answer', 'category', 'difficulty'],
        properties: {
          title:      { type: 'string', minLength: 2, maxLength: 200 },
          content:    { type: 'string', minLength: 1 },
          answer:     { type: 'string', minLength: 1 },
          category:   { type: 'string', minLength: 1, maxLength: 30 },
          difficulty: { type: 'string', enum: DIFFICULTIES },
          tags:       { type: 'array', items: { type: 'string' }, maxItems: 10 },
        },
      },
    },
    async handler(request, reply) {
      const question = await QuestionService.create(request.body, request.user.id);
      return reply.code(201).send({  question });
    },
  });

  /** PUT /api/questions/:id — 更新题目（创建者或管理员） */
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          title:      { type: 'string', minLength: 2, maxLength: 200 },
          content:    { type: 'string', minLength: 1 },
          answer:     { type: 'string', minLength: 1 },
          category:   { type: 'string', minLength: 1, maxLength: 30 },
          difficulty: { type: 'string', enum: DIFFICULTIES },
          tags:       { type: 'array', items: { type: 'string' }, maxItems: 10 },
        },
      },
    },
    async handler(request, reply) {
      const question = await QuestionService.update(
        request.params.id,
        request.body,
        request.user
      );
      return reply.send({  question });
    },
  });

  /** DELETE /api/questions/:id — 删除题目（创建者或管理员） */
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    async handler(request, reply) {
      await QuestionService.remove(request.params.id, request.user);
      return reply.code(204).send();
    },
  });

  /** POST /api/questions/:id/favorite — 收藏/取消收藏 */
  fastify.post('/:id/favorite', {
    preHandler: [fastify.authenticate],
    async handler(request, reply) {
      const result = await UserService.toggleFavorite(request.user.id, request.params.id);
      return reply.send({  result });
    },
  });
};
