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

  // Quiz state
  

  useEffect(() => {
    apiFetch(`${API_URL}/blocks/${id}/topics`)
      .then(res => res.json())
      .then(data => {
        setTopics(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    
  }, [activeIndex]);

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

  const activeTopic = topics[activeIndex];

  // Helper to extract Youtube Embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
      const ampersandPosition = embedUrl.indexOf('&');
      if(ampersandPosition !== -1) {
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
            {activeTopic.item_type === 'quiz' && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md shrink-0"><i className="fa-solid fa-check-double mr-1"></i>Test</span>
            )}
            {activeTopic.title}
          </h1>
          
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <button 
              onClick={() => setActiveIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition flex items-center"
            >
              <i className="fa-solid fa-angle-left mr-2"></i> Oldingi dars
            </button>
            
            <Link to="/database" className="hidden sm:flex px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition items-center">
              <i className="fa-solid fa-bars mr-2"></i> Baza
            </Link>
            
            <button 
              onClick={() => setActiveIndex(activeIndex + 1)}
              disabled={activeIndex === topics.length - 1}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center"
            >
              Keyingi dars <i className="fa-solid fa-angle-right ml-2"></i>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl shadow-gray-200 dark:shadow-gray-900/10 min-h-[600px] border border-gray-100 dark:border-gray-800">
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">{activeTopic.title}</h2>
            
            {activeTopic.item_type === 'quiz' ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-clipboard-question"></i>
                   </div>
                     <div>
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bilimni tekshirish</h3>
                     </div>
                  </div>
                  
                  <div className="space-y-8">
                  {(() => {
                    try {
                      let qDataList = JSON.parse(activeTopic.quiz_data);
                      if (!Array.isArray(qDataList)) {
                          qDataList = [{
                              id: 'legacy',
                              question: activeTopic.title,
                              isMultiSelect: qDataList.isMultiSelect,
                              options: qDataList.options
                          }];
                      }
                      
                      return (
                        <>
                          <QuizViewer qDataList={qDataList} topicId={activeTopic.id} />
                        </>
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
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-3 rounded-xl transition ${activeIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-bold transition-colors ${activeIndex === index ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 mt-0.5">
                    <p className={`text-sm font-medium line-clamp-2 ${activeIndex === index ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {topic.title}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonViewer;
