import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar, onLogout }) => {
  return (
    <aside className={`bg-indigo-900 dark:bg-gray-950 text-white w-64 absolute inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-20 flex flex-col justify-between border-r border-indigo-800 dark:border-gray-800 py-7 px-4 space-y-6`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-3 px-2 mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm border border-indigo-400">
            <i className="fa-solid fa-graduation-cap text-white text-xl"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide">EduMaster</span>
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider">O'quvchi Paneli</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <p className="px-2 text-[10px] font-bold text-indigo-400 dark:text-gray-500 uppercase tracking-wider mb-2">Asosiy Menu</p>
          
          <NavLink to="/" end className={({ isActive }) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-house w-5 text-center"></i>
            <span>Bosh sahifa</span>
          </NavLink>

          <NavLink to="/database" className={({ isActive }) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-database w-5 text-center"></i>
            <span>Mavzular Bazasi</span>
          </NavLink>

          <NavLink to="/results" className={({ isActive }) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
            <i className="fa-solid fa-trophy w-5 text-center"></i>
            <span>Natijalar & Reyting</span>
          </NavLink>

          <div className="pt-4">
            <p className="px-2 text-[10px] font-bold text-indigo-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tizim</p>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "w-full flex items-center space-x-3 py-3 px-4 rounded-xl bg-indigo-800 dark:bg-gray-800 text-white font-medium transition duration-150" : "w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white font-medium transition duration-150"}>
              <i className="fa-solid fa-gear w-5 text-center"></i>
              <span>Sozlamalar</span>
            </NavLink>
          </div>
        </nav>
      </div>
      
      <div className="pt-4 border-t border-indigo-800 dark:border-gray-800">
        <button onClick={onLogout} className="w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-red-400 hover:bg-indigo-800/50 hover:text-red-300 font-medium transition duration-150">
          <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center"></i>
          <span>Tizimdan chiqish</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
