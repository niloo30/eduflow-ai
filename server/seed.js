const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const Course = require('./models/Course');

dotenv.config();

// Initialize Google Gen AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const TOPICS_TO_SEED = [
  'React Hooks',
  'REST APIs',
  'Git Branching',
  'SQL Joins',
  'Binary Search'
];

async function generateWithRetry(prompt, isQuiz = false, retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return JSON.parse(response.text.trim());
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed. Error: ${err.message}. Retrying in ${delay}ms...`);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coursebuddy');
    console.log('Connected successfully!');

    // We do NOT delete existing courses here. Instead, we check if they already exist,
    // so we can resume seeding if the script got interrupted!
    for (const topic of TOPICS_TO_SEED) {
      const existing = await Course.findOne({ topic: topic });
      if (existing) {
        console.log(`Topic "${topic}" already exists in database. Skipping generation.`);
        continue;
      }

      console.log(`Generating Course for: "${topic}"...`);
      
      const coursePrompt = `
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

      const courseData = await generateWithRetry(coursePrompt, false);

      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`Generating Quiz for: "${topic}"...`);
      const quizPrompt = `
        Act as an examiner. Based ONLY on the following course structure, generate a 3-question multiple choice quiz to test understanding of the material.
        
        Course Content:
        ${JSON.stringify(courseData)}
        
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

      const quizData = await generateWithRetry(quizPrompt, true);

      // Save combined course + quiz to MongoDB
      const dbCourse = new Course({
        topic: topic,
        title: courseData.title,
        description: courseData.description,
        chapters: courseData.chapters,
        quiz: quizData,
        userScore: null
      });

      await dbCourse.save();
      console.log(`Successfully generated and saved course/quiz for "${topic}"!`);
      
      // Delay before next topic
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    console.log('Database seeding process completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

seedDatabase();

