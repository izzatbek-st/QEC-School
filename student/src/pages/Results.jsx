import React, { useState, useEffect } from 'react';
import { API_URL, apiFetch } from '../api';

const Results = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/results/leaderboard`)
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">O'quvchi va Guruh Natijalari</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Imtihon natijalari, o'zlashtirish ko'rsatkichlari va reyting.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top O'quvchilar Reytingi</h3>
        
        {loading ? (
          <p className="text-gray-500">Yuklanmoqda...</p>
        ) : students.length > 0 ? (
          <div className="space-y-4">
            {students.map((student, idx) => {
              let badgeColor = "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200";
              if (idx === 0) badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
              else if (idx === 1) badgeColor = "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200";
              else if (idx === 2) badgeColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

              let gradeText = "Yaxshi";
              let gradeBadge = "bg-blue-50 text-blue-600";
              if (student.score >= 86) {
                 gradeText = "A'lo";
                 gradeBadge = "bg-emerald-50 text-emerald-600";
              } else if (student.score < 56) {
                 gradeText = "Qoniqarsiz";
                 gradeBadge = "bg-red-50 text-red-600";
              }

              return (
                <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <span className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ${badgeColor}`}>
                      {idx + 1}
                    </span>
                    <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${student.color || 'bg-indigo-100 text-indigo-600'}`}>
                      {student.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{student.group_name} ({student.score} ball)</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full dark:bg-opacity-30 ${gradeBadge}`}>
                    {gradeText}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Hozircha natijalar yo'q.</p>
        )}
      </div>
    </div>
  );
};

export default Results;
