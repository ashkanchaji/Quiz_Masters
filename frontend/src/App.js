// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import ManagementPage from './pages/ManagementPage';
import GameSessionPage from './pages/GameSessionPage';
import QuizPage from './pages/QuizPage';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/game/:sessionId" element={<GameSessionPage />} />
          <Route path="/game/:sessionId/quiz" element={<QuizPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;