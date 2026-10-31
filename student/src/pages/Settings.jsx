import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const Settings = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const saveProfile = (e) => {
    e.preventDefault();
    alert("Profil ma'lumotlari yangilandi!");
  };

  const updateLogo = () => {
    alert("Platforma logotipi yangilandi!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platforma Sozlamalari</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Profil ma'lumotlarini o'zgartirish va ko'rinish rejimini boshqarish.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700">Profil ma'lumotlari</h3>
        
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center space-x-6">
            <img className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500" src="https://placehold.co/100x100/6366f1/ffffff?text=Admin" alt="Admin" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profil rasmi havolasi (URL)</label>
              <input type="text" defaultValue="https://placehold.co/100x100/6366f1/ffffff?text=Admin" className="w-full sm:w-80 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism va Familiya</label>
              <input type="text" defaultValue="Sardor Alimov" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Elektron pochta</label>
              <input type="email" defaultValue="sardor@edumaster.uz" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-sm transition">
              O'zgarishlarni saqlash
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700">Tashqi ko'rinish va Brend</h3>
        
        <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platforma logotipi (Rasm havolasi URL)</label>
          <div className="flex items-center space-x-4">
            <img className="w-12 h-12 rounded-xl object-cover border border-indigo-500 bg-indigo-50 p-1" src="https://placehold.co/100x100/6366f1/ffffff?text=EM" alt="Logo Preview" />
            <input type="text" defaultValue="https://placehold.co/100x100/6366f1/ffffff?text=EM" placeholder="https://example.com/logo.png" className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="button" onClick={updateLogo} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Yangilash</button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tungi rejim (Dark Mode)</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ko'zni himoya qilish uchun qorong'u mavzuni yoqish.</p>
          </div>
          <button type="button" onClick={toggleTheme} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold transition flex items-center space-x-2">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            <span>{theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
