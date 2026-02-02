import React, { useState } from "react";
import Login from "./components/Login";
import SessionPanel from "./components/SessionPanel";

function App() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) return <Login onLogin={setToken} />;
  return <SessionPanel />;
}

export default App;
