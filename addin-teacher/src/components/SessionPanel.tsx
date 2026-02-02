import React, { useState, useEffect } from "react";
import { WSClient } from "../services/ws";
import { accessToken } from "./token";
import TeacherLeaderboard, { LeaderboardEntry } from "./Leaderboard/TeacherLeaderboard";

interface Question {
  id: number;
  text: string;
  choices: { id: number; text: string; is_correct: boolean }[];
  time_limit: number;
}

interface Quiz {
  id: string;
  title: string;
}

export default function SessionPanel() {
  const [pin, setPin] = useState("");
  const [wsClient, setWsClient] = useState<WSClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [questionTimer, setQuestionTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    totalParticipants: 0,
    totalQuestions: 0,
    averageScore: 0
  });

  // Fetch available quizzes and questions when component mounts
  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Add timer effect in teacher panel
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (timerActive && questionTimer > 0) {
      timer = setInterval(() => {
        setQuestionTimer(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timerActive]);

  const fetchQuizzes = async () => {
    if (!accessToken) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/quizzes/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
        if (data.length > 0) {
          setSelectedQuiz(data[0].id);
          fetchQuestions(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
    }
  };

  const fetchQuestions = async (quizId: string) => {
    if (!accessToken) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/questions/?quiz=${quizId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        if (data.length > 0) {
          setSelectedQuestion(data[0].id);
        } else {
          setSelectedQuestion(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    }
  };

  const createSession = async () => {
    if (!accessToken) {
      alert("Login first");
      return;
    }

    if (!selectedQuiz) {
      alert("Please select a quiz first");
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/api/sessions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ quiz: selectedQuiz }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Failed to create session:", err);
      alert(`Error: ${JSON.stringify(err)}`);
      return;
    }

    const data = await res.json();
    setPin(data.pin);
    setStatus("Connecting...");

    const wsUrl = `ws://127.0.0.1:8000/ws/session/${data.pin}/`;
    console.log("🔍 Teacher connecting to:", wsUrl);
    
    const ws = new WSClient(wsUrl);
    
    ws.onOpen(() => {
      console.log("✅ Teacher WebSocket connected");
      setIsConnected(true);
      setStatus("Connected");
      ws.send({ 
        action: "host_join",
        token: accessToken,
        session_pin: data.pin
      });
    });
    
    // UPDATED WebSocket message handler
    ws.onMessage((msg) => {
      console.log("📩 Teacher received:", msg);
      
      if (msg.error) {
        console.error("❌ Teacher received error:", msg.error);
        alert(`Error: ${msg.error}`);
      }
      
      if (msg.type === "host_join_success") {
        console.log("✅ Host joined successfully");
      }
      
      if (msg.type === "score_update") {
        console.log("📊 Scoreboard updated:", msg.scoreboard);
        
        // Process leaderboard data
        const rankedLeaderboard: LeaderboardEntry[] = msg.scoreboard
          .sort((a: any, b: any) => b.score - a.score)
          .map((participant: any, index: number) => ({
            participant_id: participant.participant_id,
            name: participant.name,
            score: participant.score,
            rank: index + 1
          }));
        
        setLeaderboard(rankedLeaderboard);
        
        // Update session stats
        setSessionStats({
          totalParticipants: rankedLeaderboard.length,
          totalQuestions: questions.length,
          averageScore: rankedLeaderboard.length > 0 
            ? Math.round(rankedLeaderboard.reduce((sum, entry) => sum + entry.score, 0) / rankedLeaderboard.length)
            : 0
        });
      }
    });
    
    ws.onClose(() => {
      console.log("🔌 Teacher WebSocket closed");
      setIsConnected(false);
      setStatus("Disconnected");
    });

    setWsClient(ws);
  };

  // Session control functions
  const toggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
  };

  const endSession = () => {
    if (wsClient && isConnected) {
      // Send end session message to all participants
      wsClient.send({
        action: "host_end_session"
      });
      alert("Session ended!");
    }
  };

  const pushQuestion = () => {
    if (!wsClient || !isConnected || !selectedQuestion) {
      alert("WebSocket not connected or no question selected");
      return;
    }

    // Find the selected question to get its time limit
    const question = questions.find(q => q.id === selectedQuestion);
    if (question) {
      setQuestionTimer(question.time_limit || 30);
      setTimerActive(true);
    }

    console.log("📤 Teacher pushing question:", selectedQuestion);
    
    wsClient.send({ 
      action: "host_push_question", 
      question_id: selectedQuestion
    });
  };

  const createNewQuestion = async () => {
    if (!accessToken || !selectedQuiz) {
      alert("Login first and select a quiz");
      return;
    }

    const questionText = prompt("Enter question text:");
    if (!questionText) return;

    // Get answer choices from teacher with null checks
    const choice1 = prompt("Enter choice 1:");
    if (!choice1) {
      alert("Choice 1 is required");
      return;
    }
    
    const choice2 = prompt("Enter choice 2:");
    if (!choice2) {
      alert("Choice 2 is required");
      return;
    }
    
    const choice3 = prompt("Enter choice 3:");
    if (!choice3) {
      alert("Choice 3 is required");
      return;
    }
    
    const choice4 = prompt("Enter choice 4:");
    if (!choice4) {
      alert("Choice 4 is required");
      return;
    }

    // Let teacher specify which is correct
    const correctAnswer = prompt(
      `Which choice is correct? Enter 1, 2, 3, or 4:\n1. ${choice1}\n2. ${choice2}\n3. ${choice3}\n4. ${choice4}`
    );

    // FIX: Check if correctAnswer is not null before using it
    if (!correctAnswer || !['1', '2', '3', '4'].includes(correctAnswer)) {
      alert("Please enter 1, 2, 3, or 4 for the correct answer");
      return;
    }

    const questionData = {
      quiz: selectedQuiz,
      text: questionText,
      order: questions.length,
      time_limit: 30,
      choices: [
        { text: choice1, is_correct: correctAnswer === '1' },
        { text: choice2, is_correct: correctAnswer === '2' },
        { text: choice3, is_correct: correctAnswer === '3' },
        { text: choice4, is_correct: correctAnswer === '4' },
      ]
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/questions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(questionData),
      });

      if (res.ok) {
        const newQuestion = await res.json();
        setQuestions([...questions, newQuestion]);
        setSelectedQuestion(newQuestion.id);
        alert("Question created successfully!");
      } else {
        const error = await res.json();
        alert(`Error: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error("Failed to create question:", error);
      alert("Failed to create question");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Quiz Selection */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Select Quiz: </strong></label>
        <select 
          value={selectedQuiz || ""} 
          onChange={(e) => {
            setSelectedQuiz(e.target.value);
            fetchQuestions(e.target.value);
          }}
          style={{ marginLeft: "10px", padding: "5px" }}
        >
          <option value="">Select a quiz</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </div>

      <button onClick={createSession} disabled={!selectedQuiz}>
        Create Session
      </button>
      
      {pin && (
        <div style={{ marginTop: "15px" }}>
          <p><strong>Session PIN:</strong> {pin}</p>
          <p><strong>Status:</strong> 
            <span style={{ 
              color: isConnected ? "green" : "red",
              fontWeight: "bold",
              marginLeft: "8px"
            }}>
              {status}
            </span>
          </p>

          {/* Session Controls */}
          {isConnected && (
            <div style={{
              marginTop: "15px",
              padding: "15px",
              backgroundColor: "#e9ecef",
              borderRadius: "8px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}>
              <button
                onClick={toggleLeaderboard}
                style={{
                  padding: "8px 16px",
                  backgroundColor: showLeaderboard ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {showLeaderboard ? "👁️ Hide Leaderboard" : "👁️ Show Leaderboard"}
              </button>
              
              <button
                onClick={endSession}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                ⏹️ End Session
              </button>
            </div>
          )}

          {/* Question Selection */}
          <div style={{ marginTop: "20px" }}>
            <label><strong>Select Question: </strong></label>
            <select 
              value={selectedQuestion || ""} 
              onChange={(e) => setSelectedQuestion(Number(e.target.value))}
              style={{ marginLeft: "10px", padding: "5px" }}
            >
              <option value="">Select a question</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text.length > 50 ? q.text.substring(0, 50) + "..." : q.text}
                </option>
              ))}
            </select>

            <button 
              onClick={createNewQuestion}
              style={{ marginLeft: "10px", padding: "5px 10px" }}
              disabled={!selectedQuiz}
            >
              + New Question
            </button>
          </div>

          {/* Push Question Button */}
          <button 
            onClick={pushQuestion}
            disabled={!isConnected || !selectedQuestion}
            style={{
              padding: "10px 20px",
              marginTop: "10px",
              opacity: (isConnected && selectedQuestion) ? 1 : 0.5,
              cursor: (isConnected && selectedQuestion) ? "pointer" : "not-allowed",
              backgroundColor: (isConnected && selectedQuestion) ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            Push Selected Question
          </button>

          {/* Teacher Leaderboard */}
          {isConnected && (
            <div style={{ marginTop: "20px" }}>
              <TeacherLeaderboard 
                leaderboard={leaderboard}
                isVisible={showLeaderboard}
                onToggleVisibility={toggleLeaderboard}
              />
            </div>
          )}

          {/* Timer Display */}
          {isConnected && questionTimer > 0 && (
            <div style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: questionTimer <= 10 ? "#f8d7da" : "#d1ecf1",
              border: `2px solid ${questionTimer <= 10 ? "#dc3545" : "#007bff"}`,
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <h3 style={{ 
                color: questionTimer <= 10 ? "#dc3545" : "#007bff",
                margin: "0 0 5px 0"
              }}>
                ⏰ Question Timer: {questionTimer}s
              </h3>
              <div style={{
                width: "100%",
                height: "10px",
                backgroundColor: "#e9ecef",
                borderRadius: "5px",
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${(questionTimer / (questions.find(q => q.id === selectedQuestion)?.time_limit || 30)) * 100}%`,
                  height: "100%",
                  backgroundColor: questionTimer <= 10 ? "#dc3545" : questionTimer <= 20 ? "#ffc107" : "#28a745",
                  transition: "width 1s linear, background-color 0.3s"
                }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}