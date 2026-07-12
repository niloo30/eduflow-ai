const mongoose = require('mongoose');

const ChapterSchema = new mongoose.Schema({
  chapterNumber: Number,
  title: String,
  concept: String,
  example: String
});

const QuizQuestionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  options: [String],
  correctAnswer: String,
  explanation: String
});

const CourseSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  chapters: [ChapterSchema],
  quiz: [QuizQuestionSchema],
  userScore: { type: Number, default: null },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Track who generated the course (null for seed courses visible to all!)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
