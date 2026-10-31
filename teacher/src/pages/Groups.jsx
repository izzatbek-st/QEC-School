import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';

const Groups = () => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [groups, setGroups] = useState([]);

  const fetchGroups = () => {
    apiFetch(`${API_URL}/groups`)
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openGroupDetail = (group) => {
    setActiveGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const username = e.target.elements.username.value;
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
      const updatedGroups = groups.map(g => g.id === activeGroup.id ? {...g, students: [...g.students, data]} : g);
      setGroups(updatedGroups);
      setActiveGroup(updatedGroups.find(g => g.id === activeGroup.id));
      setIsAddStudentModalOpen(false);
      alert(`"${name}" guruhga muvaffaqiyatli qo'shildi!`);
    })
    .catch(err => alert(err.message));
  };

  const handleEditStudent = (e) => {
    e.preventDefault();
    const username = e.target.elements.username.value;
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
            students: g.students.map(s => s.id === editingStudent.id ? {...s, username: data.username} : s)
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

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const desc = e.target.elements.desc.value;

    apiFetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, desc })
    })
    .then(res => res.json())
    .then(data => {
      setGroups([...groups, data]);
      setIsCreateGroupModalOpen(false);
      alert(`"${name}" guruhi muvaffaqiyatli yaratildi!`);
    })
    .catch(console.error);
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Siz dars o'tadigan o'quv guruhlari ro'yxati.</p>
        </div>
        <button onClick={() => setIsCreateGroupModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center space-x-2">
          <i className="fa-solid fa-plus"></i>
          <span>Yangi guruh yaratish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} onClick={() => openGroupDetail(group)} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between cursor-pointer hover:shadow-md transition">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{group.desc}</p>
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">O'quvchilar soni:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{(group.students || []).length} ta</span>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-gray-500 p-4">Hozircha guruhlar yo'q.</p>
        )}
      </div>

      {isGroupModalOpen && activeGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activeGroup.name} — Tafsilotlari ({(activeGroup.students || []).length})</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <i className="fa-solid fa-users text-indigo-600"></i>
                    <span>Guruh O'quvchilari Ro'yxati</span>
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
                            <button onClick={() => openEditStudent(st)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Tahrirlash</button>
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

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => setIsGroupModalOpen(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">Yopish</button>
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh nomi</label>
                <input type="text" name="name" placeholder="Masalan: Frontend FE-22" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guruh haqida qisqacha</label>
                <textarea name="desc" rows="3" placeholder="Guruh ta'rifi..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required></textarea>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsCreateGroupModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition">Yaratish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
