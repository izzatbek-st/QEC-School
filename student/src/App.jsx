import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Database from './pages/Database';
import Results from './pages/Results';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LessonViewer from './pages/LessonViewer';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('student_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('student_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('student_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('student_user');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />

      <Route path="/" element={<ProtectedRoute user={user}><MainLayout onLogout={handleLogout} /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="database" element={<Database />} />
        <Route path="blocks/:id" element={<LessonViewer />} />
        <Route path="results" element={<Results />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
