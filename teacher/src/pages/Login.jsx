import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    fetch(`${API_URL.replace('/teacher', '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(async res => {
      const text = await res.text();
      if (!text) {
        if (!res.ok) {
          throw new Error('Server javob bermadi. Backend ishlamayapti yoki ulanish uzildi.');
        }
        return {};
      }

      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          throw new Error(data.detail || data.message || 'Login yoki parol noto\'g\'ri');
        }
        return data;
      } catch {
        if (text.toLowerCase().includes('<html')) {
          throw new Error('Serverdan HTML javob qaytdi. Backend yoki reverse proxy ishlamayapti.');
        }
        throw new Error('Serverdan noto\'g\'ri javob formatida ma\'lumot keldi.');
      }
    })
    .then(data => {
      if (data.role === 'teacher') {
        onLogin(data);
        navigate('/');
      } else if (data.role) {
        setError("Siz o'qituvchi emassiz! O'quvchi panelidan kiring.");
      }
    })
    .catch(err => {
      setError(err.message || 'Xatolik yuz berdi');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
            <span className="text-white font-bold text-2xl">EM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduMaster ga kirish</h1>
          <p className="text-sm text-gray-500 mt-2">O'qituvchi paneli</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login yoki Email</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              placeholder="admin"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]">
            Tizimga kirish
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
