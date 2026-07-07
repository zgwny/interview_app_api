'use strict';

const User = require('../models/User');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/errors');

class UserService {
  /**
   * 注册新用户
   * @param {{ username: string, email: string, password: string }} dto
   */
  async register({ username, email, password }) {
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      const field = exists.username === username ? '用户名' : '邮箱';
      throw new ConflictError(`${field}已被注册`);
    }

    // passwordHash 字段 pre-save hook 会自动 bcrypt
    const user = await User.create({ username, email, passwordHash: password });
    return user.toPublic();
  }

  /**
   * 登录验证，返回用户公开信息（不含 token，token 由路由层生成）
   * @param {{ email: string, password: string }} dto
   */
  async login({ email, password }) {
    // select('+passwordHash') 显式取回被隐藏的字段
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new ValidationError('邮箱或密码错误');

    const match = await user.comparePassword(password);
    if (!match) throw new ValidationError('邮箱或密码错误');

    return user;
  }

  /** 根据 ID 获取用户信息 */
  async getById(id) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('用户');
    return user.toPublic();
  }

  /**
   * 收藏 / 取消收藏题目
   * @param {string} userId
   * @param {string} questionId
   * @returns {{ favorited: boolean }}
   */
  async toggleFavorite(userId, questionId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('用户');

    const Question = require('../models/Question');
    const question = await Question.findById(questionId);
    if (!question) throw new NotFoundError('题目');

    const alreadyFavorited = user.favorites.some(
      (id) => id.toString() === questionId
    );

    if (alreadyFavorited) {
      user.favorites.pull(questionId);
      question.favoriteCount = Math.max(0, question.favoriteCount - 1);
    } else {
      user.favorites.addToSet(questionId);
      question.favoriteCount += 1;
    }

    await Promise.all([user.save(), question.save()]);
    return { favorited: !alreadyFavorited };
  }

  /** 获取用户收藏列表（分页） */
  async getFavorites(userId, { page = 1, limit = 20 } = {}) {
    const user = await User.findById(userId).populate({
      path: 'favorites',
      options: {
        skip: (page - 1) * limit,
        limit,
      },
    });
    if (!user) throw new NotFoundError('用户');
    return user.favorites;
  }
}

module.exports = new UserService();
