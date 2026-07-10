'use strict';

const mongoose = require('mongoose');

const CATEGORIES = ['javascript', 'typescript', 'css', 'html', 'react', 'vue', 'node', 'network', 'algorithm', 'sql', 'devops', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // 参考答案（Markdown 格式）
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      required: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 浏览次数
    viewCount: { type: Number, default: 0 },
    // 被收藏次数（冗余字段，便于排序）
    favoriteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 全文检索索引
questionSchema.index({ title: 'text', content: 'text', tags: 'text' });
// 常用过滤字段索引
questionSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.DIFFICULTIES = DIFFICULTIES;
