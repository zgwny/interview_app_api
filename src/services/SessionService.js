'use strict';

const Session = require('../models/Session');
const QuestionService = require('./QuestionService');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');

class SessionService {
  /**
   * 创建新的练习会话（随机抽题）
   * @param {string} userId
   * @param {{ category?: string, difficulty?: string, tags?: string[], count?: number }} filter
   */
  async create(userId, filter = {}) {
    const { count = 10, ...questionFilter } = filter;

    const questions = await QuestionService.randomPick({ ...questionFilter, count });
    if (questions.length === 0) {
      throw new ValidationError('当前筛选条件下没有可用题目，请调整后重试');
    }

    const session = await Session.create({
      user: userId,
      questions: questions.map((q) => q._id),
      totalCount: questions.length,
      filter: questionFilter,
    });

    // 填充题目信息返回给前端（不含参考答案，防止作弊）
    const populated = await session.populate({
      path: 'questions',
      select: '-answer',
    });
    return populated;
  }

  /**
   * 提交单题作答
   * @param {string} sessionId
   * @param {string} questionId
   * @param {{ userAnswer: string, mastered: boolean, timeSpent: number }} dto
   * @param {string} userId  鉴权用
   */
  async submitAnswer(sessionId, questionId, dto, userId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('会话');
    if (session.user.toString() !== userId) throw new ForbiddenError();
    if (session.status === 'finished') throw new ValidationError('该会话已结束');

    // 检查题目是否属于本次会话
    const belongs = session.questions.some((q) => q.toString() === questionId);
    if (!belongs) throw new ValidationError('该题目不属于当前会话');

    // 已作答则更新，否则追加
    const existingIdx = session.answers.findIndex(
      (a) => a.question.toString() === questionId
    );
    if (existingIdx >= 0) {
      Object.assign(session.answers[existingIdx], dto);
    } else {
      session.answers.push({ question: questionId, ...dto });
    }

    await session.save();
    return session;
  }

  /**
   * 完成会话，计算统计数据
   * @param {string} sessionId
   * @param {string} userId
   */
  async finish(sessionId, userId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('会话');
    if (session.user.toString() !== userId) throw new ForbiddenError();
    if (session.status === 'finished') throw new ValidationError('该会话已结束');

    session.status = 'finished';
    session.finishedAt = new Date();
    session.masteredCount = session.answers.filter((a) => a.mastered).length;

    await session.save();

    // 填充完整题目信息（含参考答案）供结果页展示
    return session.populate('questions');
  }

  /**
   * 获取会话详情
   * @param {string} sessionId
   * @param {string} userId
   */
  async getById(sessionId, userId) {
    const session = await Session.findById(sessionId)
      .populate('questions')
      .populate('user', 'username');

    if (!session) throw new NotFoundError('会话');
    if (session.user._id.toString() !== userId) throw new ForbiddenError();

    return session;
  }

  /**
   * 查询当前用户的历史会话列表
   * @param {string} userId
   * @param {{ page?: number, limit?: number, status?: string }} opts
   */
  async listByUser(userId, { page = 1, limit = 10, status } = {}) {
    const filter = { user: userId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Session.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-answers'), // 列表页不返回详细作答
      Session.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new SessionService();
