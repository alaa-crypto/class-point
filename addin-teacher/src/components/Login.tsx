import React, { useState } from "react";
import { setAccessToken } from "../components/token";

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await fetch("http://localhost:8000/api/auth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setAccessToken(data.access); // store globally
      onLogin(data.access);         // store in state for components
    } else {
      alert(data.detail || "Login failed");
    }
  };

  return (
    <div>
      <h2>Teacher Login</h2>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
