import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const Header = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-between px-6 z-10 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <button onClick={toggleSidebar} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 focus:outline-none md:hidden text-xl">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="relative hidden sm:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
          </span>
          <input type="text" placeholder="Platformadan qidirish..." className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button type="button" onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
        </button>
        <button className="relative p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
          <i className="fa-regular fa-bell text-xl"></i>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
