import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Database from './pages/Database';
import Results from './pages/Results';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LessonViewer from './pages/LessonViewer';
import AppSplashScreen from './components/AppSplashScreen';

import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('student_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('student_user');
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'student_user') {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
    <>
      {showSplash && (
        <AppSplashScreen 
          title="O'quvchi Paneli" 
          onFinish={() => setShowSplash(false)} 
        />
      )}
      <ErrorBoundary>
        <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />

        <Route path="/" element={<ProtectedRoute user={user}><MainLayout onLogout={handleLogout} /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="database" element={<Database />} />
          <Route path="blocks/:id" element={<LessonViewer />} />
          <Route path="results" element={<Results />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ErrorBoundary>
    </>
  );
}

export default App;