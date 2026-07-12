const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');

const Course = require('./models/Course');
const User = require('./models/User');
const requireAuth = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to local MongoDB Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB database!'))
  .catch((err) => console.error('MongoDB database connection error:', err));

// Initialize Google Gen AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// A test endpoint to verify the server works
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduFlow Server is healthy and running!' });
});

// --- AUTHENTICATION ROUTES ---

// Sign Up Route
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new User({
      email,
      password: hashedPassword
    });
    await newUser.save();

    // Create JWT Token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || 'super_secret_placement_key_123',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, email: newUser.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    // Verify user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'super_secret_placement_key_123',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});


// --- COURSE & QUIZ ROUTES ---

// Fetch saved courses: returns seeded courses (owner=null) AND the logged-in user's courses
app.get('/api/courses', requireAuth, async (req, res) => {
  try {
    const courses = await Course.find({
      $or: [
        { owner: null }, // Seeding courses visible to everyone
        { owner: req.user.id } // Only courses owned by the logged-in user
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved courses' });
  }
});

// Generate structured course materials AND associate with current user
app.post('/api/generate-course', requireAuth, async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const prompt = `
      Act as an expert technical tutor.
      Generate a structured mini-course about the topic: "${topic}".
      The course must have exactly 3 logical chapters.
      
      You must respond ONLY with a valid JSON object matching this exact format:
      {
        "title": "Main Course Title",
        "description": "Short overview description of the course",
        "chapters": [
          {
            "chapterNumber": 1,
            "title": "Chapter Title",
            "concept": "Core concepts explained clearly with details. Keep it educational and engaging.",
            "example": "Practical real-world code example, text example, or walkthrough case study."
          }
        ]
      }
      
      Do not wrap your response in markdown tags (like \`\`\`json). Just return the raw JSON text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const cleanText = response.text.trim();
    const courseData = JSON.parse(cleanText);

    // Save the new course, marked with the current logged-in user as the owner
    const newCourse = new Course({
      topic: topic,
      title: courseData.title,
      description: courseData.description,
      chapters: courseData.chapters,
      quiz: [],
      owner: req.user.id // Associate with the authenticated user
    });
    
    await newCourse.save();

    res.json({ success: true, course: newCourse });
  } catch (error) {
    console.error('Course Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate course content.',
      details: error.message
    });
  }
});

// Generate quiz questions specific to course (protect with auth)
app.post('/api/generate-course-quiz', requireAuth, async (req, res) => {
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    const dbCourse = await Course.findOne({
      _id: courseId,
      $or: [{ owner: null }, { owner: req.user.id }]
    });

    if (!dbCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (dbCourse.quiz && dbCourse.quiz.length > 0) {
      return res.json({ success: true, quiz: dbCourse.quiz });
    }

    const prompt = `
      Act as an examiner. Based ONLY on the following course structure, generate a 3-question multiple choice quiz to test understanding of the material.
      
      Course Content:
      ${JSON.stringify({ title: dbCourse.title, description: dbCourse.description, chapters: dbCourse.chapters })}
      
      You must respond ONLY with a valid JSON array matching this exact format:
      [
        {
          "id": 1,
          "question": "Question text directly referencing concepts from this course",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact correct option string from the options array",
          "explanation": "Brief explanation referencing course concepts"
        }
      ]
      
      Do not wrap your response in markdown (no \`\`\`json). Return raw JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const cleanText = response.text.trim();
    const quizData = JSON.parse(cleanText);

    dbCourse.quiz = quizData;
    await dbCourse.save();

    res.json({ success: true, quiz: quizData });
  } catch (error) {
    console.error('Course Quiz Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate quiz for this course.',
      details: error.message
    });
  }
});

// Save user score (protect with auth)
app.post('/api/save-score', requireAuth, async (req, res) => {
  const { courseId, score } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    const dbCourse = await Course.findOne({
      _id: courseId,
      $or: [{ owner: null }, { owner: req.user.id }]
    });

    if (!dbCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    dbCourse.userScore = score;
    await dbCourse.save();

    res.json({ success: true, message: 'Score saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save score.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
