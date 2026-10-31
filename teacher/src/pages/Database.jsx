import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';

const Database = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [blocks, setBlocks] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  const fetchBlocks = () => {
    apiFetch(`${API_URL}/blocks`)
      .then(res => res.json())
      .then(data => setBlocks(data))
      .catch(console.error);
  };

  const fetchGroups = () => {
    apiFetch(`${API_URL}/groups`)
      .then(res => res.json())
      .then(data => setAvailableGroups(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchBlocks();
    fetchGroups();
  }, []);

  const filteredBlocks = blocks.filter(block => {
    const matchesFilter = filter === 'all' || block.category === filter;
    const matchesSearch = block.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const uniqueCategories = [...new Set(blocks.map(b => b.category))].filter(Boolean);

  const handleDelete = (id) => {
    apiFetch(`${API_URL}/blocks/${id}`, { method: 'DELETE' })
      .then(() => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        alert("Mavzu bloki o'chirildi!");
      })
      .catch(console.error);
  };

  const handleCreateBlock = (e) => {
    e.preventDefault();
    const title = e.target.elements.title.value;
    const category = e.target.elements.category.value;
    const desc = e.target.elements.desc.value;
    const newBlock = {
      title,
      category,
      desc,
      badge: category,
      badge_class: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      group_ids: selectedGroupIds,
      topics: 0
    };

    apiFetch(`${API_URL}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBlock)
    })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ? JSON.stringify(err.detail) : 'Server xatoligi');
      }
      return res.json();
    })
    .then(data => {
      setBlocks([data, ...blocks]);
      setIsModalOpen(false);
      setSelectedGroupIds([]);
      alert(`"${title}" bloki muvaffaqiyatli yaratildi va guruhlarga biriktirildi!`);
    })
    .catch(err => {
      console.error(err);
      alert("Yaratishda xatolik yuz berdi: " + err.message);
    });
  };

  const toggleGroupSelection = (id) => {
    setSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mavzu Bloklari Bazasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">O'qituvchi sifatida o'quv dasturi uchun yangi mavzu bloklarini yarating va boshqaring.</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); fetchGroups(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center space-x-2">
          <i className="fa-solid fa-plus"></i>
          <span>Yangi blok yaratish</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Mavzu yoki blokni qidirish..."
            className="w-full sm:w-80 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>Barchasi</button>
          {uniqueCategories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlocks.map((block) => (
          <div key={block.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between transition hover:shadow-md relative group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase ${block.badge_class}`}>{block.badge}</span>
                <button onClick={() => handleDelete(block.id)} className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100" title="O'chirish">
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{block.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{block.desc}</p>
              
              <div className="mt-3 flex flex-wrap gap-1">
                {(block.groups || []).map(g => (
                  <span key={g.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{g.name}</span>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <span><i className="fa-solid fa-file-lines mr-1"></i> {block.topics} ta mavzu</span>
              <Link to={`/database/blocks/${block.id}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Ochish &rarr;</Link>
            </div>
          </div>
        ))}
        {filteredBlocks.length === 0 && (
          <p className="text-gray-500 p-4">Hozircha baza bo'sh. Yangi blok qo'shishingiz mumkin.</p>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yangi Mavzu Bloki Yaratish</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mavzu / Blok Sarlavhasi</label>
                <input type="text" name="title" placeholder="Masalan: Python Asoslari" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategoriya</label>
                <input list="category-options" name="category" placeholder="Kategoriya tanlang yoki yozing..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                <datalist id="category-options">
                  {uniqueCategories.length > 0 ? (
                    uniqueCategories.map(cat => <option key={cat} value={cat} />)
                  ) : (
                    <>
                      <option value="Dasturlash" />
                      <option value="Dizayn" />
                      <option value="Til" />
                    </>
                  )}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qisqacha Tavsif</label>
                <textarea name="desc" rows="3" placeholder="Blok haqida qisqacha ma'lumot..." className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required></textarea>
              </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qaysi guruhlarga ruxsat etiladi?</label>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {availableGroups.map(group => (
                    <label key={group.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{group.name}</span>
                    </label>
                  ))}
                  {availableGroups.length === 0 && (
                    <p className="text-xs text-gray-500">Hozircha guruhlar yo'q. Oldin guruh yarating.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition">Yaratish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Database;
