import React, { useState } from 'react';
import { apiFetch } from '../api';

const QUESTION_TYPES = [
  { id: 'single_choice', label: 'Bitta javobni tanlash', icon: 'fa-dot-circle' },
  { id: 'multiple_choice', label: 'Bir nechta javobni tanlash', icon: 'fa-check-square' },
  { id: 'true_false', label: 'To‘g‘ri/Noto‘g‘ri', icon: 'fa-toggle-on' },
  { id: 'short_answer', label: 'Qisqa javob', icon: 'fa-font' },
  { id: 'numeric', label: 'Sonli javob', icon: 'fa-hashtag' },
  { id: 'sequence', label: 'Ketma-ketlikni aniqlash', icon: 'fa-sort-numeric-down' },
  { id: 'matching', label: 'Moslashtirish', icon: 'fa-exchange-alt' },
  { id: 'fill_blanks', label: 'Bo‘sh joylarni to‘ldirish', icon: 'fa-grip-lines' },
  { id: 'dropdown', label: 'Ro‘yxatdan tanlash', icon: 'fa-caret-square-down' },
  { id: 'drag_words', label: 'So‘zlarni sudrab joylashtirish', icon: 'fa-hand-pointer' },
  { id: 'hotspot', label: 'Kerakli sohani tanlash', icon: 'fa-image' },
  { id: 'drag_objects', label: 'Obyektlarni sudrab joylashtirish', icon: 'fa-shapes' },
  { id: 'likert', label: 'Likert shkalasi', icon: 'fa-tasks' },
  { id: 'essay', label: 'Esse', icon: 'fa-align-left' }
];

const QuizBuilder = ({ quizData, setQuizData }) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const addQuestion = (type) => {
    const baseQuestion = {
      id: Date.now().toString(),
      type: type,
      question: '',
      points: 1
    };

    let specificFields = {};
    
    if (type === 'single_choice' || type === 'multiple_choice') {
      specificFields = {
        options: [
          { id: Date.now() + 1, text: '', isCorrect: false },
          { id: Date.now() + 2, text: '', isCorrect: false }
        ]
      };
    } else if (type === 'true_false') {
      specificFields = { correct_answer: 'true' };
    } else if (type === 'short_answer' || type === 'numeric') {
      specificFields = { correct_answer: '' };
    } else if (type === 'matching') {
      specificFields = {
        pairs: [
          { id: Date.now() + 1, left: '', right: '' },
          { id: Date.now() + 2, left: '', right: '' }
        ]
      };
    } else if (type === 'sequence') {
      specificFields = {
        items: [
          { id: Date.now() + 1, text: '' },
          { id: Date.now() + 2, text: '' }
        ]
      };
    } else if (type === 'essay') {
      specificFields = { min_length: 100, max_length: 1000 };
    } else if (type === 'fill_blanks' || type === 'drag_words') {
      specificFields = {
          question: 'Quyidagi matndagi bo\'sh joylarni to\'ldiring:',
          text: 'Misol uchun: Kompyuterning [miyasi] hisoblangan qurilma bu [protsessor].'
      };
    } else if (type === 'dropdown') {
      specificFields = {
        question: "Quyidagi ro'yxatdan mos variantlarni tanlang:",
        fields: [
          { id: Date.now() + 1, label: 'Operatsion tizim', options: 'Windows, Linux, MacOS', correct: 'Windows' }
        ]
      };
    } else if (type === 'hotspot') {
      specificFields = {
        imageUrl: '',
        hotspots: [] // {x, y, radius}
      };
    } else if (type === 'drag_objects') {
      specificFields = {
        zones: [
          { id: 'z1', title: 'Kiritish qurilmalari' },
          { id: 'z2', title: 'Chiqarish qurilmalari' }
        ],
        objects: [
          { id: Date.now() + 1, text: 'Sichqoncha', zoneId: 'z1' },
          { id: Date.now() + 2, text: 'Monitor', zoneId: 'z2' }
        ]
      };
    } else if (type === 'likert') {
      specificFields = {
        scale: [
          { id: Date.now() + 1, label: 'Umuman qo\'shilmayman', value: 1 },
          { id: Date.now() + 2, label: 'Qisman qo\'shilmayman', value: 2 },
          { id: Date.now() + 3, label: 'Neytral', value: 3 },
          { id: Date.now() + 4, label: 'Qo\'shilaman', value: 4 },
          { id: Date.now() + 5, label: 'To\'liq qo\'shilaman', value: 5 },
        ]
      };
    }

    setQuizData([...quizData, { ...baseQuestion, ...specificFields }]);
    setShowTypeSelector(false);
  };

  const removeQuestion = (id) => {
    if (quizData.length <= 1) {
      alert("Kamida bitta savol qolishi kerak!");
      return;
    }
    setQuizData(quizData.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuizData(quizData.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleImageUpload = async (qId, file) => {
      if (!file) return;
      setUploadingImage(true);
      try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await apiFetch('/api/upload', {
              method: 'POST',
              body: formData,
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          });
          const data = await response.json();
          if (!response.ok) {
              throw new Error(data.detail || "Rasmni yuklab bo'lmadi.");
          }
          updateQuestion(qId, 'imageUrl', data.url);
      } catch (err) {
          console.error("Upload error", err);
          alert(err.message || "Rasm yuklashda xatolik yuz berdi.");
      } finally {
          setUploadingImage(false);
      }
  };

  // Specific helpers
  const updateArrItem = (qId, arrName, itemId, field, value) => {
      setQuizData(quizData.map(q => {
          if (String(q.id) === String(qId)) {
              return { 
                ...q, 
                [arrName]: (q[arrName]||[]).map(item => String(item.id) === String(itemId) ? { ...item, [field]: value } : item) 
              };
          }
          return q;
      }));
  };

  const addArrItem = (qId, arrName, newItem) => {
      setQuizData(quizData.map(q => {
          if (String(q.id) === String(qId)) {
              return { ...q, [arrName]: [...(q[arrName]||[]), newItem] };
          }
          return q;
      }));
  };

  const removeArrItem = (qId, arrName, itemId) => {
      setQuizData(quizData.map(q => {
          if (String(q.id) === String(qId)) {
              return { ...q, [arrName]: (q[arrName]||[]).filter(item => String(item.id) !== String(itemId)) };
          }
          return q;
      }));
  };

  const setCorrectOption = (qId, optId) => {
    setQuizData(quizData.map(q => {
      if (q.id === qId) {
        if (q.type === 'single_choice') {
          return { ...q, options: q.options.map(opt => ({ ...opt, isCorrect: opt.id === optId })) };
        } else {
          return { ...q, options: q.options.map(opt => opt.id === optId ? { ...opt, isCorrect: !opt.isCorrect } : opt) };
        }
      }
      return q;
    }));
  };

  const handleHotspotClick = (e, qId, q) => {
      const rect = e.target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newHotspot = { id: Date.now(), x, y, radius: 5 };
      updateQuestion(qId, 'hotspots', [...(q.hotspots||[]), newHotspot]);
  };


  const renderQuestionEditor = (q, qIndex) => {
    const typeInfo = QUESTION_TYPES.find(t => t.id === q.type) || QUESTION_TYPES[0];

    return (
      <div key={q.id} className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{qIndex + 1}-Savol</h4>
                <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-1 rounded flex items-center gap-1">
                    <i className={`fa-solid ${typeInfo.icon}`}></i> {typeInfo.label}
                </span>
            </div>
            <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                <i className="fa-solid fa-trash"></i> O'chirish
            </button>
        </div>
        
        <div>
          <textarea 
            value={q.question}
            onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
            placeholder="Savol matnini (shartini) kiriting..." 
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16" 
            required 
          ></textarea>
        </div>

        {/* Options based on type */}
        {(q.type === 'single_choice' || q.type === 'multiple_choice' || !q.type) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Variantlar <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500">To'g'ri javobni belgilang</p>
            </div>
            <div className="space-y-2">
              {(q.options || []).map((opt, i) => (
                <div key={opt.id} className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setCorrectOption(q.id, opt.id)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${opt.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-green-500'}`}
                  >
                    <i className="fa-solid fa-check text-sm"></i>
                  </button>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{String.fromCharCode(65 + i)}.</span>
                    <input 
                      type="text" 
                      value={opt.text}
                      onChange={(e) => updateArrItem(q.id, 'options', opt.id, 'text', e.target.value)}
                      placeholder="Variant matni..." 
                      className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                    {(q.options || []).length > 2 && (
                      <button type="button" onClick={() => removeArrItem(q.id, 'options', opt.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addArrItem(q.id, 'options', { id: Date.now(), text: '', isCorrect: false })} className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline flex items-center gap-1">
              <i className="fa-solid fa-plus"></i> Variant qo'shish
            </button>
          </div>
        )}

        {q.type === 'true_false' && (
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To'g'ri javobni tanlang:</label>
             <div className="flex gap-4">
                <button type="button" onClick={() => updateQuestion(q.id, 'correct_answer', 'true')} className={`px-4 py-2 rounded-xl border ${q.correct_answer === 'true' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>To'g'ri</button>
                <button type="button" onClick={() => updateQuestion(q.id, 'correct_answer', 'false')} className={`px-4 py-2 rounded-xl border ${q.correct_answer === 'false' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>Noto'g'ri</button>
             </div>
          </div>
        )}

        {(q.type === 'short_answer' || q.type === 'numeric') && (
            <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To'g'ri javob:</label>
             <input type={q.type === 'numeric' ? 'number' : 'text'} value={q.correct_answer || ''} onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)} placeholder="To'g'ri javobni yozing..." className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl" required />
            </div>
        )}

        {q.type === 'matching' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Moslashtirish juftliklari</label>
              <div className="space-y-2">
                {(q.pairs || []).map((pair) => (
                    <div key={pair.id} className="flex gap-3 items-center">
                        <input type="text" placeholder="Chap tomon" value={pair.left} onChange={e => updateArrItem(q.id, 'pairs', pair.id, 'left', e.target.value)} className="flex-1 px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-600" required />
                        <i className="fa-solid fa-arrow-right text-gray-400"></i>
                        <input type="text" placeholder="O'ng tomon" value={pair.right} onChange={e => updateArrItem(q.id, 'pairs', pair.id, 'right', e.target.value)} className="flex-1 px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-600" required />
                        <button type="button" onClick={() => removeArrItem(q.id, 'pairs', pair.id)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                    </div>
                ))}
              </div>
              <button type="button" onClick={() => addArrItem(q.id, 'pairs', {id: Date.now(), left: '', right: ''})} className="mt-3 text-indigo-600 text-sm hover:underline"><i className="fa-solid fa-plus"></i> Juftlik qo'shish</button>
            </div>
        )}

        {q.type === 'sequence' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To'g'ri ketma-ketlikda yozing</label>
              <div className="space-y-2">
                {(q.items || []).map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-bold">{idx + 1}</span>
                        <input type="text" placeholder="Element matni" value={item.text} onChange={e => updateArrItem(q.id, 'items', item.id, 'text', e.target.value)} className="flex-1 px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-600" required />
                        <button type="button" onClick={() => removeArrItem(q.id, 'items', item.id)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                    </div>
                ))}
              </div>
              <button type="button" onClick={() => addArrItem(q.id, 'items', {id: Date.now(), text: ''})} className="mt-3 text-indigo-600 text-sm hover:underline"><i className="fa-solid fa-plus"></i> Element qo'shish</button>
            </div>
        )}

        {q.type === 'essay' && (
            <div>
                <p className="text-sm text-gray-500">O'quvchi bu savolga erkin yozma javob yozadi. Avtomatik tekshirilmaydi.</p>
            </div>
        )}

        {(q.type === 'fill_blanks' || q.type === 'drag_words') && (
            <div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-xl mb-3">
                  Bo'sh qoldirilishi kerak bo'lgan so'zlarni <strong>[kvadrat qavs]</strong> ichiga oling. <br/>
                  <em>Misol: Kompyuterning [miyasi] bu [protsessor] hisoblanadi.</em>
              </div>
              <textarea 
                  value={q.text || ''}
                  onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y h-24" 
                  placeholder="Matnni kiriting..."
                  required
              ></textarea>
            </div>
        )}

        {q.type === 'dropdown' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    Dropdown maydonlari (Ro'yxatdan tanlash)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Har bir maydon uchun nom, variantlar (vergul bilan) va to'g'ri javobni belgilang.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  {(q.fields || []).length} ta maydon
                </span>
              </div>

              <div className="space-y-4">
                {(q.fields || []).map((field, idx) => {
                  const parsedOptions = String(field.options || '')
                    .split(',')
                    .map(o => o.trim())
                    .filter(Boolean);

                  return (
                    <div key={field.id} className="p-4 border rounded-2xl bg-gray-50/70 dark:bg-gray-800/80 dark:border-gray-700 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700/60 pb-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {idx + 1}-maydon
                        </span>
                        {(q.fields || []).length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeArrItem(q.id, 'fields', field.id)} 
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                            title="Ushbu maydonni o'chirish"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                            <span>O'chirish</span>
                          </button>
                        )}
                      </div>

                      {/* 1. Field Label */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Maydon / Savol nomi (Label):
                        </label>
                        <input 
                          type="text" 
                          placeholder="Masalan: Operatsion tizim" 
                          value={field.label || ''} 
                          onChange={e => updateArrItem(q.id, 'fields', field.id, 'label', e.target.value)} 
                          className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                          required 
                        />
                      </div>

                      {/* 2. Options list */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Variantlar ro'yxati (vergul bilan ajrating):
                        </label>
                        <input 
                          type="text" 
                          placeholder="Masalan: Windows, Linux, MacOS" 
                          value={field.options || ''} 
                          onChange={e => updateArrItem(q.id, 'fields', field.id, 'options', e.target.value)} 
                          className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                          required 
                        />
                      </div>

                      {/* 3. Correct answer with smart select & custom input */}
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center justify-between">
                          <span>To'g'ri javob:</span>
                          {parsedOptions.length > 0 && (
                            <span className="text-[11px] font-normal text-gray-500">
                              Variantlardan birini tanlang
                            </span>
                          )}
                        </label>
                        {parsedOptions.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              value={field.correct || ''}
                              onChange={e => updateArrItem(q.id, 'fields', field.id, 'correct', e.target.value)}
                              className="flex-1 px-3.5 py-2.5 border rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              required
                            >
                              <option value="">— To'g'ri javobni tanlang —</option>
                              {parsedOptions.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Yoki qo'lda yozing"
                              value={field.correct || ''}
                              onChange={e => updateArrItem(q.id, 'fields', field.id, 'correct', e.target.value)}
                              className="w-1/3 px-3 py-2 border rounded-xl text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            />
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="To'g'ri javob matni" 
                            value={field.correct || ''} 
                            onChange={e => updateArrItem(q.id, 'fields', field.id, 'correct', e.target.value)} 
                            className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                            required 
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                type="button" 
                onClick={() => addArrItem(q.id, 'fields', { id: Date.now(), label: '', options: '', correct: '' })} 
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Yangi maydon qo'shish</span>
              </button>
            </div>
        )}

        {q.type === 'hotspot' && (
            <div>
              <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rasm URL yoki fayl yuklang:</label>
                      <input type="text" placeholder="https://..." value={q.imageUrl || ''} onChange={e => updateQuestion(q.id, 'imageUrl', e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-600 text-sm mb-2" />
                      
                      <label className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-200 text-sm">
                          {uploadingImage ? 'Yuklanmoqda...' : 'Kompyuterdan rasm tanlash'}
                          <input type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => handleImageUpload(q.id, e.target.files[0])} disabled={uploadingImage}/>
                      </label>
                  </div>
              </div>

              {q.imageUrl && (
                  <div>
                      <p className="text-sm text-gray-500 mb-2">Rasm ustida kerakli joylarga bosib to'g'ri zonalarni yarating:</p>
                      <div className="relative inline-block border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-crosshair max-w-full">
                          <img src={q.imageUrl} alt="Hotspot area" className="max-w-full h-auto" onClick={(e) => handleHotspotClick(e, q.id, q)} />
                          {(q.hotspots || []).map((hs, i) => (
                              <div key={hs.id} className="absolute bg-green-500/50 border-2 border-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: '20px', height: '20px' }} title="O'chirish uchun ikki marta bosing" onDoubleClick={() => removeArrItem(q.id, 'hotspots', hs.id)}>
                                {i+1}
                              </div>
                          ))}
                      </div>
                  </div>
              )}
            </div>
        )}

        {q.type === 'drag_objects' && (
            <div className="space-y-6">
                <div>
                    <h5 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Zonalar (Guruhlar)</h5>
                    <div className="flex gap-2 flex-wrap">
                        {(q.zones || []).map(z => (
                            <div key={z.id} className="flex bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden">
                                <input type="text" value={z.title} onChange={e => updateArrItem(q.id, 'zones', z.id, 'title', e.target.value)} className="px-3 py-1.5 bg-transparent outline-none text-sm w-32" />
                                <button type="button" onClick={() => removeArrItem(q.id, 'zones', z.id)} className="px-2 bg-red-100 text-red-600 hover:bg-red-200"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addArrItem(q.id, 'zones', {id: 'z'+Date.now(), title: 'Yangi zona'})} className="px-3 py-1.5 border border-dashed rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">+ Zona</button>
                    </div>
                </div>

                <div>
                    <h5 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Obyektlar</h5>
                    <div className="space-y-2">
                        {(q.objects || []).map(obj => (
                            <div key={obj.id} className="flex gap-2">
                                <input type="text" placeholder="Obyekt matni..." value={obj.text} onChange={e => updateArrItem(q.id, 'objects', obj.id, 'text', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700" />
                                <select value={obj.zoneId} onChange={e => updateArrItem(q.id, 'objects', obj.id, 'zoneId', e.target.value)} className="w-40 px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
                                    {(q.zones||[]).map(z => <option key={z.id} value={z.id}>{z.title}</option>)}
                                </select>
                                <button type="button" onClick={() => removeArrItem(q.id, 'objects', obj.id)} className="text-gray-400 hover:text-red-500 px-2"><i className="fa-solid fa-trash"></i></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => addArrItem(q.id, 'objects', {id: Date.now(), text: '', zoneId: (q.zones&&q.zones.length>0)?q.zones[0].id:''})} className="mt-2 text-indigo-600 text-sm hover:underline"><i className="fa-solid fa-plus"></i> Obyekt qo'shish</button>
                </div>
            </div>
        )}

        {q.type === 'likert' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shkala elementlari (chapdan o'ngga)</label>
              <div className="space-y-2">
                {(q.scale || []).map((s, idx) => (
                    <div key={s.id} className="flex gap-3 items-center">
                        <span className="w-6 text-center text-sm font-bold text-gray-400">{s.value}</span>
                        <input type="text" value={s.label} onChange={e => updateArrItem(q.id, 'scale', s.id, 'label', e.target.value)} className="flex-1 px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-600 text-sm" required />
                        <button type="button" onClick={() => removeArrItem(q.id, 'scale', s.id)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                    </div>
                ))}
              </div>
              <button type="button" onClick={() => addArrItem(q.id, 'scale', {id: Date.now(), label: '', value: (q.scale||[]).length + 1})} className="mt-3 text-indigo-600 text-sm hover:underline"><i className="fa-solid fa-plus"></i> Shkala qo'shish</button>
              <p className="text-xs text-gray-500 mt-2">Likert shkalasi bo'yicha to'g'ri/noto'g'ri javob bo'lmaydi, u so'rovnoma tipida ishlaydi.</p>
            </div>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {quizData.map((q, index) => renderQuestionEditor(q, index))}
      
      {!showTypeSelector ? (
        <button 
          type="button" 
          onClick={() => setShowTypeSelector(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition font-medium flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-circle-plus text-lg"></i> Yangi savol qo'shish
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg relative">
            <button type="button" onClick={() => setShowTypeSelector(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl"></i></button>
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Test turini tanlang</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {QUESTION_TYPES.map(type => (
                    <button 
                        key={type.id} 
                        type="button"
                        onClick={() => addQuestion(type.id)}
                        className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition text-center group h-24"
                    >
                        <i className={`fa-solid ${type.icon} text-2xl text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors`}></i>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{type.label}</span>
                    </button>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;
