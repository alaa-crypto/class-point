import React, { useEffect, useState, useRef } from "react";
import { QuizSocket } from "../utils/QuizSocket";
import Leaderboard, { LeaderboardEntry } from "../components/Leaderboard/Leaderboard"; // Import the component

interface Choice {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  choices: Choice[];
  time_limit: number;
}

const QuizPage: React.FC = () => {
  const [socket, setSocket] = useState<QuizSocket | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState<number>(0);
  const [status, setStatus] = useState<string>("Connecting...");
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); // ADD THIS LINE
  const socketRef = useRef<QuizSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (currentQuestion && !hasAnswered) {
      const timeLimit = currentQuestion.time_limit || 30;
      setTimeLeft(timeLimit);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [currentQuestion, hasAnswered]);

  const handleTimeUp = () => {
    if (!hasAnswered) {
      setHasAnswered(true);
      setStatus("Time's up! Waiting for next question...");
    }
  };

  // Reset states when new question arrives
  useEffect(() => {
    if (currentQuestion) {
      setHasAnswered(false);
      setStatus("Question received! Choose your answer.");
      setTimeLeft(currentQuestion.time_limit || 30);
      setLeaderboard([]); // Reset leaderboard for new question
    }
  }, [currentQuestion]);

  useEffect(() => {
    const participantId = localStorage.getItem("participant_id");
    const sessionPin = localStorage.getItem("session_pin");

    if (!participantId || !sessionPin) {
      setStatus("You must join first.");
      return;
    }

    if (socketRef.current) {
      console.log("🔌 WebSocket already exists, skipping creation");
      return;
    }

    console.log("🔍 QuizPage: Creating QuizSocket...");
    
    try {
      const quizSocket = new QuizSocket(`ws://127.0.0.1:8000/ws/session/${sessionPin}/`);
      socketRef.current = quizSocket;
      
      console.log("🔍 QuizPage: QuizSocket instance:", quizSocket);

      quizSocket.onOpen(() => {
        console.log("✅ QuizSocket connected");
        setStatus("Connected. Waiting for next question...");
        
        quizSocket.send({
          action: "join",
          participant_id: participantId,
        });
      });

      quizSocket.onMessage((msg: any) => {
        console.log("📩 Received message:", msg);

        if (msg && msg.type) {
          switch (msg.type) {
            case "question":
              console.log("✅ Student received question:", msg.question);
              setCurrentQuestion(msg.question);
              setStatus("Question received! Choose your answer.");
              break;

            case "score_update":
              console.log("📊 Score update:", msg.scoreboard);
              const participantId = localStorage.getItem("participant_id");
              if (participantId && msg.scoreboard) {
                const participant = msg.scoreboard.find((p: any) => p.participant_id == participantId);
                if (participant) {
                  setScore(participant.score);
                }
                
                // UPDATE: Process leaderboard data
                const rankedLeaderboard: LeaderboardEntry[] = msg.scoreboard
                  .sort((a: any, b: any) => b.score - a.score)
                  .map((participant: any, index: number) => ({
                    participant_id: participant.participant_id,
                    name: participant.name,
                    score: participant.score,
                    rank: index + 1
                  }));
                setLeaderboard(rankedLeaderboard);
              }
              break;

            case "end":
              setStatus("Quiz ended. Thanks for playing!");
              setCurrentQuestion(null);
              break;

            case "join_success":
              console.log("✅ Join successful");
              setStatus("Connected. Waiting for question...");
              break;

            case "error":
              console.error("WebSocket error:", msg.error);
              setStatus(`Error: ${msg.error}`);
              break;

            default:
              console.warn("Unknown message type:", msg.type, "Full message:", msg);
          }
        } else {
          console.warn("Received message without type:", msg);
        }
      });

      quizSocket.onClose(() => {
        console.log("🔌 QuizSocket closed");
        setStatus("Disconnected");
      });

      quizSocket.onError((error) => {
        console.error("❌ QuizSocket error:", error);
        setStatus("Connection error");
      });

      setSocket(quizSocket);

    } catch (error) {
      console.error("❌ QuizPage: Failed to create QuizSocket:", error);
      setStatus("Connection failed");
    }

    return () => {
      console.log("🔌 QuizPage unmounting - cleaning up WebSocket");
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const submitAnswer = (choiceId: number) => {
    const participantId = localStorage.getItem("participant_id");
    if (!socket || !participantId || hasAnswered || timeLeft <= 0) {
      return;
    }

    console.log("📤 Submitting answer:", { participant_id: participantId, choice_id: choiceId });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setHasAnswered(true);
    setStatus("Answer submitted! Waiting for results...");
    
    socket.send({
      action: "answer",
      participant_id: participantId,
      choice_id: choiceId,
    });
  };

  if (!currentQuestion)
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <h2>{status}</h2>
        <p>Score: {score}</p>
        {/* Show leaderboard even when no current question */}
        {leaderboard.length > 0 && (
          <div style={{ marginTop: '20px', maxWidth: '500px', margin: '20px auto' }}>
            <Leaderboard 
              leaderboard={leaderboard}
              currentParticipantId={localStorage.getItem('participant_id')}
              compact={false}
            />
          </div>
        )}
      </div>
    );

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      {/* Timer Display */}
      <div style={{
        position: 'relative',
        marginBottom: '20px'
      }}>
        <h2>{currentQuestion.text}</h2>
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          backgroundColor: timeLeft <= 10 ? '#dc3545' : '#007bff',
          color: 'white',
          padding: '5px 15px',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          minWidth: '60px'
        }}>
          {timeLeft}s
        </div>
      </div>

      <p style={{ 
        fontSize: "1.1rem",
        fontWeight: "bold",
        color: timeLeft <= 10 ? "#dc3545" : "#007bff"
      }}>
        {status}
      </p>
      
      {/* Progress bar for timer */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(timeLeft / (currentQuestion.time_limit || 30)) * 100}%`,
          height: '100%',
          backgroundColor: timeLeft <= 10 ? '#dc3545' : timeLeft <= 20 ? '#ffc107' : '#28a745',
          transition: 'width 1s linear, background-color 0.3s'
        }} />
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {currentQuestion.choices.map((choice) => (
          <li key={choice.id} style={{ margin: "10px 0" }}>
            <button
              onClick={() => submitAnswer(choice.id)}
              disabled={hasAnswered || timeLeft <= 0}
              style={{
                padding: "15px 25px",
                fontSize: "16px",
                borderRadius: "8px",
                cursor: (hasAnswered || timeLeft <= 0) ? "not-allowed" : "pointer",
                backgroundColor: (hasAnswered || timeLeft <= 0) ? "#6c757d" : "#007bff",
                color: "white",
                border: "none",
                opacity: (hasAnswered || timeLeft <= 0) ? 0.6 : 1,
                width: "80%",
                maxWidth: "400px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!hasAnswered && timeLeft > 0) {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
      
      <p style={{ marginTop: "20px", fontSize: "1.2rem" }}>
        Score: <strong>{score}</strong>
        {leaderboard.length > 0 && (
          <span style={{
            color: "#6c757d",
            marginLeft: "15px",
            fontSize: "1em"
          }}>
            Rank: #{leaderboard.find((p) => p.participant_id === parseInt(localStorage.getItem('participant_id') || '0'))?.rank || '--'}
          </span>
        )}
      </p>
      
      {/* ADD LEADERBOARD COMPONENT HERE */}
      {leaderboard.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <Leaderboard 
            leaderboard={leaderboard}
            currentParticipantId={localStorage.getItem('participant_id')}
            compact={true}
          />
        </div>
      )}

      {hasAnswered && timeLeft <= 0 && (
        <p style={{ 
          color: "#dc3545", 
          fontWeight: "bold", 
          marginTop: "10px",
          fontSize: "1.1rem"
        }}>
          ⏰ Time's up! Waiting for next question...
        </p>
      )}
    </div>
  );
};

export default QuizPage;