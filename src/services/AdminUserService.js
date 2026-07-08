'use strict';

const User = require('../models/User');
const Session = require('../models/Session');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

class AdminUserService {
  /**
   * 分页查询用户列表
   * @param {{ keyword?: string, role?: string, page?: number, limit?: number, sort?: string }} query
   */
  async list({ keyword, role, page = 1, limit = 20, sort = 'createdAt' } = {}) {
    const filter = {};

    if (role) filter.role = role;

    if (keyword) {
      const re = new RegExp(keyword, 'i');
      filter.$or = [{ username: re }, { email: re }];
    }

    const sortMap = {
      createdAt:    { createdAt: -1 },
      username:     { username:  1  },
    };
    const sortOpt = sortMap[sort] ?? { createdAt: -1 };

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort(sortOpt)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      items: items.map(this._toPublic),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 用户详情 + 练习统计
   * @param {string} id
   */
  async getById(id) {
    const user = await User.findById(id).lean();
    if (!user) throw new NotFoundError('用户');

    // 统计该用户的 session 数量与完成情况
    const [totalSessions, finishedSessions] = await Promise.all([
      Session.countDocuments({ user: id }),
      Session.countDocuments({ user: id, status: 'finished' }),
    ]);

    return {
      ...this._toPublic(user),
      stats: { totalSessions, finishedSessions },
    };
  }

  /**
   * 更新用户信息（管理员可修改 role 或重置密码）
   * @param {string} id          目标用户 ID
   * @param {string} operatorId  操作人 ID（防止降级自己）
   * @param {{ role?: string, password?: string }} dto
   */
  async update(id, operatorId, { role, password } = {}) {
    if (!role && !password) throw new ValidationError('至少提供一个更新字段');

    const user = await User.findById(id).select('+passwordHash');
    if (!user) throw new NotFoundError('用户');

    // 不允许修改自己的 role（防止管理员把自己降级后失去权限）
    if (role && id === operatorId) {
      throw new ForbiddenError('不能修改自己的角色');
    }

    if (role) user.role = role;

    if (password) {
      if (password.length < 6) throw new ValidationError('密码至少 6 位');
      // 直接赋值给 passwordHash，pre-save hook 会自动 bcrypt
      user.passwordHash = password;
    }

    await user.save();
    return this._toPublic(user.toObject());
  }

  /**
   * 删除用户
   * @param {string} id          目标用户 ID
   * @param {string} operatorId  操作人 ID（不能删自己）
   */
  async remove(id, operatorId) {
    if (id === operatorId) throw new ForbiddenError('不能删除自己的账号');

    const user = await User.findByIdAndDelete(id);
    if (!user) throw new NotFoundError('用户');
  }

  /** 内部工具：lean 对象转公开字段 */
  _toPublic(u) {
    return {
      id:        u._id,
      username:  u.username,
      email:     u.email,
      role:      u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}

module.exports = new AdminUserService();
