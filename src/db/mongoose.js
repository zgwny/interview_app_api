'use strict';

const mongoose = require('mongoose');
const config = require('../config');

/**
 * 连接 MongoDB，失败时进程退出
 * @param {import('fastify').FastifyInstance} fastify
 */
async function connectDB(fastify) {
  mongoose.connection.on('error', (err) => {
    fastify.log.error({ err }, 'MongoDB 连接错误');
  });

  mongoose.connection.once('open', () => {
    fastify.log.info('MongoDB 连接成功: %s', config.mongoUri);
  });

  await mongoose.connect(config.mongoUri);

  // Fastify 关闭时同步断开数据库连接
  fastify.addHook('onClose', async () => {
    await mongoose.disconnect();
    fastify.log.info('MongoDB 连接已断开');
  });
}

module.exports = { connectDB };
