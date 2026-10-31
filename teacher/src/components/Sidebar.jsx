import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';

const Sidebar = ({ isOpen, toggleSidebar, onLogout }) => {
  const [profile, setProfile] = useState({ name: "Jasur O'qituvchi", logo_url: "https://placehold.co/100x100/6366f1/ffffff?text=EM", avatar_url: "https://placehold.co/100x100/6366f1/ffffff?text=Teacher" });

  useEffect(() => {
    apiFetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(console.error);
  }, []);

  return (
    <aside className={`bg-indigo-900 dark:bg-gray-950 text-white w-64 space-y-6 py-7 px-4 absolute inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-20 flex flex-col justify-between border-r border-indigo-800 dark:border-gray-800`}>
      <div>
        <div className="flex items-center space-x-3 px-2 mb-8">
          <img className="w-10 h-10 rounded-xl object-cover bg-indigo-500 p-1 shadow-sm border border-indigo-400" src={profile.logo_url} alt="Logo" />
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide">EduMaster</span>
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider">O'qituvchi Paneli</span>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink to="/" className={({isActive}) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"} end>
            <i className="fa-solid fa-house w-5"></i>
            <span>Bosh sahifa</span>
          </NavLink>
          <NavLink to="/database" className={({isActive}) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-database w-5"></i>
            <span>Baza</span>
          </NavLink>
          <NavLink to="/groups" className={({isActive}) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-user-group w-5"></i>
            <span>Guruhlarim</span>
          </NavLink>
          <NavLink to="/results" className={({isActive}) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-trophy w-5"></i>
            <span>Natijalar</span>
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-gear w-5"></i>
            <span>Sozlamalar</span>
          </NavLink>
          <a 
            href="/student/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150 border-t border-indigo-800/50 mt-2"
            title="O'quvchi panelini yangi oynada ochish"
          >
            <i className="fa-solid fa-graduation-cap w-5 text-indigo-300"></i>
            <span>O'quvchi paneli</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-xs ml-auto opacity-70"></i>
          </a>
        </nav>
      </div>

      <div className="pt-4 border-t border-indigo-800 dark:border-gray-800 flex items-center justify-between px-2">
        <div className="flex items-center space-x-3">
          <img className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400" src={profile.avatar_url} alt="Teacher" />
          <div>
            <h4 className="text-sm font-semibold text-white">{profile.name}</h4>
            <p className="text-xs text-indigo-300">O'qituvchi</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-indigo-300 hover:text-white transition" title="Tizimdan chiqish">
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
