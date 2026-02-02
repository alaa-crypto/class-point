// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import JoinPage from "./pages/JoinPage";
import QuizPage from "./pages/QuizPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/quiz" element={<QuizPage />} />
      </Routes>
    </Router>
  );
};

export default App;