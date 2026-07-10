'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#8c8c8c',
    },
    sort: {
      type: Number,
      default: 99,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
