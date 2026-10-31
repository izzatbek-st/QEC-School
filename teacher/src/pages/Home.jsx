import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';

const Home = () => {
  const [stats, setStats] = useState({
    students: 0,
    groups: 0,
    blocks: 0,
    avg_score: 0
  });
  const [profile, setProfile] = useState({ name: "O'qituvchi" });
  
  useEffect(() => {
    apiFetch(`${API_URL}/dashboard`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
      
    apiFetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Xush kelibsiz, <span id="welcome-name">{profile.name.split(' ')[0]}</span>! 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bugungi darslar va guruhlaringiz ko'rsatkichlari bilan tanishing.</p>
      </div>

      {/* Statistika grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mening o'quvchilarim</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.students}</h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full inline-block mt-2">Faol qatnashuv</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-users"></i>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Faol guruhlar</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.groups}</h3>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full inline-block mt-2">Darslar</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-user-group"></i>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Yaratilgan bloklar</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.blocks}</h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full inline-block mt-2">Baza moduli</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-database"></i>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">O'rtacha o'zlashtirish</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.avg_score}%</h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full inline-block mt-2">Reyting</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-chart-line"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bugungi Dars Jadvali</h3>
            <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">Tizimda ulanmagan</span>
          </div>
          <div className="space-y-3">
             <p className="text-sm text-gray-500">Tez orada o'quv markazi jadvali shu yerda chiqadi.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tezkor Amallar</h3>
          <div className="space-y-3">
            <Link to="/database" className="w-full flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium text-sm transition">
              <span className="flex items-center space-x-2"><i className="fa-solid fa-circle-plus"></i><span>Yangi mavzu bloki yaratish</span></span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </Link>
            <Link to="/groups" className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium text-sm transition">
              <span className="flex items-center space-x-2"><i className="fa-solid fa-user-group"></i><span>Guruhlarni boshqarish</span></span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </Link>
            <Link to="/results" className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium text-sm transition">
              <span className="flex items-center space-x-2"><i className="fa-solid fa-trophy"></i><span>Natijalarni kiritish</span></span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
