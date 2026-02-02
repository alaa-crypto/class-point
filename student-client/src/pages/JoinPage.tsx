// student-client/src/pages/JoinPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const JoinPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = async () => {
    setError("");

    if (!username.trim() || !pin.trim()) {
      setError("Username and PIN are required");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/participants/join/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username.trim(), // CHANGED: 'username' → 'name' to match backend serializer
          pin: pin.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.errors?.pin || data.errors?.name || data.detail || "Failed to join");
        return;
      }

      console.log("Joined successfully:", data);

      // Save participant info
      localStorage.setItem("participant_id", data.participant.id);
      localStorage.setItem("session_pin", pin.trim());
      localStorage.setItem("participant_name", username.trim());

      navigate("/quiz");
    } catch (err) {
      console.error("Join error:", err);
      setError("Network error, please try again");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
      <h1>Join Quiz</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="text"
        placeholder="Your Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: "block", margin: "10px auto", padding: "8px", width: "100%" }}
      />

      <input
        type="text"
        placeholder="Quiz PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ display: "block", margin: "10px auto", padding: "8px", width: "100%" }}
      />

      <button
        onClick={handleJoin}
        style={{
          padding: "10px 20px",
          marginTop: "15px",
          cursor: "pointer",
          borderRadius: "6px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
        }}
      >
        Join
      </button>
    </div>
  );
};

export default JoinPage;