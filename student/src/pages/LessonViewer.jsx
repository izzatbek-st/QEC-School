import React, { useState, useEffect } from 'react';
import QuizViewer from '../components/QuizViewer';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';
import DOMPurify from 'dompurify';
import './LessonContent.css';

const LessonViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lockedModal, setLockedModal] = useState({ isOpen: false, title: '', reason: '' });

  const fetchTopics = () => {
    return apiFetch(`${API_URL}/blocks/${id}/topics`)
      .then(res => res.json())
      .then(data => {
        setTopics(data);
        setLoading(false);
        return data;
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTopics();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;
  }

  if (topics.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mavzular yo'q</h2>
        <p className="text-gray-500 mb-6">Bu blok uchun hali hech qanday dars qo'shilmagan.</p>
        <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition">
          Orqaga qaytish
        </Link>
      </div>
    );
  }

  const activeTopic = topics[activeIndex] || topics[0];
  const nextTopic = activeIndex < topics.length - 1 ? topics[activeIndex + 1] : null;

  const handleNextLesson = () => {
    if (activeIndex >= topics.length - 1) return;
    if (nextTopic?.is_locked) {
      setLockedModal({
        isOpen: true,
        title: nextTopic.title,
        reason: nextTopic.locked_reason || "Keyingi mavzuga o'tish uchun avvalgi testdan o'qituvchi belgilagan foizda o'tishingiz lozim."
      });
      return;
    }
    setActiveIndex(activeIndex + 1);
  };

  const handlePrevLesson = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleSelectTopic = (index) => {
    const targetTopic = topics[index];
    if (targetTopic?.is_locked) {
      setLockedModal({
        isOpen: true,
        title: targetTopic.title,
        reason: targetTopic.locked_reason || "Ushbu mavzu qulflangan."
      });
      return;
    }
    setActiveIndex(index);
  };

  // Helper to extract Youtube Embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
      const ampersandPosition = embedUrl.indexOf('&');
      if (ampersandPosition !== -1) {
        embedUrl = embedUrl.substring(0, ampersandPosition);
      }
    } else if (url.includes('youtu.be/')) {
      embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return embedUrl;
  };

  const embedUrl = getEmbedUrl(activeTopic.video_url);
  const isYoutube = embedUrl && embedUrl.includes('youtube.com/embed/');

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Left side: Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Top Navigation Bar */}
        <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-gray-200 dark:shadow-gray-900/10 border border-gray-100 dark:border-gray-800">
          <h1 className="text-xl font-bold font-sans tracking-tight truncate mr-4 flex items-center gap-2">
            <span className="text-indigo-600 dark:text-indigo-400 mr-1">{activeIndex + 1}.</span>
            {activeTopic.item_type === 'quiz' ? (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md shrink-0">
                <i className="fa-solid fa-check-double mr-1"></i>Test
              </span>
            ) : null}
            {activeTopic.is_locked ? (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md shrink-0 flex items-center gap-1">
                <i className="fa-solid fa-lock text-[10px]"></i>Qulflangan
              </span>
            ) : null}
            <span className="truncate">{activeTopic.title}</span>
          </h1>
          
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <button 
              onClick={handlePrevLesson}
              disabled={activeIndex === 0}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition flex items-center"
            >
              <i className="fa-solid fa-angle-left mr-2"></i> Oldingi dars
            </button>
            
            <Link to="/database" className="hidden sm:flex px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition items-center">
              <i className="fa-solid fa-bars mr-2"></i> Baza
            </Link>
            
            <button 
              onClick={handleNextLesson}
              disabled={activeIndex === topics.length - 1}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center ${
                nextTopic?.is_locked
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300/50 cursor-pointer shadow-sm'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/20'
              }`}
              title={nextTopic?.is_locked ? nextTopic.locked_reason : undefined}
            >
              <span>Keyingi dars</span>
              {nextTopic?.is_locked ? (
                <i className="fa-solid fa-lock ml-2 text-xs"></i>
              ) : (
                <i className="fa-solid fa-angle-right ml-2"></i>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl shadow-gray-200 dark:shadow-gray-900/10 min-h-[600px] border border-gray-100 dark:border-gray-800">
          {activeTopic.is_locked ? (
            <div className="py-20 px-4 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-sm">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Mavzu hozircha qulflangan
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {activeTopic.locked_reason || "Ushbu mavzuga o'tish uchun undan oldingi testdan o'qituvchi belgilagan foizda o'tishingiz lozim."}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const firstUnlocked = topics.findIndex(t => !t.is_locked);
                    setActiveIndex(firstUnlocked >= 0 ? firstUnlocked : 0);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Ochiq darsga qaytish
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Video Player */}
              {embedUrl && (
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-8 shadow-2xl relative">
                  {isYoutube ? (
                    <iframe 
                      src={embedUrl} 
                      className="w-full h-full absolute top-0 left-0" 
                      title={activeTopic.title}
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video 
                      src={embedUrl} 
                      controls 
                      className="w-full h-full absolute top-0 left-0 outline-none object-contain bg-black"
                      controlsList="nodownload"
                    ></video>
                  )}
                </div>
              )}

              {/* Lesson Markdown Content or Quiz */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                  {activeTopic.title}
                </h2>
                
                {activeTopic.item_type === 'quiz' ? (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto">
                    <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                          <i className="fa-solid fa-clipboard-question"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bilimni tekshirish</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            O'tish chegarasi: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{activeTopic.passing_score ?? 70}%</strong>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <i className="fa-solid fa-bullseye mr-1.5"></i>Minimal: {activeTopic.passing_score ?? 70}%
                      </span>
                    </div>
                      
                    <div className="space-y-8">
                      {(() => {
                        try {
                          let qDataList = [];
                          if (activeTopic.attempt && activeTopic.attempt.questions) {
                            qDataList = activeTopic.attempt.questions;
                          } else if (activeTopic.quiz_data) {
                            qDataList = JSON.parse(activeTopic.quiz_data);
                            if (!Array.isArray(qDataList)) {
                              qDataList = [{
                                id: 'legacy',
                                question: activeTopic.title,
                                isMultiSelect: qDataList.isMultiSelect,
                                options: qDataList.options
                              }];
                            }
                          }
                          
                          return (
                            <QuizViewer 
                              qDataList={qDataList} 
                              topicId={activeTopic.id} 
                              initialAttempt={activeTopic.attempt}
                              isCompleted={activeTopic.completed}
                              passingScore={activeTopic.passing_score ?? 70}
                              onComplete={(data) => {
                                fetchTopics();
                              }}
                            />
                          );
                        } catch(e) {
                          return <p className="text-red-500">Test ma'lumotlarida xatolik: {e.message}</p>;
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="ql-snow">
                    <div className="ql-editor p-0 text-gray-800 dark:text-gray-300 font-sans leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeTopic.content || '') }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: Topics Playlist Sidebar */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200 dark:shadow-gray-900/10 border border-gray-100 dark:border-gray-800 p-4 sticky top-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-2">Mavzular ro'yxati</h3>
          <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">
            {topics.map((topic, index) => (
              <button 
                key={topic.id}
                onClick={() => handleSelectTopic(index)}
                className={`w-full text-left p-3 rounded-xl transition ${
                  topic.is_locked
                    ? 'opacity-70 hover:opacity-100 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 border border-transparent cursor-pointer'
                    : activeIndex === index 
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 shadow-sm' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                    topic.is_locked
                      ? 'bg-amber-100/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : activeIndex === index 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : topic.completed 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {topic.is_locked ? (
                      <i className="fa-solid fa-lock text-[10px]"></i>
                    ) : topic.completed ? (
                      <i className="fa-solid fa-check text-xs"></i>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="flex-1 mt-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {topic.is_locked ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1">
                          <i className="fa-solid fa-lock text-[9px]"></i> Qulflangan
                        </span>
                      ) : topic.item_type === 'quiz' ? (
                        topic.completed ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Topshirildi
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Test ({topic.passing_score ?? 70}%)
                          </span>
                        )
                      ) : null}
                    </div>
                    <p className={`text-sm font-medium line-clamp-2 ${
                      topic.is_locked
                        ? 'text-gray-400 dark:text-gray-500'
                        : activeIndex === index 
                          ? 'text-indigo-900 dark:text-indigo-200 font-bold' 
                          : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {topic.title}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOCKED TOPIC MODAL / ALERT */}
      {lockedModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <i className="fa-solid fa-lock"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {lockedModal.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {lockedModal.reason}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLockedModal({ isOpen: false, title: '', reason: '' })}
                className="w-full py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white text-sm font-bold rounded-xl transition active:scale-95 shadow-md"
              >
                Tushundim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonViewer;
