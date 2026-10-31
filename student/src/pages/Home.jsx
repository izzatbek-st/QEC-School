import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch, getStudentId } from '../api';

const Home = () => {
  const [data, setData] = useState({
    student: { name: 'O\'quvchi', score: 0, group_name: '' },
    stats: { active_blocks: 0, completed_tasks: 0, total_score: 0, rank: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    apiFetch(`${API_URL}/student/${studentId}/dashboard`)
      .then(res => {
        if (!res.ok) {
          throw new Error("O'quvchi ma'lumotlari topilmadi (Baza bo'sh bo'lishi mumkin)");
        }
        return res.json();
      })
      .then(fetchedData => {
        setData(fetchedData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center border border-red-100 dark:border-red-800">
        <i className="fa-solid fa-triangle-exclamation text-3xl mb-3"></i>
        <h3 className="text-lg font-bold">Xatolik yuz berdi</h3>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-4 text-gray-500 dark:text-gray-400">
          Iltimos, avval O'qituvchi panelida guruh va ushbu guruhga kamida 1 ta o'quvchi qo'shing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Xush kelibsiz, <span className="text-indigo-600 dark:text-indigo-400">{data.student?.name}</span>! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sizning joriy o'zlashtirish ko'rsatkichlaringiz.</p>
        <div className="mt-2 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 inline-block px-3 py-1 rounded-full">
          Guruh: {data.student?.group_name}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ruxsat etilgan bloklar</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.active_blocks} ta</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-book-open"></i>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Umumiy ball</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.total_score}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-star"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reyting</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">#{data.stats?.rank}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-trophy"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Menga ruxsat etilgan mavzu bloklari</h3>
            <Link to="/database" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Barchasini ko'rish &rarr;</Link>
          </div>
          <p className="text-sm text-gray-500">Mavzular bazasi bo'limiga o'tib, o'zingizga ochilgan darslar va testlarni ko'rishingiz mumkin.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
