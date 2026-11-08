import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';

const Groups = () => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [groups, setGroups] = useState([]);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const fetchGroups = () => {
    apiFetch(`${API_URL}/groups`)
      .then(res => res.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openGroupDetail = (group) => {
    setActiveGroup(group);
    setIsGroupModalOpen(true);
  };

  const openCreateGroupModal = () => {
    setIsCreateGroupModalOpen(true);
  };

  const openEditGroupModal = (group, e) => {
    if (e) e.stopPropagation();
    setEditingGroup(group);
    setIsEditGroupModalOpen(true);
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    const desc = e.target.elements.desc.value.trim();
    if (!name) return;

    setIsSavingGroup(true);
    apiFetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, desc })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Guruh yaratishda xatolik");
      return data;
    })
    .then(data => {
      setGroups([data, ...groups]);
      setIsCreateGroupModalOpen(false);
      alert(`"${name}" guruhi muvaffaqiyatli yaratildi!`);
    })
    .catch(err => {
      console.error(err);
      alert(err.message || "Guruh yaratishda xatolik");
    })
    .finally(() => setIsSavingGroup(false));
  };

  const handleEditGroup = (e) => {
    e.preventDefault();
    if (!editingGroup) return;
    const name = e.target.elements.name.value.trim();
    const desc = e.target.elements.desc.value.trim();
    if (!name) return;

    setIsSavingGroup(true);
    apiFetch(`${API_URL}/groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, desc })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Guruhni yangilashda xatolik");
      return data;
    })
    .then(data => {
      const updatedGroups = groups.map(g => g.id === data.id ? { ...g, name: data.name, desc: data.desc } : g);
      setGroups(updatedGroups);
      if (activeGroup && activeGroup.id === data.id) {
        setActiveGroup({ ...activeGroup, name: data.name, desc: data.desc });
      }
      setIsEditGroupModalOpen(false);
      setEditingGroup(null);
      alert(`"${name}" guruhi muvaffaqiyatli yangilandi!`);
    })
    .catch(err => {
      console.error(err);
      alert(err.message || "Guruhni yangilashda xatolik");
    })
    .finally(() => setIsSavingGroup(false));
  };

  const handleDeleteGroup = (group, e) => {
    if (e) e.stopPropagation();
    const studentCount = (group.students || []).length;
    const confirmMessage = studentCount > 0
      ? `"${group.name}" guruhini o'chirishni tasdiqlaysizmi?\n\nDIQQAT: Guruhdagi barcha ${studentCount} ta o'quvchi va ularning test natijalari ham o'chiriladi!`
      : `"${group.name}" guruhini o'chirishni tasdiqlaysizmi?`;

    if (!window.confirm(confirmMessage)) return;

    apiFetch(`${API_URL}/groups/${group.id}`, { method: 'DELETE' })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "O'chirishda xatolik yuz berdi");
        }
        setGroups(prev => prev.filter(g => g.id !== group.id));
        if (activeGroup && activeGroup.id === group.id) {
          setIsGroupModalOpen(false);
          setActiveGroup(null);
        }
        alert(`"${group.name}" guruhi muvaffaqiyatli o'chirildi!`);
      })
      .catch(err => {
        console.error(err);
        alert(err.message || "Guruhni o'chirishda xatolik");
      });
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    const username = e.target.elements.username.value.trim();
    const password = e.target.elements.password.value;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const newStudent = {
      name,
      initials,
      username,
      password,
      color: 'bg-indigo-100 text-indigo-600',
      score: 0
    };

    apiFetch(`${API_URL}/groups/${activeGroup.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Xatolik yuz berdi");
      return data;
    })
    .then(data => {
      const updatedGroups = groups.map(g => g.id === activeGroup.id ? {...g, students: [...(g.students || []), data]} : g);
      setGroups(updatedGroups);
      setActiveGroup(updatedGroups.find(g => g.id === activeGroup.id));
      setIsAddStudentModalOpen(false);
      alert(`"${name}" guruhga muvaffaqiyatli qo'shildi!`);
    })
    .catch(err => alert(err.message));
  };

  const handleEditStudent = (e) => {
    e.preventDefault();
    const username = e.target.elements.username.value.trim();
    const password = e.target.elements.password.value;

    apiFetch(`${API_URL}/students/${editingStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Xatolik yuz berdi");
      return data;
    })
    .then(data => {
      const updatedGroups = groups.map(g => {
        if (g.id === activeGroup.id) {
          return {
            ...g,
            students: (g.students || []).map(s => s.id === editingStudent.id ? {...s, username: data.username} : s)
          };
        }
        return g;
      });
      setGroups(updatedGroups);
      setActiveGroup(updatedGroups.find(g => g.id === activeGroup.id));
      setIsEditStudentModalOpen(false);
      alert(`Parol/Login yangilandi!`);
    })
    .catch(err => alert(err.message));
  };

  const handleDeleteStudent = (student, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`"${student.name}" o'quvchisini guruhdan o'chirishni tasdiqlaysizmi?`)) return;

    apiFetch(`${API_URL}/students/${student.id}`, { method: 'DELETE' })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "O'quvchini o'chirishda xatolik");
        }
        const updatedGroups = groups.map(g => {
          if (g.id === activeGroup.id) {
            return {
              ...g,
              students: (g.students || []).filter(s => s.id !== student.id)
            };
          }
          return g;
        });
        setGroups(updatedGroups);
        setActiveGroup(updatedGroups.find(g => g.id === activeGroup.id));
        alert(`"${student.name}" muvaffaqiyatli o'chirildi!`);
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setIsEditStudentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mening Guruhlarim</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Siz dars o'tadigan o'quv guruhlari ro'yxati, ularni tahrirlash va boshqarish.</p>
        </div>
        <button onClick={openCreateGroupModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center space-x-2">
          <i className="fa-solid fa-plus"></i>
          <span>Yangi guruh yaratish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div 
            key={group.id} 
            onClick={() => openGroupDetail(group)} 
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between cursor-pointer hover:shadow-md transition relative group"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white pr-2 line-clamp-1">{group.name}</h3>
                <div className="flex items-center space-x-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button 
                    onClick={(e) => openEditGroupModal(group, e)} 
                    className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center transition"
                    title="Guruhni tahrirlash"
                  >
                    <i className="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteGroup(group, e)} 
                    className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition"
                    title="Guruhni o'chirish"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{group.desc || "Ta'rif kiritilmagan."}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">O'quvchilar soni:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{(group.students || []).length} ta</span>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
            <i className="fa-solid fa-users text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
            <p className="text-gray-500 dark:text-gray-400">Hozircha guruhlar yo'q.</p>
            <button onClick={openCreateGroupModal} className="mt-3 text-indigo-600 hover:underline text-sm font-semibold">
              + Yangi guruh yaratish
            </button>
          </div>
        )}
      </div>

      {/* Group Detail Modal */}
      {isGroupModalOpen && activeGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {activeGroup.name}
                  </h3>
                  <p className="text-xs text-gray-500">{activeGroup.desc || "Guruh tafsilotlari"}</p>
                </div>
                <button 
                  onClick={() => openEditGroupModal(activeGroup)} 
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg flex items-center space-x-1.5 transition"
                  title="Guruh nomini va ta'rifini tahrirlash"
                >
                  <i className="fa-solid fa-pen text-[10px]"></i>
                  <span>Tahrirlash</span>
                </button>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <i className="fa-solid fa-users text-indigo-600"></i>
                    <span>Guruh O'quvchilari Ro'yxati ({(activeGroup.students || []).length} ta)</span>
                  </h4>
                  <button onClick={() => setIsAddStudentModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5">
                    <i className="fa-solid fa-user-plus"></i>
                    <span>O'quvchi qo'shish</span>
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 tracking-wider">
                        <th className="py-2 px-3">O'quvchi</th>
                        <th className="py-2 px-3">Login</th>
                        <th className="py-2 px-3 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                      {(activeGroup.students || []).map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                          <td className="py-3 px-3 flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${st.color}`}>{st.initials}</div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{st.name}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 font-mono text-xs">{st.username}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => openEditStudent(st)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 text-xs font-medium">Tahrirlash</button>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <button onClick={(e) => handleDeleteStudent(st, e)} className="text-red-500 hover:text-red-700 text-xs font-medium">O'chirish</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(activeGroup.students || []).length === 0 && (
                        <tr><td colSpan="3" className="py-4 text-center text-gray-500 text-sm">Bu guruhda hali o'quvchilar yo'q.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <button 
                onClick={(e) => handleDeleteGroup(activeGroup, e)} 
                className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-sm font-medium transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
                <span>Guruhni o'chirish</span>
              </button>
              <button onClick={() => setIsGroupModalOpen(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-xl text-sm font-medium transition">Yopish</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Guruhga O'quvchi Qo'shish</h3>
              <button onClick={() => setIsAddStudentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism va Familiyasi</label>
                <input type="text" name="name" placeholder="Bekzod Karimov" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login (Username)</label>
                <input type="text" name="username" placeholder="bekzod_k" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parol (Password)</label>
                <input type="password" name="password" placeholder="Kamida 8 ta belgi" minLength="8" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition">Qo'shish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">O'quvchi ma'lumotlarini tahrirlash</h3>
              <button onClick={() => setIsEditStudentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <p className="text-sm font-semibold">{editingStudent.name}</p>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login (Username)</label>
                <input type="text" name="username" defaultValue={editingStudent.username} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yangi Parol</label>
                <input type="password" name="password" placeholder="Kamida 8 ta belgi" minLength="8" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditStudentModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yangi Guruh Yaratish</h3>
              <button onClick={() => setIsCreateGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh nomi <span className="text-red-500">*</span></label>
                <input type="text" name="name" placeholder="Masalan: Frontend FE-22" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh haqida qisqacha</label>
                <textarea name="desc" rows="3" placeholder="Guruh ta'rifi..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsCreateGroupModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" disabled={isSavingGroup} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center space-x-2">
                  {isSavingGroup && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
                  <span>Yaratish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {isEditGroupModalOpen && editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <i className="fa-solid fa-pen"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Guruhni Tahrirlash</h3>
              </div>
              <button onClick={() => { setIsEditGroupModalOpen(false); setEditingGroup(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleEditGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh nomi <span className="text-red-500">*</span></label>
                <input type="text" name="name" defaultValue={editingGroup.name} placeholder="Guruh nomi" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh haqida qisqacha</label>
                <textarea name="desc" rows="3" defaultValue={editingGroup.desc || ''} placeholder="Guruh ta'rifi..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsEditGroupModalOpen(false); setEditingGroup(null); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" disabled={isSavingGroup} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center space-x-2">
                  {isSavingGroup && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
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

export default Groups;