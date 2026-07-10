'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../src/config');
const User = require('../src/models/User');
const Question = require('../src/models/Question');
const Category = require('../src/models/Category');

// ── 初始题目数据（answer 用模板字面量，避免反引号转义问题）─────────
const QUESTIONS = [
  {
    title: 'JavaScript 中 == 和 === 的区别是什么？',
    content: '请说明 == 和 === 在比较时的行为差异，并举例说明各自适用场景。',
    answer: `\`==\` 是宽松相等，比较前会进行类型转换；\`===\` 是严格相等，类型与值必须同时相等。

**例子：**
\`\`\`js
0 == "0"   // true  （"0" 转为数字 0）
0 === "0"  // false （类型不同）
null == undefined   // true
null === undefined  // false
\`\`\`
推荐始终使用 \`===\` 避免隐式转换带来的 bug。`,
    category: 'javascript',
    difficulty: 'easy',
    tags: ['类型转换', '基础'],
  },
  {
    title: '什么是闭包？请给出一个实际应用场景。',
    content: '请解释 JavaScript 闭包的概念，并举一个实际开发中的使用例子。',
    answer: `闭包（Closure）是指函数能够记住并访问其词法作用域，即使该函数在词法作用域之外执行。

**实际应用 — 计数器工厂：**
\`\`\`js
function makeCounter(init = 0) {
  let count = init;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
const c = makeCounter(10);
c.increment(); // 11
c.value();     // 11
\`\`\`
\`count\` 被闭包捕获，外部无法直接访问，实现了私有状态。`,
    category: 'javascript',
    difficulty: 'medium',
    tags: ['闭包', '作用域'],
  },
  {
    title: '解释 Promise 和 async/await 的关系',
    content: 'Promise 和 async/await 是如何关联的？async/await 解决了什么问题？',
    answer: `async/await 是基于 Promise 的语法糖，让异步代码写起来像同步代码。

- \`async\` 函数始终返回一个 Promise
- \`await\` 暂停当前 async 函数执行，等待 Promise resolve

**对比：**
\`\`\`js
// Promise 链式写法
fetch(url).then(r => r.json()).then(console.log).catch(console.error);

// async/await
async function load() {
  try {
    const r = await fetch(url);
    console.log(await r.json());
  } catch (e) {
    console.error(e);
  }
}
\`\`\`
async/await 解决了 Promise 链过长时的可读性问题，且 try/catch 可直接捕获异步错误。`,
    category: 'javascript',
    difficulty: 'medium',
    tags: ['异步', 'Promise', 'async/await'],
  },
  {
    title: 'React 中 useEffect 的依赖数组有什么作用？',
    content: '解释 useEffect 第二个参数（依赖数组）的三种形式及其行为差异。',
    answer: `| 形式 | 行为 |
|------|------|
| 不传 | 每次渲染后都执行 |
| \`[]\` | 仅在组件挂载后执行一次 |
| \`[a, b]\` | 仅当 \`a\` 或 \`b\` 变化时执行 |

**注意事项：**
- 依赖数组应包含 effect 内部用到的所有响应式值
- 漏写依赖可能读到旧的 stale 值
- 可用 \`eslint-plugin-react-hooks\` 的 exhaustive-deps 规则自动检测`,
    category: 'react',
    difficulty: 'medium',
    tags: ['hooks', 'useEffect', '生命周期'],
  },
  {
    title: 'CSS BFC 是什么？如何触发？',
    content: '解释块级格式化上下文（BFC）的概念，列举触发条件和实际用途。',
    answer: `BFC（Block Formatting Context）是一个独立的渲染区域，内部布局不影响外部。

**触发条件（满足其一）：**
- \`overflow\` 非 \`visible\`（如 \`hidden\`、\`auto\`）
- \`display: flow-root\`
- \`position: absolute / fixed\`
- \`float\` 非 \`none\`
- flex/grid 容器的直接子项

**实际用途：**
1. 清除浮动（父元素高度塌陷问题）
2. 阻止 margin 重叠
3. 防止文字环绕浮动元素`,
    category: 'css',
    difficulty: 'medium',
    tags: ['BFC', '布局', '浮动'],
  },
  {
    title: 'HTTP 缓存机制：强缓存与协商缓存',
    content: '说明 HTTP 强缓存和协商缓存的工作原理及相关请求头。',
    answer: `**强缓存**：命中时直接从本地读取，不发请求。
- \`Cache-Control: max-age=3600\`（优先级高）
- \`Expires: <日期>\`（HTTP/1.0，已逐渐淘汰）

**协商缓存**：先发请求验证，资源未变返回 304。
- \`Last-Modified / If-Modified-Since\`：基于修改时间（精度秒级）
- \`ETag / If-None-Match\`：基于内容哈希（更精确，优先级高）

**流程：**
请求 → 强缓存未过期 → 200 (from cache)
请求 → 强缓存过期 → 协商缓存 → 未变 304 / 已变 200 + 新资源`,
    category: 'network',
    difficulty: 'medium',
    tags: ['HTTP', '缓存', '性能优化'],
  },
  {
    title: 'Node.js 事件循环的六个阶段',
    content: '请描述 Node.js 事件循环的各个阶段及其执行顺序。',
    answer: `Node.js 事件循环基于 libuv，一次 tick 经历以下阶段：

1. **timers** — 执行 setTimeout / setInterval 回调
2. **pending callbacks** — 执行上一轮延迟的 I/O 回调
3. **idle, prepare** — 内部使用
4. **poll** — 获取新的 I/O 事件；阻塞等待直到有回调或 timer 到期
5. **check** — 执行 setImmediate 回调
6. **close callbacks** — 执行 socket.on('close', ...) 等关闭回调

**微任务插队时机：** 每个阶段结束后先清空 process.nextTick 队列，再清空 Promise 微任务队列，然后进入下一阶段。`,
    category: 'node',
    difficulty: 'hard',
    tags: ['事件循环', '异步', 'libuv'],
  },
  {
    title: '手写 Promise.all',
    content: '实现一个与原生行为一致的 Promise.all 函数。',
    answer: `\`\`\`js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('promises must be an array'));
    }
    const results = [];
    let remaining = promises.length;

    if (remaining === 0) return resolve(results);

    promises.forEach((p, i) => {
      Promise.resolve(p).then((value) => {
        results[i] = value;
        if (--remaining === 0) resolve(results);
      }, reject);
    });
  });
}
\`\`\`

**要点：**
- 用 \`Promise.resolve(p)\` 包裹，兼容非 Promise 值
- 使用下标 \`results[i]\` 保证顺序与输入一致
- 任一 Promise reject 立即 reject 整体`,
    category: 'javascript',
    difficulty: 'hard',
    tags: ['Promise', '手写', '异步'],
  },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('✅ 连接数据库:', config.mongoUri);

  // ── 创建/更新管理员账号 ─────────────────────────────────────────
  let admin = await User.findOne({ username: config.admin.username });
  if (!admin) {
    admin = await User.create({
      username: config.admin.username,
      email: `${config.admin.username}@interview.app`,
      passwordHash: config.admin.password,
      role: 'admin',
    });
    console.log(`✅ 管理员账号已创建: ${admin.username}`);
  } else {
    console.log(`ℹ️  管理员账号已存在: ${admin.username}，跳过`);
  }

  // ── 写入初始分类（跳过已存在的）──────────────────────────────────
  const DEFAULT_CATEGORIES = [
    { name: 'javascript', label: 'JavaScript', color: '#f5a623', sort: 1 },
    { name: 'typescript', label: 'TypeScript', color: '#1677ff', sort: 2 },
    { name: 'css',        label: 'CSS',        color: '#13c2c2', sort: 3 },
    { name: 'html',       label: 'HTML',       color: '#87d068', sort: 4 },
    { name: 'react',      label: 'React',      color: '#61dafb', sort: 5 },
    { name: 'vue',        label: 'Vue',        color: '#42b883', sort: 6 },
    { name: 'node',       label: 'Node.js',    color: '#722ed1', sort: 7 },
    { name: 'network',    label: '计算机网络', color: '#eb2f96', sort: 8 },
    { name: 'algorithm',  label: '算法',       color: '#fa541c', sort: 9 },
    { name: 'sql',        label: 'SQL',        color: '#fa8c16', sort: 10 },
    { name: 'devops',     label: 'DevOps',     color: '#13c2c2', sort: 11 },
    { name: 'java',       label: 'Java',       color: '#e76f00', sort: 12 },
    { name: 'python',     label: 'Python',     color: '#3776ab', sort: 13 },
    { name: 'go',         label: 'Go',         color: '#00acd7', sort: 14 },
    { name: 'other',      label: '其他',       color: '#8c8c8c', sort: 99 },
  ];
  let catCreated = 0;
  for (const c of DEFAULT_CATEGORIES) {
    const exists = await Category.findOne({ name: c.name });
    if (!exists) {
      await Category.create(c);
      catCreated++;
    }
  }
  console.log(`✅ 分类 Seed 完成：新增 ${catCreated} 个分类（已存在的跳过）`);

  // ── 写入题目（跳过已存在的标题）───────────────────────────────────
  let created = 0;
  for (const q of QUESTIONS) {
    const exists = await Question.findOne({ title: q.title });
    if (!exists) {
      await Question.create({ ...q, createdBy: admin._id });
      console.log(`  + ${q.title}`);
      created++;
    }
  }
  console.log(`\n✅ Seed 完成：新增 ${created} 道题目（已存在的跳过）`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed 失败:', err);
  process.exit(1);
});
