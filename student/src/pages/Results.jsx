import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';
import QuizMistakesModal from '../components/QuizMistakesModal';

const Results = () => {
  const [activeTab, setActiveTab] = useState('attempts'); // 'attempts' | 'leaderboard'
  const [attempts, setAttempts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attemptsRes, leaderRes] = await Promise.all([
        apiFetch(`${API_URL}/student/my-attempts`),
        apiFetch(`${API_URL}/results/leaderboard`),
      ]);

      if (attemptsRes.ok) {
        const attData = await attemptsRes.json();
        setAttempts(attData);
      }

      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setStudents(leaderData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttempt = async (attemptItem) => {
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`${API_URL}/student/my-attempts/${attemptItem.id}`);
      if (res.ok) {
        const fullDetail = await res.json();
        setSelectedAttempt(fullDetail);
        setIsModalOpen(true);
      } else {
        // Fallback to basic item if detail fails
        setSelectedAttempt(attemptItem);
        setIsModalOpen(true);
      }
    } catch (e) {
      setSelectedAttempt(attemptItem);
      setIsModalOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredAttempts = attempts.filter((att) => {
    const q = search.toLowerCase();
    return (
      (att.topic_title || '').toLowerCase().includes(q) ||
      (att.block_title || '').toLowerCase().includes(q)
    );
  });

  const totalScore = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
  const averagePercentage = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / attempts.length) 
    : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Natijalar va Reyting
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Topshirilgan testlar tarixi, xatolar tahlili va umumiy reyting ko'rsatkichlari.
          </p>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'attempts'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Topshirilgan testlarim ({attempts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-ranking-star"></i>
            <span>Umumiy reyting</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ATTEMPTS HISTORY */}
      {activeTab === 'attempts' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-list-check"></i>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Topshirilgan testlar</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {attempts.length} <span className="text-xs font-normal text-gray-400">ta</span>
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-award"></i>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Jami to'plangan ball</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {totalScore} <span className="text-xs font-normal text-gray-400">ball</span>
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">O'rtacha ko'rsatkich</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {averagePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* ATTEMPTS LIST CONTAINER */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Test yoki blok nomini qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Ko'rsatilmoqda: <strong>{filteredAttempts.length}</strong> ta test
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 mb-2"></i>
                <p>Natijalar yuklanmoqda...</p>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-2xl mx-auto">
                  <i className="fa-solid fa-clipboard-question"></i>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Topshirilgan testlar mavjud emas
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Hali hech qanday test topshirmagansiz. Darslar bo'limiga o'tib, mavzulardagi testlarni yechishingiz mumkin.
                </p>
                <Link
                  to="/database"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-md shadow-indigo-600/20"
                >
                  <i className="fa-solid fa-book-open"></i>
                  <span>Darslarga o'tish</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAttempts.map((att) => {
                  let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300";
                  if (att.percentage < 56) {
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300";
                  } else if (att.percentage < 80) {
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300";
                  }

                  return (
                    <div
                      key={att.id}
                      onClick={() => handleOpenAttempt(att)}
                      className="p-4 sm:p-5 hover:bg-indigo-50/40 dark:hover:bg-gray-700/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                          <i className="fa-solid fa-file-circle-check"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {att.block_title}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <i className="fa-regular fa-clock text-[10px]"></i>
                              {formatDate(att.created_at)}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {att.topic_title}
                          </h4>
                        </div>
                      </div>

                      {/* STATS BADGES & BUTTON */}
                      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap">
                        {/* CORRECT / WRONG COUNTERS */}
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/40">
                            <i className="fa-solid fa-check"></i> {att.correct} to'g'ri
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 flex items-center gap-1 border border-rose-200 dark:border-rose-900/40">
                            <i className="fa-solid fa-xmark"></i> {att.incorrect} xato
                          </span>
                        </div>

                        {/* SCORE AND PERCENTAGE */}
                        <div className="text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeColor}`}>
                            {att.percentage}%
                          </span>
                          <span className="text-xs text-gray-400 block font-medium mt-0.5">
                            {att.score}/{att.total} ball
                          </span>
                        </div>

                        {/* OPEN MISTAKES BUTTON */}
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-indigo-600 hover:text-white dark:bg-gray-700 dark:hover:bg-indigo-600 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Xatolarni ko'rish</span>
                          <i className="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top O'quvchilar Reytingi</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Umumiy ballar bo'yicha saralangan ro'yxat.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              Jami: {students.length} o'quvchi
            </span>
          </div>
          
          {loading ? (
            <p className="text-gray-500 py-6 text-center">Yuklanmoqda...</p>
          ) : students.length > 0 ? (
            <div className="space-y-3">
              {students.map((student, idx) => {
                let badgeColor = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
                if (idx === 0) badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
                else if (idx === 1) badgeColor = "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200";
                else if (idx === 2) badgeColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

                let gradeText = "Yaxshi";
                let gradeBadge = "bg-blue-50 text-blue-600";
                if (student.score >= 86) {
                  gradeText = "A'lo";
                  gradeBadge = "bg-emerald-50 text-emerald-600";
                } else if (student.score < 56) {
                  gradeText = "Qoniqarsiz";
                  gradeBadge = "bg-rose-50 text-rose-600";
                }

                return (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50/70 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition">
                    <div className="flex items-center space-x-4">
                      <span className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-xs shadow-sm ${badgeColor}`}>
                        {idx + 1}
                      </span>
                      <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${student.color || 'bg-indigo-100 text-indigo-600'}`}>
                        {student.initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{student.name}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{student.group_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-extrabold text-gray-900 dark:text-white text-base">{student.score}</span>
                        <span className="text-xs text-gray-400 ml-1">ball</span>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full dark:bg-opacity-30 ${gradeBadge}`}>
                        {gradeText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">Hozircha natijalar yo'q.</p>
          )}
        </div>
      )}

      {/* MISTAKES & REVIEW MODAL */}
      <QuizMistakesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAttempt(null);
        }}
        attempt={selectedAttempt}
      />
    </div>
  );
};

export default Results;
