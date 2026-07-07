'use strict';

const Question = require('../models/Question');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class QuestionService {
  /**
   * 分页查询题目列表
   * @param {object} query
   * @param {string}  [query.category]
   * @param {string}  [query.difficulty]
   * @param {string}  [query.tag]
   * @param {string}  [query.keyword]   全文搜索关键词
   * @param {number}  [query.page=1]
   * @param {number}  [query.limit=20]
   * @param {string}  [query.sort='createdAt']  createdAt | viewCount | favoriteCount
   */
  async list({ category, difficulty, tag, keyword, page = 1, limit = 20, sort = 'createdAt' } = {}) {
    const filter = {};

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (tag) filter.tags = tag;
    if (keyword) filter.$text = { $search: keyword };

    const sortMap = {
      createdAt: { createdAt: -1 },
      viewCount: { viewCount: -1 },
      favoriteCount: { favoriteCount: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.createdAt;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Question.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username'),
      Question.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /** 获取单题详情，并递增浏览次数 */
  async getById(id) {
    const question = await Question.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('createdBy', 'username');

    if (!question) throw new NotFoundError('题目');
    return question;
  }

  /**
   * 创建题目
   * @param {object} dto  题目数据
   * @param {string} userId  创建者 ID
   */
  async create(dto, userId) {
    const question = await Question.create({ ...dto, createdBy: userId });
    return question;
  }

  /**
   * 更新题目（仅创建者或管理员）
   * @param {string} id
   * @param {object} dto
   * @param {{ id: string, role: string }} operator
   */
  async update(id, dto, operator) {
    const question = await Question.findById(id);
    if (!question) throw new NotFoundError('题目');

    const isOwner = question.createdBy.toString() === operator.id;
    if (!isOwner && operator.role !== 'admin') {
      throw new ForbiddenError('只有题目创建者或管理员才能修改');
    }

    // 不允许外部直接修改统计字段
    const { viewCount, favoriteCount, createdBy, ...safeDto } = dto;

    Object.assign(question, safeDto);
    await question.save();
    return question;
  }

  /**
   * 删除题目（仅创建者或管理员）
   */
  async remove(id, operator) {
    const question = await Question.findById(id);
    if (!question) throw new NotFoundError('题目');

    const isOwner = question.createdBy.toString() === operator.id;
    if (!isOwner && operator.role !== 'admin') {
      throw new ForbiddenError('只有题目创建者或管理员才能删除');
    }

    await question.deleteOne();
  }

  /**
   * 随机抽题（用于生成练习会话）
   * @param {{ category?: string, difficulty?: string, count?: number }} opts
   */
  async randomPick({ category, difficulty, count = 10 } = {}) {
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: count } },
    ]);
    return questions;
  }
}

module.exports = new QuestionService();
