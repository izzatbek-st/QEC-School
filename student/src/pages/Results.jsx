import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch, getStudentId } from '../api';
import QuizMistakesModal from '../components/QuizMistakesModal';
import LoadingScreen from '../components/LoadingScreen';

const LEVEL_CONFIG = {
  1: {
    title: "Boshlang'ich",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: "fa-seedling"
  },
  2: {
    title: "Izlanuvchi",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: "fa-compass"
  },
  3: {
    title: "Bilimdon",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: "fa-graduation-cap"
  },
  4: {
    title: "Mutaxassis",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: "fa-award"
  },
  5: {
    title: "Grandmaster",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: "fa-crown"
  }
};

const Results = () => {
  const [activeTab, setActiveTab] = useState('attempts'); // 'attempts' | 'leaderboard'
  const [attempts, setAttempts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'my_group'
  const currentStudentId = getStudentId();

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

  const currentStudent = students.find(s => s.id === currentStudentId);

  const filteredAttempts = attempts.filter((att) => {
    const q = search.toLowerCase();
    return (
      (att.topic_title || '').toLowerCase().includes(q) ||
      (att.block_title || '').toLowerCase().includes(q)
    );
  });

  // Filter students based on scope (all vs my group) and search
  const visibleStudents = students.filter((s) => {
    if (filterScope === 'my_group' && currentStudent) {
      if (s.group_id !== currentStudent.group_id) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.group_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const top1 = visibleStudents[0];
  const top2 = visibleStudents[1];
  const top3 = visibleStudents[2];

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
    <div className="space-y-6 max-w-7xl mx-auto">
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
            onClick={() => { setActiveTab('attempts'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'attempts'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Testlarim ({attempts.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('leaderboard'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-trophy"></i>
            <span>Reyting jadvali</span>
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
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">O'rtacha to'g'ri ishlash</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {averagePercentage}%
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Jami to'g'ri javoblar</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {totalScore} <span className="text-xs font-normal text-gray-400">ta</span>
                </span>
              </div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Test yoki blok nomi bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          {/* ATTEMPTS LIST */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <LoadingScreen message="Test natijalari yuklanmoqda..." />
            ) : filteredAttempts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                  <i className="fa-solid fa-clipboard-question"></i>
                </div>
                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">Test natijalari topilmadi</h4>
                <p className="text-xs text-gray-500 mt-1">Siz hali birorta ham test topshirmagansiz yoki qidiruvga mos natija yo'q.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAttempts.map((att) => {
                  const passingScore = att.passing_score ?? 70;
                  const isPassed = (att.percentage ?? 0) >= passingScore;
                  return (
                    <div
                      key={att.id}
                      onClick={() => handleOpenAttempt(att)}
                      className="p-5 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                            isPassed
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40'
                          }`}
                        >
                          <i className={`fa-solid ${isPassed ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {att.block_title || "Umumiy blok"}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              }`}
                            >
                              {isPassed ? "O'tdi" : "O'tmadi"}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                            {att.topic_title}
                          </h4>
                          <span className="text-xs text-gray-400 block mt-0.5">
                            Topshirildi: {formatDate(att.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-gray-900 dark:text-white">
                              {att.correct ?? att.score} / {att.total_questions}
                            </span>
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                isPassed
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                              }`}
                            >
                              {att.percentage}%
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block">
                            O'tish chegarasi: {passingScore}%
                          </span>
                        </div>

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
        <div className="space-y-6">
          {/* FILTER CONTROLS & SEARCH */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Ko'rish:</span>
              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  filterScope === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                <i className="fa-solid fa-globe mr-1.5"></i>
                Barcha o'quvchilar ({students.length})
              </button>
              {currentStudent?.group_name && (
                <button
                  type="button"
                  onClick={() => setFilterScope('my_group')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    filterScope === 'my_group'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <i className="fa-solid fa-user-group mr-1.5"></i>
                  Mening guruhim ({currentStudent.group_name})
                </button>
              )}
            </div>

            <div className="relative min-w-[260px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="O'quvchini qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          {/* MY RANK STICKY BANNER */}
          {currentStudent && (
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/60 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
                  #{currentStudent.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Sizning joriy o'rningiz
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Guruh: {currentStudent.group_name}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    {currentStudent.name}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">To'plangan XP</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">
                    {currentStudent.score} <span className="text-xs text-amber-500 font-bold">XP</span>
                  </span>
                </div>
                <div className="text-right border-l border-gray-200 dark:border-gray-700 pl-4">
                  <span className="text-xs text-gray-400 block font-medium">Aniqlik</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {currentStudent.accuracy_pct || 0}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TOP 3 PODIUM / SHOXSUPA */}
          {!search && visibleStudents.length >= 2 && (
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-sm">
              <div className="text-center mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-crown text-amber-500"></i>
                  Yetakchilar Shoxsupasi
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  Eng yuqori natija ko'rsatgan o'quvchilar
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-6">
                {/* 2-O'RIN (KUMUSH) */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-base sm:text-lg flex items-center justify-center shadow-md border-2 border-slate-300 dark:border-slate-500">
                      {top2?.initials || "2"}
                    </div>
                    <span className="absolute -top-3 -right-1 w-7 h-7 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center shadow">
                      🥈
                    </span>
                  </div>
                  <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white text-center truncate max-w-[100px] sm:max-w-[130px]">
                    {top2?.name || "—"}
                  </h5>
                  <span className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[90px]">
                    {top2?.group_name || ""}
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {top2?.score ?? 0} XP
                  </span>
                  {/* Pedestal */}
                  <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/60 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center justify-center shadow-inner mt-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-500 dark:text-slate-300">2</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kumush</span>
                  </div>
                </div>

                {/* 1-O'RIN (OLTIN) */}
                <div className="flex flex-col items-center -mt-6">
                  <div className="relative mb-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 font-black text-lg sm:text-xl flex items-center justify-center shadow-xl border-4 border-amber-400 animate-pulse">
                      {top1?.initials || "1"}
                    </div>
                    <span className="absolute -top-4 -right-1 text-2xl">
                      👑
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mb-1">
                    Chempion
                  </span>
                  <h5 className="font-black text-xs sm:text-base text-gray-900 dark:text-white text-center truncate max-w-[110px] sm:max-w-[150px]">
                    {top1?.name || "—"}
                  </h5>
                  <span className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[100px]">
                    {top1?.group_name || ""}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-500 mt-1">
                    {top1?.score ?? 0} XP
                  </span>
                  {/* Pedestal */}
                  <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-amber-900/30 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-center shadow-md mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-300">1</span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Oltin</span>
                  </div>
                </div>

                {/* 3-O'RIN (BRONZA) */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-black text-base sm:text-lg flex items-center justify-center shadow-md border-2 border-orange-300 dark:border-orange-600">
                      {top3?.initials || "3"}
                    </div>
                    <span className="absolute -top-3 -right-1 w-7 h-7 rounded-full bg-orange-300 text-orange-900 text-xs font-black flex items-center justify-center shadow">
                      🥉
                    </span>
                  </div>
                  <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white text-center truncate max-w-[100px] sm:max-w-[130px]">
                    {top3?.name || "—"}
                  </h5>
                  <span className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[90px]">
                    {top3?.group_name || ""}
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {top3?.score ?? 0} XP
                  </span>
                  {/* Pedestal */}
                  <div className="w-full h-20 sm:h-22 bg-gradient-to-t from-orange-200 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 rounded-t-2xl border-t-4 border-orange-400 flex flex-col items-center justify-center shadow-inner mt-2">
                    <span className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400">3</span>
                    <span className="text-[10px] font-bold text-orange-500 uppercase">Bronza</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEADERBOARD TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">To'liq Reyting Ro'yxati</h4>
                <p className="text-xs text-gray-400 mt-0.5">Ballar (XP), aniqlik va topshirilgan topshiriqlar bo'yicha</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {visibleStudents.length} ta o'quvchi
              </span>
            </div>

            {loading ? (
              <LoadingScreen message="Reyting ro'yxati yuklanmoqda..." />
            ) : visibleStudents.length === 0 ? (
              <p className="text-gray-500 py-12 text-center">O'quvchilar topilmadi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-gray-700/30 text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      <th className="py-3 px-4 font-bold text-center w-14">O'rin</th>
                      <th className="py-3 px-4 font-bold">O'quvchi</th>
                      <th className="py-3 px-4 font-bold">Daraja</th>
                      <th className="py-3 px-4 font-bold text-center">Aniqlik</th>
                      <th className="py-3 px-4 font-bold text-center">Vazifalar</th>
                      <th className="py-3 px-4 font-bold text-right">To'plangan XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
                    {visibleStudents.map((student, idx) => {
                      const isMe = student.id === currentStudentId;
                      const level = student.level_info?.level || 1;
                      const meta = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

                      let medal = null;
                      if (student.rank === 1) medal = "🥇";
                      else if (student.rank === 2) medal = "🥈";
                      else if (student.rank === 3) medal = "🥉";

                      return (
                        <tr
                          key={student.id}
                          className={`transition ${
                            isMe 
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 font-semibold' 
                              : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          {/* RANK */}
                          <td className="py-4 px-4 text-center">
                            {medal ? (
                              <span className="text-xl" title={`${student.rank}-o'rin`}>{medal}</span>
                            ) : (
                              <span className="w-7 h-7 mx-auto rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-black flex items-center justify-center">
                                {student.rank}
                              </span>
                            )}
                          </td>

                          {/* STUDENT INFO */}
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-xs shrink-0 shadow-sm ${student.color || 'bg-indigo-100 text-indigo-600'}`}>
                                {student.initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                    {student.name}
                                  </h4>
                                  {isMe && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-600 text-white">
                                      Siz
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {student.group_name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* LEVEL BADGE */}
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${meta.badgeBg}`}>
                              <i className={`fa-solid ${meta.icon}`}></i>
                              <span>{student.level_info?.title || meta.title}</span>
                            </span>
                          </td>

                          {/* ACCURACY */}
                          <td className="py-4 px-4 text-center">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              {student.accuracy_pct || 0}%
                            </span>
                          </td>

                          {/* COMPLETED TASKS */}
                          <td className="py-4 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{student.completed_lessons || 0} dars</span> · <span>{student.completed_quizzes || 0} test</span>
                          </td>

                          {/* XP SCORE */}
                          <td className="py-4 px-4 text-right">
                            <span className="text-base font-black text-gray-900 dark:text-white">
                              {student.score}
                            </span>
                            <span className="text-xs font-bold text-amber-500 ml-1">XP</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
