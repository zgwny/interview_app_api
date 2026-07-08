'use strict';

const AdminUserService = require('../../services/AdminUserService');

module.exports = async function adminUserRoutes(fastify) {
  /** 所有路由均需管理员权限 */
  const adminGuard = { preHandler: [fastify.requireAdmin] };

  /** GET /api/admin/users — 用户列表（分页 + 搜索） */
  fastify.get('/', {
    ...adminGuard,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          role:    { type: 'string', enum: ['user', 'admin'] },
          sort:    { type: 'string', enum: ['createdAt', 'username'], default: 'createdAt' },
          page:    { type: 'integer', minimum: 1, default: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    async handler(request, reply) {
      const result = await AdminUserService.list(request.query);
      return reply.send({ data: result });
    },
  });

  /** GET /api/admin/users/:id — 用户详情（含练习统计） */
  fastify.get('/:id', {
    ...adminGuard,
    async handler(request, reply) {
      const user = await AdminUserService.getById(request.params.id);
      return reply.send({ data: user });
    },
  });

  /** PATCH /api/admin/users/:id — 修改角色 / 重置密码 */
  fastify.patch('/:id', {
    ...adminGuard,
    schema: {
      body: {
        type: 'object',
        properties: {
          role:     { type: 'string', enum: ['user', 'admin'] },
          password: { type: 'string', minLength: 6, maxLength: 72 },
        },
        // role 和 password 至少提供一个（在 service 层校验，保持 schema 宽松）
        additionalProperties: false,
      },
    },
    async handler(request, reply) {
      const user = await AdminUserService.update(
        request.params.id,
        request.user.id,
        request.body
      );
      return reply.send({  user });
    },
  });

  /** DELETE /api/admin/users/:id — 删除用户 */
  fastify.delete('/:id', {
    ...adminGuard,
    async handler(request, reply) {
      await AdminUserService.remove(request.params.id, request.user.id);
      return reply.code(204).send();
    },
  });
};
