import React, { useState, useEffect, useRef, useMemo } from 'react';
import QuizBuilder from '../components/QuizBuilder';
import { useParams, Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

window.Quill = Quill;
import BlotFormatter from 'quill-blot-formatter';
if (BlotFormatter && BlotFormatter.default) {
  Quill.register('modules/blotFormatter', BlotFormatter.default);
} else if (BlotFormatter) {
  Quill.register('modules/blotFormatter', BlotFormatter);
}

const BlockDetails = () => {
  const { id } = useParams();
  const [topics, setTopics] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicContent, setTopicContent] = useState('');
  
  // Quiz specific state
  const [quizData, setQuizData] = useState([
    {
      id: Date.now(),
      question: '',
      isMultiSelect: false,
      options: [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false }
      ]
    }
  ]);
  
  const quillRef = useRef(null);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Faylni yuklab bo\'lmadi.');
      }
      return data.url;
    } catch (e) {
      console.error(e);
      alert(e.message || 'Yuklashda xatolik yuz berdi');
      return null;
    }
  };

  const fetchTopics = () => {
    apiFetch(`${API_URL.replace('/teacher', '')}/blocks/${id}/topics`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTopics(data);
        } else {
          console.error("Kutilmagan javob:", data);
          setTopics([]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTopics();
  }, [id]);

  const handleDelete = (topicId) => {
    if (!window.confirm("Rostdan ham buni o'chirmoqchimisiz?")) return;
    apiFetch(`${API_URL}/topics/${topicId}`, { method: 'DELETE' })
      .then(() => fetchTopics())
      .catch(console.error);
  };

  const handleSaveTopic = (e) => {
    e.preventDefault();
    const title = e.target.elements.title.value;
    const video_url = e.target.elements.video_url.value;
    
    const payload = {
      title,
      video_url: video_url || null,
      content: topicContent,
      order_index: topics.length,
      item_type: 'lesson',
      quiz_data: null
    };

    const url = editingTopic 
      ? `${API_URL}/topics/${editingTopic.id}`
      : `${API_URL}/blocks/${id}/topics`;
      
    apiFetch(url, {
      method: editingTopic ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
      fetchTopics();
      setIsModalOpen(false);
      setEditingTopic(null);
    })
    .catch(console.error);
  };

  const handleSaveQuiz = (e) => {
    e.preventDefault();
    const title = e.target.elements.title.value;
    const passing_score = parseInt(e.target.elements.passing_score?.value || '70', 10);
    
    for (let i = 0; i < quizData.length; i++) {
       const q = quizData[i];
       if (!q.question || !q.question.trim()) {
           alert(`${i + 1}-savol matnini kiriting!`);
           return;
       }
       const type = q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice');
       if (type === 'single_choice' || type === 'multiple_choice') {
           const options = Array.isArray(q.options) ? q.options : [];
           if (options.length === 0 || !options.some(opt => opt.isCorrect)) {
             alert(`${i + 1}-savol uchun kamida bitta to'g'ri javobni belgilang!`);
             return;
           }
           if (options.some(opt => !opt.text || !opt.text.trim())) {
             alert(`${i + 1}-savolning barcha variantlar matnini kiriting yoki bo'sh variantlarni o'chirib tashlang!`);
             return;
           }
       }
    }

    const payload = {
      title,
      video_url: null,
      content: '', // Question text is now in quiz_data
      order_index: editingTopic ? editingTopic.order_index : topics.length,
      item_type: 'quiz',
      quiz_data: JSON.stringify(quizData),
      passing_score: isNaN(passing_score) ? 70 : passing_score
    };

    const url = editingTopic 
      ? `${API_URL}/topics/${editingTopic.id}`
      : `${API_URL}/blocks/${id}/topics`;
      
    apiFetch(url, {
      method: editingTopic ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Testni saqlashda xatolik yuz berdi");
      }
      return data;
    })
    .then(() => {
      fetchTopics();
      setIsQuizModalOpen(false);
      setEditingTopic(null);
    })
    .catch(err => {
      console.error(err);
      alert(err.message || "Testni saqlashda xatolik yuz berdi");
    });
  };

  const openEditModal = (topic) => {
    setEditingTopic(topic);
    if (topic.item_type === 'quiz') {
      try {
        let parsed = typeof topic.quiz_data === 'string' ? JSON.parse(topic.quiz_data) : topic.quiz_data;
        if (!Array.isArray(parsed)) {
          parsed = [{
            id: Date.now().toString(),
            type: parsed?.isMultiSelect ? 'multiple_choice' : 'single_choice',
            question: topic.title,
            isMultiSelect: parsed?.isMultiSelect || false,
            options: parsed?.options || []
          }];
        } else {
          parsed = parsed.map((q, idx) => ({
            ...q,
            id: q.id || (Date.now() + idx).toString(),
            type: q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice'),
            options: Array.isArray(q.options) ? q.options : (['single_choice', 'multiple_choice'].includes(q.type) ? [] : undefined)
          }));
        }
        setQuizData(parsed);
      } catch (e) {
        console.error("Quiz ma'lumotlarini o'qishda xatolik", e);
        setQuizData([]);
      }
      setIsQuizModalOpen(true);
    } else {
      setTopicContent(DOMPurify.sanitize(topic?.content || ''));
      setIsModalOpen(true);
    }
  };

  const openNewModal = () => {
    setEditingTopic(null);
    setTopicContent('');
    setIsModalOpen(true);
  };

  const openNewQuizModal = () => {
    setEditingTopic(null);
    setQuizData([
      {
        id: Date.now().toString(),
        type: 'single_choice',
        question: '',
        isMultiSelect: false,
        options: [
          { id: Date.now() + 1, text: '', isCorrect: false },
          { id: Date.now() + 2, text: '', isCorrect: false }
        ]
      }
    ]);
    setIsQuizModalOpen(true);
  };

          const addQuizOption = (qId) => {
    setQuizData(prev => prev.map(q => q.id === qId ? { ...q, options: [...q.options, { id: Date.now(), text: '', isCorrect: false }] } : q));
  };

  const updateQuizOption = (qId, optId, text) => {
    setQuizData(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.map(opt => opt.id === optId ? { ...opt, text } : opt) };
      }
      return q;
    }));
  };

  const toggleQuizCorrectAnswer = (qId, optId) => {
    setQuizData(prev => prev.map(q => {
      if (q.id === qId) {
        const isMulti = q.isMultiSelect;
        return {
          ...q,
          options: q.options.map(opt => {
            if (opt.id === optId) {
              return { ...opt, isCorrect: !opt.isCorrect };
            }
            if (!isMulti && !opt.isCorrect) {
              return opt;
            }
            if (!isMulti && opt.isCorrect) {
              return { ...opt, isCorrect: false };
            }
            return opt;
          })
        };
      }
      return q;
    }));
  };

  const removeQuizOption = (qId, optId) => {
    setQuizData(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter(opt => opt.id !== optId) };
      }
      return q;
    }));
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const url = await uploadFile(file);
        if (url) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
        }
      }
    };
  };

  const videoHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const url = await uploadFile(file);
        if (url) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'video', url);
        }
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        video: videoHandler
      }
    },
    blotFormatter: {}
  }), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/database" className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm border border-gray-100 dark:border-gray-700 transition">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blok Tarkibi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Blok ichidagi dars va testlarni boshqarish.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-300 w-full sm:w-auto">
          Jami: <span className="font-bold text-indigo-600">{topics.length}</span> ta element
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button onClick={openNewQuizModal} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center space-x-2">
            <i className="fa-solid fa-file-circle-question"></i>
            <span>Yangi test</span>
          </button>
          <button onClick={openNewModal} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center space-x-2">
            <i className="fa-solid fa-plus"></i>
            <span>Yangi mavzu</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {topics.map((topic, index) => (
          <div key={topic.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row gap-6 items-start ${topic.item_type === 'quiz' ? 'border-green-100 dark:border-green-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
            <div className="flex-1 w-full">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 flex-wrap">
                  <span className="text-indigo-600 min-w-6">{index + 1}.</span>
                  {topic.item_type === 'quiz' ? (
                    <>
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md shrink-0"><i className="fa-solid fa-check-double mr-1"></i>Test</span>
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-md shrink-0 font-medium">
                        <i className="fa-solid fa-bullseye mr-1"></i>O'tish bali: {topic.passing_score ?? 70}%
                      </span>
                    </>
                  ) : (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-md shrink-0"><i className="fa-solid fa-book-open mr-1"></i>Dars</span>
                  )}
                  <span className="line-clamp-1">{topic.title}</span>
                </h3>
                <div className="flex space-x-2 shrink-0 ml-4">
                  <button onClick={() => openEditModal(topic)} className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 flex items-center justify-center transition">
                    <i className="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button onClick={() => handleDelete(topic.id)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-red-700 flex items-center justify-center transition">
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
              
              {topic.item_type === 'quiz' && topic.quiz_data && (() => {
                try {
                  let qDataList = [];
                  const parsed = typeof topic.quiz_data === 'string' ? JSON.parse(topic.quiz_data) : topic.quiz_data;
                  if (Array.isArray(parsed)) {
                    qDataList = parsed;
                  } else if (parsed && typeof parsed === 'object') {
                    qDataList = [{
                      id: 'legacy',
                      question: topic.title,
                      type: parsed.isMultiSelect ? 'multiple_choice' : 'single_choice',
                      isMultiSelect: !!parsed.isMultiSelect,
                      options: Array.isArray(parsed.options) ? parsed.options : []
                    }];
                  }

                  if (!Array.isArray(qDataList) || qDataList.length === 0) {
                    return (
                      <div className="mt-3 ml-8 text-xs text-gray-400 italic">
                        Savollar mavjud emas.
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 ml-8 space-y-4">
                      {qDataList.map((q, qIndex) => {
                        if (!q) return null;
                        const type = q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice');
                        const options = Array.isArray(q.options) ? q.options : [];

                        return (
                          <div key={q.id || qIndex} className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-semibold text-gray-800 dark:text-gray-200 text-[15px]">
                                {qIndex + 1}. {q.question || topic.title || 'Savol'}
                              </p>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0">
                                {type === 'multiple_choice' ? "Ko'p variantli" :
                                 type === 'true_false' ? "To'g'ri/Noto'g'ri" :
                                 type === 'short_answer' ? "Qisqa javob" :
                                 type === 'numeric' ? "Sonli javob" :
                                 type === 'matching' ? "Moslashtirish" :
                                 type === 'sequence' ? "Ketma-ketlik" :
                                 type === 'fill_blanks' ? "Bo'sh joylar" :
                                 type === 'dropdown' ? "Ro'yxatdan tanlash" :
                                 type === 'essay' ? "Esse" :
                                 "Bir variantli test"}
                              </span>
                            </div>

                            {/* Options for single/multiple choice */}
                            {options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {options.map((opt, i) => (
                                  <div 
                                    key={opt.id || i} 
                                    className={`text-sm px-3 py-2 rounded-lg border flex items-center justify-between ${
                                      opt.isCorrect 
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-medium' 
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                                      <span>{opt.text || ''}</span>
                                    </div>
                                    {opt.isCorrect && <i className="fa-solid fa-circle-check text-green-600 dark:text-green-400 shrink-0 ml-2"></i>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* True/False preview */}
                            {type === 'true_false' && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-500">To'g'ri javob:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {q.correct_answer === 'true' ? "To'g'ri" : "Noto'g'ri"}
                                </span>
                              </div>
                            )}

                            {/* Short answer / Numeric preview */}
                            {(type === 'short_answer' || type === 'numeric') && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-500">To'g'ri javob:</span>
                                <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                                  {q.correct_answer || "—"}
                                </span>
                              </div>
                            )}

                            {/* Matching preview */}
                            {type === 'matching' && Array.isArray(q.pairs) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                                {q.pairs.map((p, idx) => (
                                  <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300">{p.left}</span>
                                    <i className="fa-solid fa-arrow-right text-gray-400 mx-2"></i>
                                    <span className="font-bold text-green-600 dark:text-green-400">{p.right}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Sequence preview */}
                            {type === 'sequence' && Array.isArray(q.items) && (
                              <div className="space-y-1.5 mt-2 text-xs">
                                {q.items.map((item, idx) => (
                                  <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                    <span className="font-bold text-indigo-600">{idx + 1}.</span>
                                    <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                } catch (err) {
                  console.error("Test ma'lumotlarini ko'rsatishda xatolik:", err);
                  return (
                    <div className="mt-3 ml-8 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
                      Test ma'lumotlarini o'qishda xatolik yuz berdi.
                    </div>
                  );
                }
              })()}

              {topic.item_type !== 'quiz' && (
                <>
                  {topic.video_url && (
                    <div className="mb-4 ml-8 inline-flex items-center space-x-2 text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                      <i className="fa-brands fa-youtube"></i>
                      <span>Video biriktirilgan</span>
                    </div>
                  )}
                  
                  <div className="ml-8 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-32 overflow-hidden relative">
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 dark:from-gray-900/50 to-transparent"></div>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(topic.content || '') }} />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {topics.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <i className="fa-solid fa-list-check text-2xl"></i>
            </div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Hozircha ma'lumot yo'q</h3>
            <p className="text-sm text-gray-500">Bu blok uchun dars yoki test yarating.</p>
          </div>
        )}
      </div>

      {/* LESSON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-book-open text-indigo-500"></i>
                {editingTopic ? "Darsni tahrirlash" : "Yangi dars yaratish"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveTopic} className="flex-1 overflow-y-auto py-4 space-y-5 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mavzu Sarlavhasi <span className="text-red-500">*</span></label>
                  <input type="text" name="title" defaultValue={editingTopic?.title || ''} placeholder="Masalan: 1-dars. O'zgaruvchilar" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asosiy Video (Havola yoki Fayl yuklash)</label>
                  <div className="flex space-x-2">
                    <input type="text" id="video_url_input" name="video_url" defaultValue={editingTopic?.video_url || ''} placeholder="YouTube yoki MP4 havolasi" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl flex items-center justify-center transition shrink-0">
                      <i className="fa-solid fa-upload"></i>
                      <input type="file" className="hidden" accept="video/mp4,video/webm,video/ogg" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await uploadFile(file);
                          if (url) {
                            document.getElementById('video_url_input').value = url;
                          }
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col flex-1 h-[400px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dars Matni (Word stili) <span className="text-red-500">*</span>
                </label>
                <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden quill-wrapper h-[calc(100%-30px)] resize-y overflow-auto min-h-[300px]">
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow" 
                    value={topicContent} 
                    onChange={setTopicContent} 
                    modules={modules}
                    className="h-full flex flex-col"
                    placeholder="Bu yerga dars matnini yozing, rasmlar va videolar joylang..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition">{editingTopic ? "Saqlash" : "Mavzuni yaratish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUIZ MODAL */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-file-circle-question text-green-500"></i>
                {editingTopic ? "Testni tahrirlash" : "Yangi test yaratish"}
              </h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveQuiz} className="flex-1 overflow-y-auto py-4 space-y-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Test Sarlavhasi <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    name="title" 
                    defaultValue={editingTopic?.title || ''} 
                    placeholder="Masalan: 1-Mavzu yuzasidan test" 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    O'tish foizi (%) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      name="passing_score" 
                      min="1"
                      max="100"
                      defaultValue={editingTopic?.passing_score ?? 70} 
                      placeholder="70" 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                      required 
                    />
                    <span className="absolute right-3.5 top-3.5 text-gray-400 font-bold text-sm">%</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Keyingi mavzularni ochish uchun
                  </p>
                </div>
              </div>

              <QuizBuilder quizData={quizData} setQuizData={setQuizData} />

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsQuizModalOpen(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Bekor qilish</button>
                <button type="submit" className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md shadow-green-600/20 transition">{editingTopic ? "Saqlash" : "Testni yaratish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockDetails;
