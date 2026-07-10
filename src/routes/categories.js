'use strict';

const CategoryService = require('../services/CategoryService');

/** GET /api/categories — 公开，所有人可访问 */
module.exports = async function categoryRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    const categories = await CategoryService.list();
    return reply.send({  categories });
  });
};
