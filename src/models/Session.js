'use strict';

const mongoose = require('mongoose');

/** 单题作答记录 */
const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    userAnswer: { type: String, default: '' },
    // 是否标记为已掌握
    mastered: { type: Boolean, default: false },
    // 耗时（秒）
    timeSpent: { type: Number, default: 0 },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 本次练习的题目列表（快照：按顺序）
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    answers: [answerSchema],
    // 筛选条件快照，方便前端回显
    filter: {
      category: String,
      difficulty: String,
      tags: [String],
    },
    status: {
      type: String,
      enum: ['ongoing', 'finished'],
      default: 'ongoing',
    },
    // 掌握题数 / 总题数（finish 时计算写入）
    masteredCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
