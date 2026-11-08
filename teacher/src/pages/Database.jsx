import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';

const BADGE_THEMES = [
  { label: 'Moviy', class: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  { label: 'Yashil', class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  { label: 'Sariq', class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' },
  { label: 'Binafsha', class: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  { label: 'Qizil', class: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
  { label: 'Moviy-ko\'k', class: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' },
  { label: 'Kulrang', class: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
];

const Database = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [selectedBadgeClass, setSelectedBadgeClass] = useState(BADGE_THEMES[0].class);
  const [formData, setFormData] = useState({ title: '', category: '', desc: '', badge: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchBlocks = () => {
    apiFetch(`${API_URL}/blocks`)
      .then(res => res.json())
      .then(data => setBlocks(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchGroups = () => {
    apiFetch(`${API_URL}/groups`)
      .then(res => res.json())
      .then(data => setAvailableGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchBlocks();
    fetchGroups();
  }, []);

  const filteredBlocks = blocks.filter(block => {
    const matchesFilter = filter === 'all' || block.category === filter;
    const matchesSearch = (block.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (block.desc || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const uniqueCategories = [...new Set(blocks.map(b => b.category))].filter(Boolean);

  const handleDelete = (id, title) => {
    if (!window.confirm(`"${title || 'Ushbu blok'}"ni o'chirishni tasdiqlaysizmi? Blok ichidagi barcha mavzular va testlar ham o'chiriladi!`)) {
      return;
    }
    apiFetch(`${API_URL}/blocks/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error("O'chirishda xatolik yuz berdi");
        setBlocks(prev => prev.filter(b => b.id !== id));
        alert("Mavzu bloki muvaffaqiyatli o'chirildi!");
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormData({ title: '', category: '', desc: '', badge: '' });
    setSelectedBadgeClass(BADGE_THEMES[0].class);
    setSelectedGroupIds([]);
    setIsModalOpen(true);
    fetchGroups();
  };

  const openEditModal = (block) => {
    setEditingBlock(block);
    setFormData({
      title: block.title || '',
      category: block.category || '',
      desc: block.desc || '',
      badge: block.badge || block.category || ''
    });
    setSelectedBadgeClass(block.badge_class || BADGE_THEMES[0].class);
    setSelectedGroupIds((block.groups || []).map(g => g.id));
    setIsModalOpen(true);
    fetchGroups();
  };

  const toggleGroupSelection = (id) => {
    setSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.length === availableGroups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(availableGroups.map(g => g.id));
    }
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Blok sarlavhasini kiriting!");
      return;
    }

    setIsSaving(true);
    const category = formData.category.trim() || 'Umumiy';
    const badge = formData.badge.trim() || category;

    const payload = {
      title: formData.title.trim(),
      category: category,
      desc: formData.desc.trim(),
      badge: badge,
      badge_class: selectedBadgeClass,
      group_ids: selectedGroupIds,
      topics: editingBlock ? editingBlock.topics : 0
    };

    try {
      const url = editingBlock 
        ? `${API_URL}/blocks/${editingBlock.id}`
        : `${API_URL}/blocks`;
      const method = editingBlock ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : 'Server xatoligi');
      }

      const savedData = await res.json();

      if (editingBlock) {
        setBlocks(prev => prev.map(b => b.id === savedData.id ? savedData : b));
        alert(`"${savedData.title}" bloki muvaffaqiyatli yangilandi!`);
      } else {
        setBlocks([savedData, ...blocks]);
        alert(`"${savedData.title}" bloki muvaffaqiyatli yaratildi!`);
      }

      setIsModalOpen(false);
      setEditingBlock(null);
    } catch (err) {
      console.error(err);
      alert("Saqlashda xatolik yuz berdi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mavzu Bloklari Bazasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">O'quv dasturi uchun yangi mavzu bloklarini yarating, tahrirlang va boshqaring.</p>
        </div>
        <button 
          onClick={openCreateModal} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center space-x-2"
        >
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
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
          >
            Barchasi ({blocks.length})
          </button>
          {uniqueCategories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)} 
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
            >
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
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase ${block.badge_class || 'bg-indigo-100 text-indigo-700'}`}>
                  {block.badge || block.category}
                </span>
                <div className="flex items-center space-x-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => openEditModal(block)} 
                    className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center transition" 
                    title="Blokni tahrirlash"
                  >
                    <i className="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button 
                    onClick={() => handleDelete(block.id, block.title)} 
                    className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition" 
                    title="Blokni o'chirish"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{block.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{block.desc || "Qisqacha ma'lumot kiritilmagan."}</p>
              
              <div className="mt-3 flex flex-wrap gap-1">
                {(block.groups || []).map(g => (
                  <span key={g.id} className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium">
                    {g.name}
                  </span>
                ))}
                {(!block.groups || block.groups.length === 0) && (
                  <span className="text-[10px] text-gray-400 italic">Hech qaysi guruhga biriktirilmagan</span>
                )}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center">
                <i className="fa-solid fa-file-lines mr-1.5 text-indigo-500"></i>
                <span className="font-medium text-gray-700 dark:text-gray-300">{block.topics || 0}</span> ta dars / test
              </span>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => openEditModal(block)} 
                  className="text-gray-500 hover:text-indigo-600 font-medium transition"
                >
                  Tahrirlash
                </button>
                <Link 
                  to={`/database/blocks/${block.id}`} 
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
                >
                  <span>Ochish</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </Link>
              </div>
            </div>
          </div>
        ))}
        {filteredBlocks.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
            <i className="fa-solid fa-layer-group text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
            <p className="text-gray-500 dark:text-gray-400">Hozircha hech qanday mavzu bloki topilmadi.</p>
            <button 
              onClick={openCreateModal}
              className="mt-3 text-indigo-600 hover:underline text-sm font-semibold"
            >
              + Yangi blok yaratish
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <i className={`fa-solid ${editingBlock ? 'fa-pen-to-square' : 'fa-plus'}`}></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingBlock ? "Mavzu Blokini Tahrirlash" : "Yangi Mavzu Bloki Yaratish"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mavzu / Blok Sarlavhasi <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Python Asoslari yoki Web Dasturlash" 
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kategoriya <span className="text-red-500">*</span>
                  </label>
                  <input 
                    list="category-options" 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Masalan: Dasturlash" 
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    required 
                  />
                  <datalist id="category-options">
                    {uniqueCategories.length > 0 ? (
                      uniqueCategories.map(cat => <option key={cat} value={cat} />)
                    ) : (
                      <>
                        <option value="Dasturlash" />
                        <option value="Dizayn" />
                        <option value="Robototexnika" />
                        <option value="Matematika" />
                        <option value="Til" />
                      </>
                    )}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nishon matni (Badge)
                  </label>
                  <input 
                    type="text" 
                    value={formData.badge} 
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder={formData.category || "Avtomatik"} 
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nishon rangi va stili
                </label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_THEMES.map((theme) => (
                    <button
                      key={theme.label}
                      type="button"
                      onClick={() => setSelectedBadgeClass(theme.class)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${theme.class} ${
                        selectedBadgeClass === theme.class 
                          ? 'ring-2 ring-indigo-500 border-indigo-500' 
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Qisqacha Tavsif
                </label>
                <textarea 
                  value={formData.desc} 
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  rows="3" 
                  placeholder="Blok haqida o'quvchilarga ko'rinadigan qisqacha tavsif..." 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Qaysi guruhlarga ruxsat etiladi?
                  </label>
                  {availableGroups.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleSelectAllGroups} 
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedGroupIds.length === availableGroups.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                    </button>
                  )}
                </div>
                
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 border border-gray-100 dark:border-gray-700 rounded-xl p-2 bg-gray-50/50 dark:bg-gray-750">
                  {availableGroups.map(group => (
                    <label key={group.id} className="flex items-center space-x-2.5 cursor-pointer p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition">
                      <input 
                        type="checkbox" 
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.name}</span>
                      <span className="text-xs text-gray-400">({(group.students || []).length} ta o'quvchi)</span>
                    </label>
                  ))}
                  {availableGroups.length === 0 && (
                    <p className="text-xs text-gray-500 p-2">Hozircha guruhlar yo'q. "Guruhlarim" sahifasida guruh yarating.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSaving && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
                  <span>{editingBlock ? "O'zgarishlarni saqlash" : "Yaratish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Database;