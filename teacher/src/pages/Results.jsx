import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';
import QuizMistakesModal from '../components/QuizMistakesModal';

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
  const [activeTab, setActiveTab] = useState('attempts'); // 'attempts' | 'students'
  const [attempts, setAttempts] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Modal state
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [attemptsRes, studentsRes, groupsRes] = await Promise.all([
        apiFetch(`${API_URL}/teacher/attempts`),
        apiFetch(`${API_URL}/results`),
        apiFetch(`${API_URL}/groups`),
      ]);

      if (attemptsRes.ok) {
        const attData = await attemptsRes.json();
        setAttempts(attData);
      }
      if (studentsRes.ok) {
        const studData = await studentsRes.json();
        setStudents(studData);
      }
      if (groupsRes && groupsRes.ok) {
        const grpData = await groupsRes.json();
        setGroups(grpData);
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
      const res = await apiFetch(`${API_URL}/teacher/attempts/${attemptItem.id}`);
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

  const handleResetAttempt = async (attemptItem) => {
    if (!attemptItem) return;
    const confirmMsg = `${attemptItem.student_name || "O'quvchi"}ning «${attemptItem.topic_title || 'test'}» bo'yicha topshirgan natijasini o'chirib, testni qaytadan topshirishiga ruxsat berasizmi?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      const res = await apiFetch(`${API_URL}/teacher/attempts/${attemptItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsModalOpen(false);
        setSelectedAttempt(null);
        fetchInitialData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Xatolik yuz berdi");
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    }
  };


  const filteredAttempts = attempts.filter((att) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (att.student_name || '').toLowerCase().includes(q) ||
      (att.topic_title || '').toLowerCase().includes(q) ||
      (att.block_title || '').toLowerCase().includes(q) ||
      (att.group_name || '').toLowerCase().includes(q);

    const matchesGroup =
      selectedGroup === 'all' || String(att.group_id) === String(selectedGroup);

    return matchesSearch && matchesGroup;
  });

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q) ||
      (s.group_name || '').toLowerCase().includes(q);
    const matchesGroup =
      selectedGroup === 'all' || String(s.group_id) === String(selectedGroup);
    return matchesSearch && matchesGroup;
  });

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

  const averagePercentage = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / attempts.length)
    : 0;

  const uniqueStudentIds = new Set(attempts.map(a => a.student_id)).size;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            O'zlashtirish va Test Natijalari
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            O'quvchilar tomonidan topshirilgan testlar, xatolar tahlili va umumiy reyting.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'attempts'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Topshirilgan testlar tarixi ({attempts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-ranking-star"></i>
            <span>O'quvchilar reytingi</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Jami topshirilgan testlar</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {attempts.length} <span className="text-xs font-normal text-gray-400">ta</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Test topshirgan o'quvchilar</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {uniqueStudentIds} <span className="text-xs font-normal text-gray-400">nafar</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">O'rtacha o'zlashtirish</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {averagePercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full max-w-sm">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder={activeTab === 'attempts' ? "O'quvchi yoki test nomini qidirish..." : "O'quvchini qidirish..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {groups.length > 0 && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
              >
                <option value="all">Barcha guruhlar</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">
            {activeTab === 'attempts' 
              ? `${filteredAttempts.length} ta natija topildi` 
              : `${filteredStudents.length} ta o'quvchi topildi`}
          </span>
        </div>

        {/* TAB 1: ATTEMPTS LIST TABLE */}
        {activeTab === 'attempts' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 mb-2"></i>
                <p>Natijalar yuklanmoqda...</p>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <i className="fa-solid fa-folder-open text-3xl mb-2 text-gray-400"></i>
                <p className="font-semibold">Topshirilgan testlar topilmadi.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4 font-semibold">O'quvchi</th>
                    <th className="p-4 font-semibold">Test / Mavzu</th>
                    <th className="p-4 font-semibold">Natija (To'g'ri / Xato)</th>
                    <th className="p-4 font-semibold text-center">Ball & Foiz</th>
                    <th className="p-4 font-semibold">Topshirilgan vaqt</th>
                    <th className="p-4 font-semibold text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {filteredAttempts.map((att) => {
                    let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300";
                    if (att.percentage < 56) {
                      badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300";
                    } else if (att.percentage < 80) {
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300";
                    }

                    return (
                      <tr
                        key={att.id}
                        onClick={() => handleOpenAttempt(att)}
                        className="hover:bg-indigo-50/30 dark:hover:bg-gray-700/40 transition cursor-pointer group"
                      >
                        {/* STUDENT */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 shadow-sm ${att.student_color || 'bg-indigo-100 text-indigo-600'}`}>
                              {att.student_initials || (att.student_name ? att.student_name.slice(0, 2).toUpperCase() : 'ST')}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {att.student_name}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {att.group_name || 'Guruhsiz'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* TOPIC & BLOCK */}
                        <td className="p-4">
                          <div className="max-w-xs">
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {att.topic_title}
                            </h5>
                            <span className="text-xs text-gray-400 block truncate">
                              {att.block_title}
                            </span>
                          </div>
                        </td>

                        {/* CORRECT / WRONG */}
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                              <i className="fa-solid fa-check mr-1"></i>{att.correct} to'g'ri
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                              <i className="fa-solid fa-xmark mr-1"></i>{att.incorrect} xato
                            </span>
                          </div>
                        </td>

                        {/* SCORE AND PERCENTAGE */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${badgeColor}`}>
                            {att.percentage}%
                          </span>
                          <span className="text-xs text-gray-400 block mt-1 font-medium">
                            {att.score}/{att.total} ball
                          </span>
                        </td>

                        {/* SUBMITTED DATE */}
                        <td className="p-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(att.created_at)}
                        </td>

                        {/* ACTIONS */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetAttempt(att);
                              }}
                              title="Natijani bekor qilish (Qayta topshirishga ruxsat)"
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/30 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center shadow-sm"
                            >
                              <i className="fa-solid fa-rotate-left"></i>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAttempt(att);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                            >
                              <i className="fa-solid fa-eye"></i>
                              <span>Xatolarni ko'rish</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: STUDENTS LEADERBOARD TABLE */}
        {activeTab === 'students' && (
          <div className="space-y-6 p-6">
            {/* TOP 3 PODIUM */}
            {!search && filteredStudents.length >= 2 && (
              <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/80 shadow-sm">
                <div className="text-center mb-5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1.5">
                    <i className="fa-solid fa-crown text-amber-500"></i>
                    Yetakchilar Shoxsupasi
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                    Eng yuqori XP ball to'plagan o'quvchilar
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-xl mx-auto pt-4">
                  {/* 2-O'RIN */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm sm:text-base flex items-center justify-center shadow border-2 border-slate-300 dark:border-slate-500">
                        {filteredStudents[1]?.initials || "2"}
                      </div>
                      <span className="absolute -top-2.5 -right-1 text-xs">🥈</span>
                    </div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white text-center truncate max-w-[90px] sm:max-w-[120px]">
                      {filteredStudents[1]?.name || "—"}
                    </h5>
                    <span className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                      {filteredStudents[1]?.score ?? 0} XP
                    </span>
                    <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/60 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center justify-center shadow-inner mt-2">
                      <span className="text-lg sm:text-xl font-black text-slate-500 dark:text-slate-300">2</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Kumush</span>
                    </div>
                  </div>

                  {/* 1-O'RIN */}
                  <div className="flex flex-col items-center -mt-4">
                    <div className="relative mb-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 font-black text-base sm:text-lg flex items-center justify-center shadow-lg border-4 border-amber-400">
                        {filteredStudents[0]?.initials || "1"}
                      </div>
                      <span className="absolute -top-3.5 -right-1 text-xl">👑</span>
                    </div>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mb-0.5">
                      Chempion
                    </span>
                    <h5 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white text-center truncate max-w-[100px] sm:max-w-[140px]">
                      {filteredStudents[0]?.name || "—"}
                    </h5>
                    <span className="text-xs sm:text-sm font-black text-amber-500 mt-0.5">
                      {filteredStudents[0]?.score ?? 0} XP
                    </span>
                    <div className="w-full h-28 sm:h-32 bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-amber-900/30 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-center shadow mt-2">
                      <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300">1</span>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">Oltin</span>
                    </div>
                  </div>

                  {/* 3-O'RIN */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-black text-sm sm:text-base flex items-center justify-center shadow border-2 border-orange-300 dark:border-orange-600">
                        {filteredStudents[2]?.initials || "3"}
                      </div>
                      <span className="absolute -top-2.5 -right-1 text-xs">🥉</span>
                    </div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white text-center truncate max-w-[90px] sm:max-w-[120px]">
                      {filteredStudents[2]?.name || "—"}
                    </h5>
                    <span className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                      {filteredStudents[2]?.score ?? 0} XP
                    </span>
                    <div className="w-full h-16 sm:h-20 bg-gradient-to-t from-orange-200 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 rounded-t-2xl border-t-4 border-orange-400 flex flex-col items-center justify-center shadow-inner mt-2">
                      <span className="text-lg sm:text-xl font-black text-orange-600 dark:text-orange-400">3</span>
                      <span className="text-[9px] font-bold text-orange-500 uppercase">Bronza</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4 font-semibold text-center w-16">Reyting</th>
                    <th className="p-4 font-semibold">O'quvchi</th>
                    <th className="p-4 font-semibold">Guruh</th>
                    <th className="p-4 font-semibold">Daraja</th>
                    <th className="p-4 font-semibold text-center">Aniqlik</th>
                    <th className="p-4 font-semibold text-center">Bajarilgan</th>
                    <th className="p-4 font-semibold text-right">To'plangan XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {filteredStudents.map((student, idx) => {
                    const level = student.level_info?.level || 1;
                    const meta = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

                    let medal = null;
                    if (student.rank === 1 || (!student.rank && idx === 0)) medal = "🥇";
                    else if (student.rank === 2 || (!student.rank && idx === 1)) medal = "🥈";
                    else if (student.rank === 3 || (!student.rank && idx === 2)) medal = "🥉";

                    return (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="p-4 text-center">
                          {medal ? (
                            <span className="text-xl">{medal}</span>
                          ) : (
                            <span className="w-8 h-8 mx-auto rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center text-xs">
                              {student.rank || (idx + 1)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-xs shadow-sm ${student.color || 'bg-indigo-100 text-indigo-600'}`}>
                              {student.initials}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-gray-100">{student.name}</h4>
                              <span className="text-xs text-gray-400">@{student.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-300">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {student.group_name || `Guruh #${student.group_id}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${meta.badgeBg}`}>
                            <i className={`fa-solid ${meta.icon}`}></i>
                            <span>{student.level_info?.title || meta.title}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {student.accuracy_pct ?? 0}%
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                          <span>{student.completed_lessons ?? 0} dars</span> · <span>{student.completed_quizzes ?? 0} test</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-black text-gray-900 dark:text-white text-lg">{student.score}</span>
                          <span className="text-amber-500 font-bold text-xs ml-1">XP</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center p-8 text-gray-500">
                        O'quvchilar topilmadi yoki baza bo'sh.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MISTAKES & DETAIL REVIEW MODAL */}
      <QuizMistakesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAttempt(null);
        }}
        attempt={selectedAttempt}
        onResetAttempt={handleResetAttempt}
      />
    </div>
  );
};

export default Results;
