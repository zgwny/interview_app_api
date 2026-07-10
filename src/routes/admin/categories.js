'use strict';

const CategoryService = require('../../services/CategoryService');

module.exports = async function adminCategoryRoutes(fastify) {
  const adminGuard = { preHandler: [fastify.requireAdmin] };

  /** GET /api/admin/categories — 管理员查看（含统计） */
  fastify.get('/', {
    ...adminGuard,
    async handler(request, reply) {
      const Question = require('../../models/Question');
      const cats = await CategoryService.list();
      // 统计每个分类的题目数
      const counts = await Question.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
      const items = cats.map((c) => ({ ...c, questionCount: countMap[c.name] ?? 0 }));
      return reply.send({  items });
    },
  });

  /** POST /api/admin/categories — 新建 */
  fastify.post('/', {
    ...adminGuard,
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name:  { type: 'string', minLength: 1, maxLength: 30 },
          label: { type: 'string', maxLength: 30 },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          sort:  { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
    async handler(request, reply) {
      const cat = await CategoryService.create(request.body);
      return reply.code(201).send({  cat });
    },
  });

  /** PUT /api/admin/categories/:id — 编辑 */
  fastify.put('/:id', {
    ...adminGuard,
    schema: {
      body: {
        type: 'object',
        properties: {
          label: { type: 'string', maxLength: 30 },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          sort:  { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
    async handler(request, reply) {
      const cat = await CategoryService.update(request.params.id, request.body);
      return reply.send({  cat });
    },
  });

  /** DELETE /api/admin/categories/:id — 删除 */
  fastify.delete('/:id', {
    ...adminGuard,
    async handler(request, reply) {
      await CategoryService.remove(request.params.id);
      return reply.code(204).send();
    },
  });

  /** PATCH /api/admin/categories/sort — 批量更新排序 */
  fastify.patch('/sort', {
    ...adminGuard,
    schema: {
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'sort'],
              properties: {
                id:   { type: 'string' },
                sort: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
    },
    async handler(request, reply) {
      const categories = await CategoryService.updateSort(request.body.items);
      return reply.send({  categories });
    },
  });
};
