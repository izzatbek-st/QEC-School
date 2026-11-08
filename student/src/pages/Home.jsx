import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch, getStudentId } from '../api';

const LEVEL_CONFIG = {
  1: {
    title: "Boshlang'ich",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    barGradient: "from-emerald-500 to-teal-500",
    icon: "fa-seedling"
  },
  2: {
    title: "Izlanuvchi",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    barGradient: "from-blue-500 to-cyan-500",
    icon: "fa-compass"
  },
  3: {
    title: "Bilimdon",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    barGradient: "from-purple-500 to-indigo-500",
    icon: "fa-graduation-cap"
  },
  4: {
    title: "Mutaxassis",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    barGradient: "from-amber-500 to-orange-500",
    icon: "fa-award"
  },
  5: {
    title: "Grandmaster",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    barGradient: "from-rose-500 to-pink-500",
    icon: "fa-crown"
  }
};

const Home = () => {
  const [data, setData] = useState({
    student: { name: "O'quvchi", score: 0, group_name: '' },
    stats: { 
      active_blocks: 0, 
      completed_tasks: 0, 
      completed_lessons: 0, 
      completed_quizzes: 0, 
      accuracy_pct: 0, 
      total_score: 0, 
      rank: 1, 
      group_rank: 1, 
      total_students: 1 
    },
    level_info: {
      level: 1,
      title: "Boshlang'ich",
      badge_color: "emerald",
      icon: "fa-seedling",
      current_xp: 0,
      min_xp: 0,
      max_xp: 100,
      next_level_xp: 101,
      xp_needed: 101,
      progress_pct: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    apiFetch(`${API_URL}/student/${studentId}/dashboard`)
      .then(res => {
        if (!res.ok) {
          throw new Error("O'quvchi ma'lumotlari topilmadi");
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
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-3">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
        <span>Ko'rsatkichlar yuklanmoqda...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-3xl text-center border border-red-100 dark:border-red-800">
        <i className="fa-solid fa-triangle-exclamation text-3xl mb-3"></i>
        <h3 className="text-lg font-bold">Xatolik yuz berdi</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const level = data.level_info?.level || 1;
  const levelMeta = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  const progressPct = Math.min(100, Math.max(0, data.level_info?.progress_pct ?? 0));
  const currentXp = data.stats?.total_score || 0;
  const nextXp = data.level_info?.next_level_xp;
  const xpNeeded = data.level_info?.xp_needed;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* WELCOME HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-12 top-6 text-white/10 text-8xl pointer-events-none">
          <i className={`fa-solid ${levelMeta.icon}`}></i>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20">
                <i className="fa-solid fa-user-group mr-1.5"></i>
                {data.student?.group_name || "Guruh biriktirilmagan"}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 border border-amber-300/40 text-amber-200 flex items-center gap-1.5">
                <i className={`fa-solid ${levelMeta.icon}`}></i>
                Daraja {level}: {data.level_info?.title || levelMeta.title}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Xush kelibsiz, <span>{data.student?.name}</span>! 👋
            </h1>
            <p className="text-sm text-indigo-100/80 mt-1 max-w-xl">
              Platformadagi darslarni o'zlashtiring, testlarni yeching va XP ballaringizni oshirib yangi darajalarga ko'tariling.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/database"
              className="px-5 py-3 rounded-2xl bg-white text-indigo-900 font-bold text-sm shadow-lg shadow-black/10 hover:bg-indigo-50 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-play text-xs"></i>
              <span>Darslarni boshlash</span>
            </Link>
            <Link
              to="/results"
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition flex items-center gap-2"
            >
              <i className="fa-solid fa-ranking-star text-xs"></i>
              <span>Reyting</span>
            </Link>
          </div>
        </div>
      </div>

      {/* GAMIFIED XP & LEVEL PROGRESS CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${levelMeta.badgeBg}`}>
              <i className={`fa-solid ${levelMeta.icon}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Daraja {level} — {data.level_info?.title || levelMeta.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  {currentXp} XP
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {level === 5
                  ? "Siz platformadagi eng yuqori darajaga yetgansiz! Siz afsonaviy Grandmastersiz! 👑"
                  : `Keyingi daraja («${LEVEL_CONFIG[level + 1]?.title || 'Keyingi'}»)gacha yana ${xpNeeded || 0} XP kerak`}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 block">Joriy ko'rsatkich</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {progressPct}%
            </span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1.5">
          <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${levelMeta.barGradient} transition-all duration-700 shadow-sm`}
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-medium">
            <span>{data.level_info?.min_xp ?? 0} XP</span>
            <span>
              {nextXp ? `${nextXp} XP (Keyingi bosqich)` : 'Maksimal daraja'}
            </span>
          </div>
        </div>

        {/* XP EARNING HINTS */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
            <i className="fa-solid fa-book-open text-indigo-500"></i>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">+20 XP</span>
              <span className="text-gray-500 dark:text-gray-400">Dars o'qish</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-500"></i>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">+10 XP</span>
              <span className="text-gray-500 dark:text-gray-400">Har bir to'g'ri javob</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
            <i className="fa-solid fa-bolt text-amber-500"></i>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">+30 XP</span>
              <span className="text-gray-500 dark:text-gray-400">Testdan o'tish</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
            <i className="fa-solid fa-star text-purple-500"></i>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block">+50 XP</span>
              <span className="text-gray-500 dark:text-gray-400">100% mukammal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total XP */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Umumiy ball</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {data.stats?.total_score || 0} <span className="text-xs font-bold text-amber-500">XP</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.level_info?.title || levelMeta.title}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-amber-100 dark:border-amber-800/40">
            <i className="fa-solid fa-star"></i>
          </div>
        </div>

        {/* Card 2: Rank */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reytingdagi o'rin</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              #{data.stats?.rank || 1}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Guruhda: #{data.stats?.group_rank || 1} (Jami {data.stats?.total_students || 1} ta)
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-blue-100 dark:border-blue-800/40">
            <i className="fa-solid fa-trophy"></i>
          </div>
        </div>

        {/* Card 3: Accuracy */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">O'rtacha aniqlik</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {data.stats?.accuracy_pct || 0}%
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              To'g'ri yechilgan javoblar
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-emerald-100 dark:border-emerald-800/40">
            <i className="fa-solid fa-bullseye"></i>
          </div>
        </div>

        {/* Card 4: Tasks Done */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Bajarilgan vazifalar</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {data.stats?.completed_tasks || 0} ta
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.stats?.completed_lessons || 0} dars · {data.stats?.completed_quizzes || 0} test
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-purple-100 dark:border-purple-800/40">
            <i className="fa-solid fa-circle-check"></i>
          </div>
        </div>
      </div>

      {/* QUICK NAVIGATION TILES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          to="/database"
          className="group bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition duration-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 transition duration-200">
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                Mavzular bazasi
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ruxsat etilgan {data.stats?.active_blocks || 0} ta blokdagi dars va testlarni o'tish
              </p>
            </div>
          </div>
          <i className="fa-solid fa-arrow-right text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition duration-200"></i>
        </Link>

        <Link
          to="/results"
          className="group bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition duration-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition duration-200">
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                Top o'quvchilar reytingi
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Poyezd / shoxsupa va guruhdoshlar o'rtasidagi o'rinlarni ko'rish
              </p>
            </div>
          </div>
          <i className="fa-solid fa-arrow-right text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition duration-200"></i>
        </Link>
      </div>
    </div>
  );
};

export default Home;
