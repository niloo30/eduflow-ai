# EduFlow AI (AI Course & Quiz Builder)

EduFlow AI is a personalized educational platform that leverages Generative AI to instantly build customized courses and assessment quizzes on any topic. 

It is designed with an industry-grade tech stack and implements advanced software engineering design patterns like **Prompt Chaining**, **JSON Structural Decoding**, and **Pre-Generated Topic Caching** to solve real-world API rate limit and cost constraints.

---

## 🌟 Key Features
* **User Authentication**: Secure SignUp/Login system powered by JSON Web Tokens (JWT) and `bcryptjs` password hashing.
* **GenAI Course Builder**: Instantly generates a structured 3-chapter syllabus outline, reading material, and practical code examples for any topic using the Google Gemini API.
* **Chained Assessment Engine**: Evaluates user understanding by dynamically analyzing generated course materials and compiling a custom 3-question multiple-choice quiz.
* **Smart Database Caching**: Connects to MongoDB to cache generated courses. If a user requests a topic that was generated before, it serves it instantly from MongoDB in under 50ms, skipping external API requests.
* **Pre-Seeded Placement Syllabus**: Pre-seeded with 5 fundamental software engineering topics (React Hooks, REST APIs, Git Branching, SQL Joins, Binary Search) to ensure instant delivery and zero rate-limiting during placement reviews.

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite), Modern Custom Dark-Theme Styling system.
* **Backend**: Node.js, Express.js.
* **Database**: MongoDB (Mongoose ODM).
* **AI Integration**: Google Gemini 2.5 Flash API (Official `@google/genai` SDK).
* **Security**: JWT Authentication, Bearer Token Headers, Bcrypt password encryption.

---

## 📐 System Architecture & Workflow

```
┌───────────┐         (Fetch / Auth)         ┌────────────────┐
│   React   │ ◄────────────────────────────► │ Node + Express │
│  Frontend │                                │     Server     │
└───────────┘                                └───────┬────────┘
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
                     ┌───────────────┐                              ┌────────────────┐
                     │    MongoDB    │                              │ Google Gemini  │
                     │  (Course Cache│                              │    AI Model    │
                     │   & User DB)  │                              │ (generate-2.5) │
                     └───────────────┘                              └────────────────┘
```

1. **User Sign Up / Login**: User authenticates and receives a JWT, stored in their browser's `localStorage`.
2. **Course Request**: The user enters a topic.
   - The server checks if the topic exists in MongoDB. If found, it returns the course immediately (0 API cost).
   - If unique, the server triggers Gemini to generate the course in structured JSON format, saves it to MongoDB, and returns it to the user.
3. **Quiz Assessment**: When the user finishes reading, the frontend requests a quiz. The server prompts the LLM to inspect the *previously generated course content* and return a custom quiz with answer keys and code explanations.
4. **Progress Logging**: The user's score is submitted and saved to their personal profile history.

---

## 🚀 How to Run Locally

### Prerequisites
* **Node.js** (v18+)
* **MongoDB** (Running locally on default port 27017 or a Cloud Atlas URI)
* **Google Gemini API Key** (Get a free key from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository and navigate to folders

### 2. Configure Backend Server
Create a `.env` file inside the `server/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/coursebuddy
JWT_SECRET=your_jwt_secret_key_here
```

Install backend dependencies:
```bash
cd server
npm install
```

### 3. Run Database Seeding
Pre-populate your local database with high-quality courses to save API quotas:
```bash
node seed.js
node seed-binary-search.js
```

### 4. Run Backend Server
```bash
node index.js
```

### 5. Configure & Run Frontend
Navigate to the root directory, install React packages, and start the development server:
```bash
npm install
npm run dev
```

Open your browser to `http://localhost:5173`.

