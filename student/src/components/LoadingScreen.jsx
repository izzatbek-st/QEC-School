import React from 'react';
import logoImg from '../assets/logo_qec_school.webp';

const LoadingScreen = ({ message = "Yuklanmoqda...", fullScreen = false }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 transition-colors ${
      fullScreen ? 'fixed inset-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md' : 'py-16 w-full'
    }`}>
      <div className="relative flex items-center justify-center mb-5">
        <div className="absolute w-20 h-20 rounded-2xl bg-indigo-500/20 dark:bg-indigo-500/30 animate-ping"></div>
        <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 p-2 shadow-lg shadow-indigo-500/15 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
          <img src={logoImg} alt="QEC-School" className="w-full h-full object-contain" />
        </div>
      </div>
      
      <div className="text-center space-y-2.5 max-w-xs">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          QEC-School
        </h3>
        <div className="w-32 h-1.5 bg-indigo-100 dark:bg-gray-800 rounded-full overflow-hidden mx-auto relative">
          <div className="h-full w-1/2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-full animate-pulse"></div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;

