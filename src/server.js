'use strict';

const mongoose = require('mongoose');
const { buildApp } = require('./app');
const config = require('./config');

async function start() {
  // ── 先连接数据库，成功后再启动 HTTP 服务 ──────────────────────────
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB 已连接:', config.mongoUri);

  const app = buildApp();

  // 进程退出时断开数据库
  const shutdown = async () => {
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

start();
