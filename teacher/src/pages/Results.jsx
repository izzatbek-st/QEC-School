import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';

const Results = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch(`${API_URL}/results`)
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(console.error);
  }, []);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">O'zlashtirish Natijalari</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Barcha guruhlardagi o'quvchilarning umumiy ballari va reytingi.</p>
        </div>
        <button className="bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center space-x-2">
          <i className="fa-solid fa-download"></i>
          <span>Hisobot (Excel)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative w-full max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input 
              type="text" 
              placeholder="O'quvchini qidirish..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-semibold">Reyting</th>
                <th className="p-4 font-semibold">O'quvchi</th>
                <th className="p-4 font-semibold">Guruh ID</th>
                <th className="p-4 font-semibold text-right">To'plagan Ball</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {filteredStudents.map((student, idx) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="p-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${student.color}`}>{student.initials}</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{student.name}</h4>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    Guruh #{student.group_id}
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">{student.score}</span>
                    <span className="text-gray-400 text-xs ml-1">/ 100</span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center p-8 text-gray-500">
                    O'quvchilar topilmadi yoki baza bo'sh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
