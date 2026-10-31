import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { apiFetch } from '../api';

const QuizViewer = ({ qDataList, topicId }) => {
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [resultQuestions, setResultQuestions] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    setAnswers({});
    setShowResult(false);
    setQuizScore(null);
    setResultQuestions(null);
    setSubmissionError('');
  }, [qDataList]);

  const displayQuestions = resultQuestions || qDataList;

  const handleAnswerChange = (qId, value) => {
    if (showResult) return;
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleNestedAnswerChange = (qId, innerKey, value) => {
    if (showResult) return;
    setAnswers(prev => {
        const current = prev[qId] || {};
        return { ...prev, [qId]: { ...current, [innerKey]: value } };
    });
  };

  const toggleOption = (qId, optId, isMulti) => {
    if (showResult) return;
    setAnswers(prev => {
      const currentQSelections = prev[qId] || {};
      if (isMulti) {
        return { 
          ...prev, 
          [qId]: { ...currentQSelections, [optId]: !currentQSelections[optId] } 
        };
      } else {
        return { 
          ...prev, 
          [qId]: { [optId]: true } 
        };
      }
    });
  };

  const handleSequenceMove = (qId, currentIndex, direction) => {
    if (showResult) return;
    setAnswers(prev => {
        const currentOrder = prev[qId] ? [...prev[qId]] : qDataList.find(q=>q.id===qId).items.map(i=>i.id);
        const newIndex = currentIndex + direction;
        if (newIndex < 0 || newIndex >= currentOrder.length) return prev;
        const temp = currentOrder[currentIndex];
        currentOrder[currentIndex] = currentOrder[newIndex];
        currentOrder[newIndex] = temp;
        return { ...prev, [qId]: currentOrder };
    });
  };
  
  const handleHotspotClick = (e, qId) => {
      if (showResult) return;
      const rect = e.target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      handleAnswerChange(qId, {x, y});
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError('');
    try {
      const response = await apiFetch(`/api/student/topics/${topicId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Test natijasini saqlashda xatolik');
      setQuizScore(data);
      setResultQuestions(data.questions);
      setShowResult(true);
    } catch (error) {
      setSubmissionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {displayQuestions.map((q, qIndex) => {
        const type = q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice');
        const ans = answers[q.id];

        let isCorrectAnswer = false;
        if (showResult) {
            // Simplified check for styling the whole question header
            isCorrectAnswer = true; // By default assume true, we will color individual fields inside.
        }

        return (
          <div key={q.id} className="space-y-4">
            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-start gap-2">
                <span>{qIndex + 1}.</span> 
                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question || '') }}></span>
            </h4>

            {/* SINGLE & MULTIPLE CHOICE */}
            {(type === 'single_choice' || type === 'multiple_choice') && (
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => {
                  const selections = ans || {};
                  const isSelected = !!selections[opt.id];
                  let borderClass = "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10";
                  
                  if (showResult) {
                    if (opt.isCorrect) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/20";
                    else if (isSelected && !opt.isCorrect) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
                    else borderClass = "border-gray-200 dark:border-gray-800 opacity-50";
                  } else if (isSelected) {
                    borderClass = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";
                  }

                  return (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${borderClass}`}>
                      <div className="shrink-0 flex items-center justify-center">
                        {type === 'multiple_choice' || q.isMultiSelect ? (
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <i className="fa-solid fa-check text-xs"></i>}
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex items-center">
                        <span className="font-semibold text-gray-400 dark:text-gray-500 mr-3 w-5 shrink-0 text-center">{String.fromCharCode(65 + i)}.</span>
                        <span className={`font-medium ${showResult && opt.isCorrect ? 'text-green-800 dark:text-green-300' : showResult && isSelected ? 'text-red-800 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {opt.text}
                        </span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isSelected}
                        onChange={() => toggleOption(q.id, opt.id, type === 'multiple_choice' || q.isMultiSelect)}
                        disabled={showResult}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {/* TRUE/FALSE */}
            {type === 'true_false' && (
              <div className="flex gap-4">
                 <button onClick={() => handleAnswerChange(q.id, 'true')} disabled={showResult} className={`px-6 py-3 rounded-xl border font-bold ${ans === 'true' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 border-gray-300'} ${(showResult && String(q.correct_answer)==='true')?'!bg-green-500 !border-green-500 !text-white':''} ${(showResult && ans==='true' && String(q.correct_answer)!=='true')?'!bg-red-500 !border-red-500 !text-white':''}`}>To'g'ri</button>
                 <button onClick={() => handleAnswerChange(q.id, 'false')} disabled={showResult} className={`px-6 py-3 rounded-xl border font-bold ${ans === 'false' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 border-gray-300'} ${(showResult && String(q.correct_answer)==='false')?'!bg-green-500 !border-green-500 !text-white':''} ${(showResult && ans==='false' && String(q.correct_answer)!=='false')?'!bg-red-500 !border-red-500 !text-white':''}`}>Noto'g'ri</button>
              </div>
            )}

            {/* SHORT ANSWER & NUMERIC */}
            {(type === 'short_answer' || type === 'numeric') && (
              <div>
                  <input type={type === 'numeric' ? 'number' : 'text'} disabled={showResult} placeholder="Javobingizni yozing..." value={ans || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className={`w-full max-w-md px-4 py-3 rounded-xl border ${showResult ? ((String(ans).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'}`} />
                  {showResult && (String(ans).trim().toLowerCase() !== String(q.correct_answer).trim().toLowerCase()) && <div className="mt-2 text-sm text-green-600">To'g'ri javob: <span className="font-bold">{q.correct_answer}</span></div>}
              </div>
            )}

            {/* ESSAY */}
            {type === 'essay' && (
              <div>
                  <textarea disabled={showResult} placeholder="Fikringizni yozing..." value={ans || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"></textarea>
                  <p className="text-xs text-gray-500 mt-1">Ushbu savol javobi o'qituvchi tomonidan tekshiriladi.</p>
              </div>
            )}

            {/* SEQUENCE */}
            {type === 'sequence' && (
              <div className="space-y-2">
                 {(ans || q.items.map(i=>i.id)).map((itemId, idx, arr) => {
                     const item = q.items.find(i => i.id === itemId);
                     let isItemCorrect = false;
                     if(showResult) isItemCorrect = q.is_correct && (q.items[idx].id === itemId);
                     return (
                         <div key={itemId} className={`flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-gray-800 ${showResult ? (isItemCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex flex-col gap-1">
                                <button disabled={showResult || idx === 0} onClick={() => handleSequenceMove(q.id, idx, -1)} className="text-gray-400 hover:text-indigo-500 disabled:opacity-30"><i className="fa-solid fa-chevron-up"></i></button>
                                <button disabled={showResult || idx === arr.length - 1} onClick={() => handleSequenceMove(q.id, idx, 1)} className="text-gray-400 hover:text-indigo-500 disabled:opacity-30"><i className="fa-solid fa-chevron-down"></i></button>
                            </div>
                            <span className="font-bold text-gray-400 w-6 text-center">{idx + 1}.</span>
                            <span className="font-medium flex-1 text-gray-800 dark:text-gray-200">{item.text}</span>
                         </div>
                     );
                 })}
                 {showResult && !q.is_correct && (
                     <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm border border-gray-200">
                         <strong>To'g'ri ketma-ketlik:</strong>
                         <ol className="list-decimal pl-5 mt-1 space-y-1">
                             {q.items.map(i => <li key={i.id}>{i.text}</li>)}
                         </ol>
                     </div>
                 )}
              </div>
            )}

            {/* MATCHING */}
            {type === 'matching' && (
                <div className="grid grid-cols-1 gap-3 max-w-2xl">
                    {(q.pairs||[]).map((pair, idx) => {
                        const matches = ans || {};
                        const selectedRight = matches[pair.id] || '';
                        let isMatchCorrect = false;
                        if (showResult) isMatchCorrect = (selectedRight === String(pair.correctRightId ?? pair.right_id ?? pair.id));
                        
                        const rightOptions = q.rightOptions || [...q.pairs]
                          .sort((a,b) => String(a.id).localeCompare(String(b.id)))
                          .map(option => ({ id: option.id, text: option.right }));

                        return (
                            <div key={pair.id} className="flex gap-4 items-center">
                                <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium">{pair.left}</div>
                                <i className="fa-solid fa-arrow-right-arrow-left text-gray-400"></i>
                                <div className="flex-1">
                                    <select disabled={showResult} value={selectedRight} onChange={(e) => handleNestedAnswerChange(q.id, pair.id, e.target.value)} className={`w-full p-3 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none ${showResult ? (isMatchCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300 dark:border-gray-600'}`}>
                                        <option value="" disabled>Tanlang...</option>
                                        {rightOptions.map(ro => (
                                            <option key={ro.id} value={ro.id}>{ro.text ?? ro.right}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FILL BLANKS & DRAG WORDS */}
            {(type === 'fill_blanks' || type === 'drag_words') && (
                <div>
                    {type === 'drag_words' && !showResult && (
                        <div className="mb-4 p-4 bg-gray-50 border rounded-xl flex gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-500 mr-2 mt-1">So'zlar:</span>
                            {(q.words || (q.text||'').split(/\[(.*?)\]/g).filter((_, i) => i%2 !== 0).map((text, id) => ({ id, text })))
                              .map(word => (
                                <div draggable onDragStart={(e) => e.dataTransfer.setData('word', word.text)} key={word.id} className="px-3 py-1 bg-white border border-indigo-200 rounded-lg shadow-sm text-indigo-700 cursor-grab active:cursor-grabbing font-medium text-sm">{word.text}</div>
                            ))}
                        </div>
                    )}
                    <div className="leading-loose text-lg text-gray-800 dark:text-gray-200">
                        {(q.text||'').split(/\[(.*?)\]/g).map((part, i) => {
                            if (i % 2 === 0) return <span key={i}>{part}</span>;
                            
                            const userWord = (ans || {})[i] || '';
                            const isCorrect = String(userWord).trim().toLowerCase() === String(part).trim().toLowerCase();
                            
                            let inputClass = "mx-2 inline-block px-3 py-1 border-b-2 bg-gray-50 focus:bg-white focus:outline-none min-w-[100px] text-center font-medium ";
                            if (showResult) {
                                inputClass += isCorrect ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50";
                            } else {
                                inputClass += "border-gray-300 focus:border-indigo-500 text-indigo-700";
                            }

                            return (
                                <input 
                                    key={i} 
                                    type="text" 
                                    disabled={showResult}
                                    value={userWord} 
                                    onChange={e => handleNestedAnswerChange(q.id, i, e.target.value)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); handleNestedAnswerChange(q.id, i, e.dataTransfer.getData('word')); }}
                                    className={inputClass}
                                    placeholder={type === 'drag_words' ? "Tashlang" : "Yozing..."}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DROPDOWN */}
            {type === 'dropdown' && (
                <div className="space-y-4">
                    {(q.fields || []).map(f => {
                        const userVal = (ans || {})[f.id] || '';
                        const isCorrect = String(userVal).trim().toLowerCase() === String(f.correct).trim().toLowerCase();
                        let selectClass = "ml-3 px-3 py-1.5 border rounded-lg outline-none font-medium ";
                        if (showResult) {
                            selectClass += isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700";
                        } else {
                            selectClass += "border-gray-300 bg-white focus:border-indigo-500 text-indigo-700";
                        }
                        
                        return (
                            <div key={f.id} className="flex items-center text-lg text-gray-800 dark:text-gray-200">
                                <span>{f.label}:</span>
                                <select disabled={showResult} value={userVal} onChange={e => handleNestedAnswerChange(q.id, f.id, e.target.value)} className={selectClass}>
                                    <option value="" disabled>Tanlang...</option>
                                    {(f.options||'').split(',').map(o => o.trim()).filter(o=>o).map((opt, i) => (
                                        <option key={i} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                {showResult && !isCorrect && <span className="ml-3 text-sm text-green-600">To'g'ri: {f.correct}</span>}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* HOTSPOT */}
            {type === 'hotspot' && (
                <div>
                    <p className="text-sm text-gray-500 mb-2">Rasmda so'ralgan qismni bosing:</p>
                    <div className="relative inline-block border rounded-xl overflow-hidden cursor-crosshair">
                        <img src={q.imageUrl} alt="Hotspot area" className="max-w-full h-auto" onClick={(e) => handleHotspotClick(e, q.id)} />
                        
                        {/* Show user click */}
                        {ans && ans.x !== undefined && (
                            <div className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300" style={{ left: `${ans.x}%`, top: `${ans.y}%` }}></div>
                        )}
                        
                        {/* Show correct answers after submit */}
                        {showResult && (q.hotspots||[]).map(hs => (
                            <div key={hs.id} className="absolute w-6 h-6 rounded-full bg-green-500/40 border-2 border-green-500 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ left: `${hs.x}%`, top: `${hs.y}%` }}></div>
                        ))}
                    </div>
                </div>
            )}

            {/* DRAG OBJECTS */}
            {type === 'drag_objects' && (
                <div className="space-y-6">
                    {/* Objects bank */}
                    {!showResult && (
                        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 border rounded-xl">
                            {(q.objects||[]).map(obj => {
                                // If obj is already placed somewhere, don't show here
                                const isPlaced = Object.values(ans||{}).includes(obj.id); // Wait, ans is {objId: zoneId}
                                const isObjPlaced = (ans||{})[obj.id] !== undefined;
                                if (isObjPlaced) return null;

                                return (
                                    <div key={obj.id} draggable onDragStart={e => e.dataTransfer.setData('objId', obj.id)} className="px-4 py-2 bg-white border-2 border-indigo-200 rounded-lg shadow-sm text-indigo-700 cursor-grab active:cursor-grabbing font-medium">
                                        {obj.text}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Zones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(q.zones||[]).map(zone => (
                            <div key={zone.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleNestedAnswerChange(q.id, e.dataTransfer.getData('objId'), zone.id); }} className="min-h-[150px] p-4 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center">
                                <h5 className="font-bold text-indigo-900 mb-3">{zone.title}</h5>
                                <div className="flex flex-wrap gap-2 justify-center w-full">
                                    {(q.objects||[]).filter(o => (ans||{})[o.id] === zone.id).map(obj => {
                                        let objClass = "px-3 py-1.5 bg-white border shadow-sm rounded-lg text-sm font-medium ";
                                        if (showResult) {
                                            objClass += obj.zoneId === zone.id ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50";
                                        } else {
                                            objClass += "border-indigo-200 text-indigo-700 cursor-grab active:cursor-grabbing";
                                        }
                                        return (
                                            <div key={obj.id} draggable={!showResult} onDragStart={e => !showResult && e.dataTransfer.setData('objId', obj.id)} className={objClass}>
                                                {obj.text}
                                                {showResult && obj.zoneId === zone.id && <i className="fa-solid fa-check text-green-500 ml-2"></i>}
                                                {showResult && obj.zoneId !== zone.id && <i className="fa-solid fa-xmark text-red-500 ml-2"></i>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LIKERT SCALE */}
            {type === 'likert' && (
                <div className="overflow-x-auto">
                    <div className="flex justify-between items-center min-w-[500px] p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        {(q.scale||[]).map(s => (
                            <label key={s.id} className="flex flex-col items-center gap-3 cursor-pointer group">
                                <span className="text-xs font-medium text-gray-500 text-center max-w-[80px] leading-tight">{s.label}</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${ans === s.value ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400 bg-white group-hover:border-indigo-400'}`}>
                                    {ans === s.value && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                                </div>
                                <input type="radio" name={`likert-${q.id}`} value={s.value} checked={ans === s.value} onChange={() => handleAnswerChange(q.id, s.value)} className="hidden" disabled={showResult} />
                            </label>
                        ))}
                    </div>
                </div>
            )}

          </div>
        );
      })}

      {showResult && quizScore && (
        <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
           <div>
             <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-1">Test Natijasi</h4>
             <p className="text-indigo-700 dark:text-indigo-300">Bu urinishda {quizScore.correct}/{quizScore.total}; eng yaxshi natijangiz {quizScore.best_score}/{quizScore.total}. Urinishlar: {quizScore.attempt_count}.</p>
           </div>
           <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
              {Math.round((quizScore.best_score / (quizScore.total||1)) * 100)}%
           </div>
        </div>
      )}

      {submissionError && <p role="alert" className="text-sm text-red-600">{submissionError}</p>}

      <div className="mt-8 flex justify-end">
        {!showResult ? (
           <button 
             onClick={handleSubmit}
             disabled={Object.keys(answers).length === 0 || isSubmitting}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
           >
             {isSubmitting ? 'Saqlanmoqda...' : 'Javobni tasdiqlash'}
          </button>
        ) : (
          <button 
            onClick={() => {
              setAnswers({});
              setShowResult(false);
              setQuizScore(null);
              setResultQuestions(null);
            }}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all active:scale-95"
          >
            Qaytadan urinish
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizViewer;
