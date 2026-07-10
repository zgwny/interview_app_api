'use strict';

const Category = require('../models/Category');
const Question = require('../models/Question');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

class CategoryService {
  /** 获取所有分类（按 sort 升序） */
  async list() {
    return Category.find().sort({ sort: 1, name: 1 }).lean();
  }

  /** 新建分类 */
  async create({ name, label, color, sort }) {
    const exists = await Category.findOne({ name: name.toLowerCase().trim() });
    if (exists) throw new ConflictError(`分类「${name}」已存在`);
    return Category.create({ name, label: label || name, color, sort });
  }

  /** 更新分类 */
  async update(id, { label, color, sort }) {
    const cat = await Category.findByIdAndUpdate(
      id,
      { ...(label !== undefined && { label }), ...(color !== undefined && { color }), ...(sort !== undefined && { sort }) },
      { new: true, runValidators: true }
    );
    if (!cat) throw new NotFoundError('分类');
    return cat;
  }

  /** 删除分类（检查是否有题目在用） */
  async remove(id) {
    const cat = await Category.findById(id);
    if (!cat) throw new NotFoundError('分类');

    const count = await Question.countDocuments({ category: cat.name });
    if (count > 0) throw new ValidationError(`该分类下还有 ${count} 道题目，请先修改题目分类后再删除`);

    await cat.deleteOne();
  }

  /** 批量更新排序 */
  async updateSort(items) {
    // items: [{ id, sort }]
    await Promise.all(
      items.map(({ id, sort }) => Category.findByIdAndUpdate(id, { sort }))
    );
    return this.list();
  }
}

module.exports = new CategoryService();
