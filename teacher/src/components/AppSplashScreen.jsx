import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo_qec_school.webp';

const AppSplashScreen = ({ title = "O'qituvchi Paneli", onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Tizim ishga tushirilmoqda...");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200; // 1.2s total smooth animation

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(rawProgress);

      if (rawProgress < 35) {
        setStatusText("Boshqaruv paneli yuklanmoqda...");
      } else if (rawProgress < 75) {
        setStatusText("Guruhlar va ma'lumotlar ulanmoqda...");
      } else if (rawProgress < 98) {
        setStatusText("Xush kelibsiz!");
      } else {
        setStatusText("Tayyor!");
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setProgress(100);
        setIsExiting(true);
        setTimeout(() => {
          onFinish?.();
        }, 450); // exit fade duration
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div 
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onFinish?.(), 200);
      }}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 select-none transition-all duration-500 ease-out cursor-pointer ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 60%, #020617 100%)'
      }}
    >
      {/* Top decorative ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top spacer / subtle brand pill */}
      <div className="pt-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold tracking-wider uppercase shadow-lg shadow-black/20">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
          <span>Boshqaruv Tizimi</span>
        </div>
      </div>

      {/* Center 3D Motion Logo + Typography */}
      <div className="flex flex-col items-center text-center relative z-10 my-auto">
        {/* Pulsing Aura Rings */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-36 h-36 rounded-3xl bg-indigo-500/20 animate-ping duration-1000 pointer-events-none"></div>
          <div className="absolute w-44 h-44 rounded-full border border-indigo-400/20 animate-spin [animation-duration:8s] pointer-events-none"></div>
          
          {/* Main Floating Logo Card */}
          <div className="relative w-28 h-28 rounded-3xl bg-white p-2.5 shadow-2xl shadow-indigo-500/40 border border-white/30 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img 
              src={logoImg} 
              alt="QEC-School" 
              className="w-full h-full object-contain rounded-2xl" 
            />
          </div>
        </div>

        {/* Brand Name with Gradient Motion */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2">
          <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent drop-shadow-md">
            QEC-School
          </span>
        </h1>
        <p className="text-sm font-semibold tracking-wide text-indigo-300 uppercase">
          {title}
        </p>
      </div>

      {/* Bottom Progress Bar + Status */}
      <div className="w-full max-w-xs relative z-10 pb-6 flex flex-col items-center space-y-3">
        {/* Progress track */}
        <div className="w-full h-2 bg-white/10 backdrop-blur-md rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-75 ease-out shadow-lg shadow-indigo-500/50 relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
          </div>
        </div>

        {/* Status text + Percentage */}
        <div className="w-full flex items-center justify-between text-xs text-indigo-200/80 font-medium px-1">
          <span className="truncate">{statusText}</span>
          <span className="font-mono font-bold text-white ml-2">{progress}%</span>
        </div>

        {/* Small tip */}
        <p className="text-[11px] text-gray-400/60 pt-1">
          O'tish uchun ekranga teging
        </p>
      </div>
    </div>
  );
};

export default AppSplashScreen;
