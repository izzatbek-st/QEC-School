import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'score', 'recent'

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = () => {
    setLoading(true);
    apiFetch(`${API_URL}/students`)
      .then(res => res.json())
      .then(data => {
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchGroups = () => {
    apiFetch(`${API_URL}/groups`)
      .then(res => res.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    const username = e.target.elements.username.value.trim();
    const password = e.target.elements.password.value;
    const groupId = parseInt(e.target.elements.group_id.value, 10);

    if (!name || !username || !password || isNaN(groupId)) {
      alert("Barcha maydonlarni to'ldiring!");
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
    const payload = {
      name,
      initials,
      username,
      password,
      group_id: groupId,
      color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
      score: 0
    };

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "O'quvchi qo'shishda xatolik");

      setStudents([data, ...students]);
      setIsCreateModalOpen(false);
      alert(`"${name}" muvaffaqiyatli qo'shildi!`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const name = e.target.elements.name.value.trim();
    const username = e.target.elements.username.value.trim();
    const password = e.target.elements.password.value;
    const groupId = parseInt(e.target.elements.group_id.value, 10);

    const payload = {
      name,
      username,
      group_id: groupId
    };

    if (password && password.trim()) {
      if (password.length < 8) {
        alert("Parol kamida 8 ta belgidan iborat bo'lishi kerak!");
        return;
      }
      payload.password = password;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Tahrirlashda xatolik");

      setStudents(students.map(s => s.id === data.id ? data : s));
      setIsEditModalOpen(false);
      setEditingStudent(null);
      alert(`"${name}" ma'lumotlari muvaffaqiyatli yangilandi!`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`"${student.name}" o'quvchisini bazadan butunlay o'chirishni tasdiqlaysizmi?`)) {
      return;
    }

    try {
      const res = await apiFetch(`${API_URL}/students/${student.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "O'chirishda xatolik yuz berdi");
      }
      setStudents(prev => prev.filter(s => s.id !== student.id));
      alert(`"${student.name}" o'chirildi!`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Xatolik yuz berdi");
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
  };

  // Filter & sorting
  const filteredStudents = students
    .filter(s => {
      const matchesGroup = selectedGroupFilter === 'all' || s.group_id?.toString() === selectedGroupFilter.toString();
      const term = search.toLowerCase();
      const matchesSearch = (s.name || '').toLowerCase().includes(term) ||
                            (s.username || '').toLowerCase().includes(term) ||
                            (s.group_name || '').toLowerCase().includes(term);
      return matchesGroup && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'recent') return b.id - a.id;
      return (a.name || '').localeCompare(b.name || '');
    });

  const totalScore = students.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const avgScore = students.length > 0 ? (totalScore / students.length).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mening O'quvchilarim</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Barcha o'quvchilar ro'yxati, ularning loginlari, guruhlari va to'plagan ballari.
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center space-x-2"
        >
          <i className="fa-solid fa-user-plus"></i>
          <span>Yangi o'quvchi qo'shish</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Jami o'quvchilar</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{students.length} ta</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-user-group"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Faol guruhlar</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length} ta</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">O'rtacha ball</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgScore} ball</p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[240px] max-w-md">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder="O'quvchi ismi, logini yoki guruhi bo'yicha qidirish..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Group Filter */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-xs text-gray-400 mr-1">Guruh:</span>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Barcha guruhlar ({students.length})</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-xs text-gray-400 mr-1">Tartib:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="name">Alifbo bo'yicha (A-Z)</option>
              <option value="score">Eng yuqori ball bo'yicha</option>
              <option value="recent">Eng oxirgi qo'shilganlar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center space-y-3">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
            <p className="text-sm">O'quvchilar ro'yxati yuklanmoqda...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center space-y-3">
            <i className="fa-solid fa-user-slash text-4xl text-gray-300 dark:text-gray-600"></i>
            <p className="text-base font-medium">Hech qanday o'quvchi topilmadi</p>
            <p className="text-xs text-gray-400">Qidiruv so'zini o'zgartiring yoki yangi o'quvchi qo'shing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">O'quvchi</th>
                  <th className="py-3.5 px-4">Login (Username)</th>
                  <th className="py-3.5 px-4">Guruhi</th>
                  <th className="py-3.5 px-4 text-center">To'plangan ball</th>
                  <th className="py-3.5 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shadow-sm ${st.color || 'bg-indigo-100 text-indigo-600'}`}>
                          {st.initials || 'ST'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{st.name}</p>
                          <p className="text-[11px] text-gray-400 sm:hidden">{st.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                        {st.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg">
                        <i className="fa-solid fa-users text-[10px] mr-1.5 opacity-70"></i>
                        {st.group_name || 'Guruhsiz'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center font-bold text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg">
                        <i className="fa-solid fa-trophy text-[10px] mr-1"></i>
                        {st.score || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEditModal(st)}
                          className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center transition"
                          title="Tahrirlash"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition"
                          title="O'chirish"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Student Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <i className="fa-solid fa-user-plus text-xs"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yangi O'quvchi Qo'shish</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ism va Familiyasi <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Masalan: Bekzod Karimov" 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Login (Username) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="username" 
                  placeholder="bekzod_k" 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guruh <span className="text-red-500">*</span>
                </label>
                <select
                  name="group_id"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dastlabki Parol <span className="text-red-500">*</span>
                </label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="Kamida 8 ta belgi" 
                  minLength="8" 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
                  <span>Qo'shish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <i className="fa-solid fa-user-pen text-xs"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">O'quvchini Tahrirlash</h3>
              </div>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingStudent(null); }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ism va Familiyasi <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={editingStudent.name} 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Login (Username) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="username" 
                  defaultValue={editingStudent.username} 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guruh <span className="text-red-500">*</span>
                </label>
                <select
                  name="group_id"
                  defaultValue={editingStudent.group_id}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yangi Parol <span className="text-xs text-gray-400 font-normal">(agar o'zgartirmoqchi bo'lsangiz)</span>
                </label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="O'zgartirmaslik uchun bo'sh qoldiring" 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingStudent(null); }} 
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
