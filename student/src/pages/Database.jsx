import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch, getStudentId } from '../api';

const Database = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    apiFetch(`${API_URL}/student/${studentId}/blocks`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Sizning ma'lumotlaringiz bazada topilmadi.");
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setBlocks(data);
        } else {
          setBlocks([]);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  const filteredBlocks = blocks.filter(block => {
    const matchesFilter = filter === 'all' || block.category === filter;
    const matchesSearch = block.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">O'quv Bloklari</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sizning guruhingiz uchun ruxsat etilgan mavzular ro'yxati.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Qidirish..."
            className="w-full sm:w-80 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>Barchasi</button>
          <button onClick={() => setFilter('dasturlash')} className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${filter === 'dasturlash' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>Dasturlash</button>
          <button onClick={() => setFilter('dizayn')} className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${filter === 'dizayn' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>Dizayn</button>
          <button onClick={() => setFilter('til')} className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${filter === 'til' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>Tillar</button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center border border-red-100 dark:border-red-800">
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlocks.map((block) => (
            <Link to={`/blocks/${block.id}`} key={block.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between transition hover:shadow-md group cursor-pointer">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase ${block.badge_class}`}>{block.badge}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">{block.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{block.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span><i className="fa-solid fa-file-lines mr-1"></i> {block.topics_list?.length || block.topics} ta mavzu</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">O'rganishni boshlash &rarr;</span>
              </div>
            </Link>
          ))}
          {filteredBlocks.length === 0 && !error && (
            <div className="col-span-full bg-gray-50 dark:bg-gray-800 p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
              <i className="fa-solid fa-lock text-gray-400 text-4xl mb-3"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mavzular yo'q</h3>
              <p className="text-sm text-gray-500 mt-1">Sizning guruhingizga hozircha hech qanday mavzu bloki biriktirilmagan yoki qidiruvingizga mos natija topilmadi.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Database;
