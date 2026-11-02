import React, { useState } from 'react';
import DOMPurify from 'dompurify';

const QuizMistakesModal = ({ isOpen, onClose, attempt, onResetAttempt }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'wrong', 'correct'

  if (!isOpen || !attempt) return null;

  const questions = attempt.questions || [];
  const total = attempt.total || questions.length;
  const correct = attempt.correct ?? (questions.filter(q => q.is_correct).length);
  const incorrect = attempt.incorrect ?? (total - correct);
  const percentage = attempt.percentage ?? Math.round((correct / (total || 1)) * 100);

  const filteredQuestions = questions.filter(q => {
    if (filter === 'wrong') return !q.is_correct;
    if (filter === 'correct') return !!q.is_correct;
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeLabel = (type, isMulti) => {
    switch (type) {
      case 'single_choice': return 'Bitta to\'g\'ri javob';
      case 'multiple_choice': return isMulti ? 'Bir nechta to\'g\'ri javob' : 'Bitta to\'g\'ri javob';
      case 'true_false': return 'To\'g\'ri / Noto\'g\'ri';
      case 'short_answer': return 'Qisqa matnli javob';
      case 'numeric': return 'Raqamli javob';
      case 'sequence': return 'Ketma-ketlik';
      case 'matching': return 'Moslashtirish';
      case 'fill_blanks': return 'Bo\'sh joyni to\'ldirish';
      case 'drag_words': return 'So\'zlarni joylashtirish';
      case 'dropdown': return 'Ochiladigan ro\'yxat';
      default: return 'Test savoli';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                Topshirilgan test tekshiruvi
              </span>
              {attempt.block_title && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • {attempt.block_title}
                </span>
              )}
              {attempt.created_at && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <i className="fa-regular fa-clock"></i> {formatDate(attempt.created_at)}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {attempt.topic_title || 'Test natijasi'}
            </h2>
            {attempt.student_name && (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {attempt.student_initials || attempt.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {attempt.student_name}
                  </span>
                  {attempt.group_name && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({attempt.group_name})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center transition shrink-0"
            title="Yopish"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                <span>Jami savollar</span>
                <i className="fa-solid fa-clipboard-list text-gray-400"></i>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {total} <span className="text-xs font-normal text-gray-400">ta</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
                <span>To'g'ri javoblar</span>
                <i className="fa-solid fa-circle-check text-emerald-500"></i>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {correct} <span className="text-xs font-normal text-emerald-700/60 dark:text-emerald-400/60">ta</span>
              </div>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold mb-1">
                <span>Xato javoblar</span>
                <i className="fa-solid fa-circle-xmark text-rose-500"></i>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {incorrect} <span className="text-xs font-normal text-rose-700/60 dark:text-rose-400/60">ta</span>
              </div>
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-1">
                <span>O'zlashtirish</span>
                <i className="fa-solid fa-award text-indigo-500"></i>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {percentage}%
              </div>
            </div>
          </div>

          {/* FILTER BUTTONS */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>Barcha savollar</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-black/10 dark:bg-white/20">
                {total}
              </span>
            </button>

            <button
              onClick={() => setFilter('wrong')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                filter === 'wrong'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40'
              }`}
            >
              <i className="fa-solid fa-circle-xmark text-xs"></i>
              <span>Faqat xatolar</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-rose-200/60 dark:bg-rose-800/60">
                {incorrect}
              </span>
            </button>

            <button
              onClick={() => setFilter('correct')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                filter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40'
              }`}
            >
              <i className="fa-solid fa-circle-check text-xs"></i>
              <span>To'g'ri javoblar</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-emerald-200/60 dark:bg-emerald-800/60">
                {correct}
              </span>
            </button>
          </div>
        </div>

        {/* QUESTIONS LIST */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mx-auto mb-3">
                <i className="fa-solid fa-clipboard-check text-2xl"></i>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-200">
                {filter === 'wrong' ? 'Ushbu testda xatolar yo\'q (100% to\'g\'ri)!' : 'Bu bo\'limda savollar topilmadi.'}
              </h4>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const type = q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice');
              const isCorrect = !!q.is_correct;
              const studentAnswer = q.student_answer;

              return (
                <div
                  key={q.id || idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-white dark:bg-gray-800/90 border-emerald-200 dark:border-emerald-900/50 shadow-sm'
                      : 'bg-white dark:bg-gray-800/90 border-rose-200 dark:border-rose-900/60 shadow-sm shadow-rose-500/5'
                  }`}
                >
                  {/* QUESTION TOP BAR */}
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                        {getTypeLabel(type, q.isMultiSelect)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                          <i className="fa-solid fa-check"></i> To'g'ri javob berilgan
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 flex items-center gap-1.5 border border-rose-200 dark:border-rose-800">
                          <i className="fa-solid fa-xmark"></i> Xato javob berilgan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QUESTION TITLE */}
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-4 leading-relaxed">
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question || '') }}></span>
                  </h4>

                  {/* QUESTION TYPE BREAKDOWNS */}
                  {/* 1. SINGLE & MULTIPLE CHOICE */}
                  {(type === 'single_choice' || type === 'multiple_choice') && (
                    <div className="space-y-2.5">
                      {(q.options || []).map((opt, optIdx) => {
                        const isCorrectOpt = !!opt.isCorrect;
                        const isSelected = !!opt.isSelected;

                        let optClass = "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 opacity-60";
                        let badge = null;

                        if (isCorrectOpt && isSelected) {
                          optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold";
                          badge = (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-check"></i> O'quvchi tanlagan (To'g'ri)
                            </span>
                          );
                        } else if (!isCorrectOpt && isSelected) {
                          optClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 font-semibold";
                          badge = (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-xmark"></i> O'quvchi tanlagan (Xato)
                            </span>
                          );
                        } else if (isCorrectOpt && !isSelected) {
                          optClass = "border-emerald-400 border-dashed bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200";
                          badge = (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-arrow-left"></i> Aslida to'g'ri variant
                            </span>
                          );
                        }

                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm transition ${optClass}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="truncate">{opt.text}</span>
                            </div>
                            {badge}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. TRUE / FALSE */}
                  {type === 'true_false' && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        {['true', 'false'].map((val) => {
                          const isExpected = String(q.correct_answer).toLowerCase() === val;
                          const isChosen = String(studentAnswer).toLowerCase() === val;
                          const label = val === 'true' ? "To'g'ri" : "Noto'g'ri";

                          let btnClass = "border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-500 opacity-60";
                          if (isExpected && isChosen) {
                            btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold";
                          } else if (!isExpected && isChosen) {
                            btnClass = "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 font-bold";
                          } else if (isExpected) {
                            btnClass = "border-emerald-400 border-dashed bg-emerald-50/50 text-emerald-800 dark:text-emerald-200 font-bold";
                          }

                          return (
                            <div key={val} className={`flex-1 p-3.5 rounded-xl border flex items-center justify-between ${btnClass}`}>
                              <span>{label}</span>
                              {isChosen && (
                                <span className="text-xs">
                                  {isExpected ? "(O'quvchi tanlagan ✓)" : "(O'quvchi tanlagan ✗)"}
                                </span>
                              )}
                              {!isChosen && isExpected && (
                                <span className="text-xs text-emerald-600 font-bold">(To'g'ri javob)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. SHORT ANSWER & NUMERIC */}
                  {(type === 'short_answer' || type === 'numeric') && (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl border bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 block mb-1">O'quvchi javobi:</span>
                        <div className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-rose-600 line-through'}`}>
                          {studentAnswer !== undefined && studentAnswer !== null && String(studentAnswer).trim() !== ''
                            ? String(studentAnswer)
                            : '(Javob berilmagan)'}
                        </div>
                      </div>
                      {!isCorrect && (
                        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-sm">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block mb-0.5">
                            To'g'ri javob:
                          </span>
                          <span className="font-bold">
                            {q.correct_answer || (q.correct_answers || []).join(' yoki ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. SEQUENCE */}
                  {type === 'sequence' && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 block mb-1.5 font-medium">O'quvchi ketma-ketligi:</span>
                        <div className="space-y-1.5">
                          {(q.student_items || q.items || []).map((item, seqIdx) => (
                            <div key={item.id || seqIdx} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-3 text-sm">
                              <span className="font-bold text-gray-400 w-5 text-center">{seqIdx + 1}.</span>
                              <span className="text-gray-800 dark:text-gray-200">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {!isCorrect && (
                        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-sm">
                          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold block mb-1.5">
                            <i className="fa-solid fa-check mr-1"></i> To'g'ri ketma-ketlik:
                          </span>
                          <ol className="list-decimal pl-5 space-y-1 text-gray-800 dark:text-gray-200">
                            {(q.correct_items || q.items || []).map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. MATCHING */}
                  {type === 'matching' && (
                    <div className="space-y-2">
                      {(q.pairs || []).map((pair, pIdx) => {
                        const pairCorrect = pair.isCorrect ?? (pair.studentSelectedText === pair.correctRightText);
                        return (
                          <div
                            key={pair.id || pIdx}
                            className={`p-3 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              pairCorrect
                                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                                : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40'
                            }`}
                          >
                            <div className="font-medium text-gray-800 dark:text-gray-200 flex-1">
                              {pair.left}
                            </div>
                            <i className="fa-solid fa-arrow-right text-gray-400 hidden sm:block"></i>
                            <div className="flex-1 space-y-1">
                              <div className={`font-semibold flex items-center gap-1.5 ${pairCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300 line-through'}`}>
                                <i className={`fa-solid ${pairCorrect ? 'fa-check' : 'fa-xmark'} text-xs`}></i>
                                <span>{pair.studentSelectedText || '(Tanlanmagan)'}</span>
                              </div>
                              {!pairCorrect && (
                                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                  <i className="fa-solid fa-check"></i> To'g'risi: {pair.correctRightText}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 6. FILL BLANKS & DRAG WORDS */}
                  {(type === 'fill_blanks' || type === 'drag_words') && (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {q.text || ''}
                      </div>
                      <div className="flex gap-4 flex-wrap text-sm">
                        <div className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 flex-1 min-w-[200px]">
                          <span className="text-xs text-gray-500 block mb-1">O'quvchi kiritgan javoblar:</span>
                          <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(q.student_blanks || []).join(', ') || '(Bo\'sh)'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 flex-1 min-w-[200px]">
                            <span className="text-xs text-emerald-600 block mb-1 font-semibold">To'g'ri javoblar:</span>
                            <span className="font-bold">{(q.correct_blanks || []).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7. DROPDOWN */}
                  {type === 'dropdown' && (
                    <div className="space-y-2">
                      {(q.fields || []).map((field, fIdx) => (
                        <div key={field.id || fIdx} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between gap-3">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{field.label || `Maydon #${fIdx + 1}`}:</span>
                          <div className="text-right">
                            <span className={`font-semibold ${field.is_correct ? 'text-emerald-600' : 'text-rose-600 line-through'}`}>
                              {field.student_value || '(Tanlanmagan)'}
                            </span>
                            {!field.is_correct && (
                              <span className="text-xs text-emerald-600 block font-bold">
                                To'g'risi: {field.correct}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 8. ESSAY */}
                  {type === 'essay' && (
                    <div className="p-3.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm">
                      <span className="text-xs text-gray-500 block mb-1">O'quvchi yozgan javob:</span>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{studentAnswer || '(Hech narsa yozilmagan)'}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {onResetAttempt ? (
            <button
              onClick={() => onResetAttempt(attempt)}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 font-semibold rounded-xl text-sm transition active:scale-95 flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/60"
            >
              <i className="fa-solid fa-rotate-left"></i>
              Natijani bekor qilish (Qayta topshirishga ruxsat)
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white font-semibold rounded-xl text-sm transition active:scale-95 shadow-sm"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizMistakesModal;
