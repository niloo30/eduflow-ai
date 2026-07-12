import { useState, useEffect } from 'react'

// Define the production Render backend API Base URL
const API_BASE_URL = 'https://eduflow-ai-525b.onrender.com';

function App() {
  // Auth states
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '')
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')

  // Course & General App states
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedCourses, setSavedCourses] = useState([])
  const [course, setCourse] = useState(null)
  const [activeChapterIdx, setActiveChapterIdx] = useState(0)

  // Quiz states
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  // Step indicator: 'dashboard' -> 'reading' -> 'quiz'
  const [appStep, setAppStep] = useState('dashboard')

  // Fetch saved courses from backend
  const fetchCourses = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSavedCourses(data.courses)
      } else {
        handleLogout()
      }
    } catch (err) {
      console.error('Failed to load courses from database:', err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCourses(token)
    }
  }, [token])

  // Handle Authentication (Login / Signup)
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = authMode === 'login' ? 'login' : 'signup'

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      })
      const data = await response.json()

      if (data.success && data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userEmail', data.user.email)
        setToken(data.token)
        setUserEmail(data.user.email)
        setEmailInput('')
        setPasswordInput('')
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (err) {
      setError('Could not connect to the authentication server.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setToken('')
    setUserEmail('')
    setCourse(null)
    setQuizQuestions([])
    setAppStep('dashboard')
  }

  // Generate Course Content from Gemini & save to database
  const handleGenerateCourse = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    setError('')
    setCourse(null)
    setQuizQuestions([])

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-course`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: topic.trim() })
      })
      const data = await response.json()
      
      if (data.success && data.course) {
        setCourse(data.course)
        setActiveChapterIdx(0)
        setAppStep('reading')
        fetchCourses(token) // Refresh dashboard list in background
      } else {
        setError(data.error || 'Failed to generate course.')
      }
    } catch (err) {
      console.error(err)
      setError('Could not connect to the backend server. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  // Generate Quiz based on course data ID
  const handleGenerateQuiz = async () => {
    if (!course) return
    setQuizLoading(true)
    setError('')
    setCurrentQuizIdx(0)
    setScore(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setQuizFinished(false)

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-course-quiz`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseId: course._id })
      })
      const data = await response.json()

      if (data.success && Array.isArray(data.quiz)) {
        setQuizQuestions(data.quiz)
        setAppStep('quiz')
      } else {
        setError(data.error || 'Failed to generate quiz.')
      }
    } catch (err) {
      console.error(err)
      setError('Error generating quiz from course data.')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleAnswerClick = (option) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(option)
    setShowExplanation(true)
    if (option === quizQuestions[currentQuizIdx].correctAnswer) {
      setScore(prev => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    setSelectedAnswer(null)
    setShowExplanation(false)
    if (currentQuizIdx + 1 < quizQuestions.length) {
      setCurrentQuizIdx(prev => prev + 1)
    } else {
      setQuizFinished(true)
      // Save score to database
      fetch(`${API_BASE_URL}/api/save-score`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          courseId: course._id, 
          score: score
        })
      }).then(() => fetchCourses(token))
    }
  }

  const handleSelectSavedCourse = (selectedCourse) => {
    setCourse(selectedCourse)
    setActiveChapterIdx(0)
    setAppStep('reading')
  }

  const handleReset = () => {
    setCourse(null)
    setQuizQuestions([])
    setTopic('')
    setAppStep('dashboard')
  }

  // --- RENDERING ROUTER ---

  // 1. Unauthenticated Login/Signup Screen
  if (!token) {
    return (
      <div style={{
        maxWidth: '450px',
        margin: '6rem auto',
        padding: '2.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)',
        border: '1px solid var(--border-color)'
      }}>
        <h1 style={{ 
          fontSize: '2.2rem', 
          fontWeight: '800', 
          color: 'white', 
          textAlign: 'center',
          marginBottom: '0.25rem',
          background: 'linear-gradient(to right, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          EduFlow AI
        </h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
          Log in to access your course buddy workspace
        </p>

        {error && (
          <div style={{ 
            color: 'var(--danger-text)', 
            backgroundColor: 'var(--danger-bg)', 
            border: '1px solid var(--danger-border)',
            padding: '0.75rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'white', fontWeight: '500' }}>Email Address</label>
            <input 
              type="email" 
              required
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                padding: '0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'white', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{
                padding: '0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              padding: '0.8rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Authenticating...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '600' }}
          >
            {authMode === 'login' ? 'Sign Up' : 'Log In'}
          </span>
        </p>
      </div>
    )
  }

  // 2. Authenticated Application UI
  return (
    <div style={{
      maxWidth: '850px',
      margin: '3rem auto',
      padding: '2.5rem',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.3)',
      border: '1px solid var(--border-color)',
    }}>
      {/* Header bar with Logout */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ 
            fontSize: '2.2rem', 
            fontWeight: '800', 
            color: 'white', 
            margin: '0 0 0.25rem 0',
            background: 'linear-gradient(to right, #818cf8, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em'
          }}>
            EduFlow AI
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Logged in as: <strong style={{ color: 'white' }}>{userEmail}</strong>
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger-border)';
            e.currentTarget.style.color = 'var(--danger-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          Log Out
        </button>
      </header>

      {error && (
        <div style={{ 
          color: 'var(--danger-text)', 
          backgroundColor: 'var(--danger-bg)', 
          borderColor: 'var(--danger-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          fontSize: '0.95rem'
        }}>
          {error}
        </div>
      )}

      {/* Step 1: Dashboard UI */}
      {appStep === 'dashboard' && !loading && (
        <div>
          {/* Create new course card */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.2rem' }}>Generate New Course</h3>
            <form onSubmit={handleGenerateCourse} style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic (e.g. Graph Algorithms, Redux Toolkit)"
                style={{
                  flex: 1,
                  padding: '0.8rem 1.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!topic.trim()}
                style={{
                  backgroundColor: topic.trim() ? 'var(--accent-color)' : '#4338ca',
                  opacity: topic.trim() ? 1 : 0.6,
                  color: 'white',
                  border: 'none',
                  padding: '0 1.5rem',
                  borderRadius: '8px',
                  cursor: topic.trim() ? 'pointer' : 'default',
                  fontWeight: '600',
                  fontSize: '1rem',
                }}
              >
                Generate 📖
              </button>
            </form>
          </div>

          {/* History / saved courses section */}
          <div>
            <h3 style={{ 
              color: 'white', 
              borderBottom: '1px solid var(--border-color)', 
              paddingBottom: '0.75rem', 
              marginBottom: '1.25rem',
              fontSize: '1.25rem' 
            }}>
              Your Learning Workspace ({savedCourses.length})
            </h3>
            {savedCourses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '3rem 0' }}>
                No courses in your workspace. Build one above or wait to fetch.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {savedCourses.map((c) => (
                  <div 
                    key={c._id}
                    onClick={() => handleSelectSavedCourse(c)}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '120px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.1rem', lineHeight: '1.3' }}>
                        {c.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {c.owner === null ? '🏫 Seeded Course' : `Topic: ${c.topic}`}
                      </p>
                    </div>
                    <div style={{ marginTop: '1.25rem' }}>
                      {c.userScore !== null ? (
                        <span style={{
                          backgroundColor: 'var(--success-bg)',
                          color: 'var(--success-text)',
                          border: '1px solid var(--success-border)',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          Score: {c.userScore} / 3
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem'
                        }}>
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading states */}
      {(loading || quizLoading) && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid var(--accent-color)',
            borderRadius: '50%',
            width: '45px',
            height: '45px',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1.5rem auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
            {loading ? "AI is generating your syllabus outline and reading material..." : "AI is analyzing your course to structure interactive questions..."}
          </p>
        </div>
      )}

      {/* Step 2: Course Reader UI */}
      {appStep === 'reading' && course && (
        <div>
          <h2 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.75rem' }}>{course.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>{course.description}</p>
          
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            backgroundColor: 'var(--bg-primary)', 
            padding: '0.25rem', 
            borderRadius: '10px', 
            marginBottom: '2rem' 
          }}>
            {course.chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChapterIdx(idx)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  backgroundColor: activeChapterIdx === idx ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeChapterIdx === idx ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
              >
                Ch {ch.chapterNumber}: {ch.title}
              </button>
            ))}
          </div>

          {/* Chapter Content Card */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0, color: 'white', fontSize: '1.4rem', marginBottom: '1rem' }}>
              {course.chapters[activeChapterIdx].title}
            </h3>
            <p style={{ lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1.05rem', margin: 0 }}>
              {course.chapters[activeChapterIdx].concept}
            </p>
            {course.chapters[activeChapterIdx].example && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap',
                color: '#818cf8',
                borderLeft: '4px solid var(--accent-color)',
                lineHeight: '1.5'
              }}>
                {course.chapters[activeChapterIdx].example}
              </div>
            )}
          </div>

          {/* Navigation controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button
              onClick={handleReset}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                color: 'white',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Back to Workspace
            </button>
            {activeChapterIdx < course.chapters.length - 1 ? (
              <button
                onClick={() => setActiveChapterIdx(prev => prev + 1)}
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.8rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
              >
                Next Chapter
              </button>
            ) : (
              <button
                onClick={handleGenerateQuiz}
                style={{
                  backgroundColor: 'var(--success-border)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.8rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--success-border)'}
              >
                Start AI Quiz 📝
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Interactive Quiz UI */}
      {appStep === 'quiz' && quizQuestions.length > 0 && (
        quizFinished ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h2 style={{ color: 'var(--success-text)', fontSize: '2rem', marginBottom: '1rem' }}>Quiz Completed! 🎉</h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Your Performance Score: <strong style={{ color: 'white', fontSize: '1.5rem' }}>{score} / {quizQuestions.length}</strong>
            </p>
            <button 
              onClick={handleReset}
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                padding: '0.8rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
            >
              Back to Workspace
            </button>
          </div>
        ) : (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <span>Question {currentQuizIdx + 1} of {quizQuestions.length}</span>
              <span>Correct Score: {score}</span>
            </div>

            {/* Question Card */}
            <h3 style={{ color: 'white', fontSize: '1.35rem', marginBottom: '2rem', lineHeight: '1.4' }}>
              {quizQuestions[currentQuizIdx].question}
            </h3>

            {/* Answer buttons stack */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {quizQuestions[currentQuizIdx].options.map((option, idx) => {
                let bgColor = 'var(--bg-tertiary)'
                let borderColor = 'var(--border-color)'
                let textColor = 'var(--text-main)'

                if (selectedAnswer !== null) {
                  if (option === quizQuestions[currentQuizIdx].correctAnswer) {
                    bgColor = 'var(--success-bg)'
                    borderColor = 'var(--success-border)'
                    textColor = 'var(--success-text)'
                  } else if (option === selectedAnswer) {
                    bgColor = 'var(--danger-bg)'
                    borderColor = 'var(--danger-border)'
                    textColor = 'var(--danger-text)'
                  } else {
                    bgColor = 'var(--bg-tertiary)'
                    borderColor = 'transparent'
                    textColor = 'var(--text-muted)'
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerClick(option)}
                    disabled={selectedAnswer !== null}
                    style={{
                      textAlign: 'left',
                      padding: '1.25rem',
                      borderRadius: '10px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor,
                      color: textColor,
                      cursor: selectedAnswer === null ? 'pointer' : 'default',
                      fontSize: '1.05rem',
                      transition: 'all 0.2s',
                      fontWeight: selectedAnswer === option ? '600' : 'normal'
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {/* Explanations */}
            {showExplanation && (
              <div style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderLeft: '4px solid var(--accent-color)',
                padding: '1.25rem',
                borderRadius: '0 10px 10px 0',
                marginBottom: '2rem'
              }}>
                <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                  AI Explanation:
                </strong>
                <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {quizQuestions[currentQuizIdx].explanation}
                </p>
              </div>
            )}

            {/* Action Bar */}
            {selectedAnswer !== null && (
              <button
                onClick={handleNextQuestion}
                style={{
                  width: '100%',
                  backgroundColor: 'white',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  padding: '1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  transition: 'background-color 0.2s'
                }}
              >
                {currentQuizIdx + 1 === quizQuestions.length ? "Finish Assessment" : "Next Question"}
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}

export default App
