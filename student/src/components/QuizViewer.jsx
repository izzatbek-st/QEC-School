import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

const QuizViewer = ({ qDataList, topicId, initialAttempt = null, isCompleted = false, onComplete = null, passingScore = 70, onNextLesson = null }) => {
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [resultQuestions, setResultQuestions] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'wrong', 'correct'

  useEffect(() => {
    if (initialAttempt || isCompleted) {
      setShowResult(true);
      setQuizScore(initialAttempt || {});
      setResultQuestions(initialAttempt?.questions || qDataList);
      setAnswers(initialAttempt?.answers || {});
      setSubmissionError('');
    } else {
      setAnswers({});
      setShowResult(false);
      setQuizScore(null);
      setResultQuestions(null);
      setSubmissionError('');
      setFilter('all');
    }
  }, [qDataList, initialAttempt, isCompleted]);

  const rawQuestions = resultQuestions || qDataList || [];

  const displayQuestions = rawQuestions.filter(q => {
    if (!showResult) return true;
    if (filter === 'wrong') return !q.is_correct;
    if (filter === 'correct') return !!q.is_correct;
    return true;
  });

  const totalQuestionsCount = rawQuestions.length;
  const answeredCount = Object.keys(answers).filter(k => {
    const val = answers[k];
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  }).length;
  const unansweredCount = Math.max(0, totalQuestionsCount - answeredCount);

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
    setShowConfirmModal(false);
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
      if (onComplete) {
        onComplete(data);
      }
    } catch (error) {
      setSubmissionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = quizScore?.total ?? totalQuestionsCount;
  const correct = quizScore?.correct ?? (rawQuestions.filter(q => q.is_correct).length);
  const incorrect = quizScore?.incorrect ?? (total - correct);
  const percentage = quizScore?.percentage ?? Math.round((correct / (total || 1)) * 100);
  const reqPassingScore = quizScore?.passing_score ?? passingScore ?? 70;
  const isPassed = percentage >= reqPassingScore;

  return (
    <div className="space-y-8">
      {/* TEST IN-PROGRESS STATUS BAR */}
      {!showResult && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/20">
              <i className="fa-solid fa-list-check text-sm"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                Bilimni sinash testi ({totalQuestionsCount} ta savol)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keyingi mavzularni ochish uchun kamida <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{reqPassingScore}%</strong> to'plashingiz lozim.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300">
              <i className="fa-solid fa-bullseye mr-1"></i>O'tish bali: <strong>{reqPassingScore}%</strong>
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              Javob berildi: <strong className="text-indigo-600 dark:text-indigo-400">{answeredCount}</strong> / {totalQuestionsCount}
            </span>
          </div>
        </div>
      )}

      {/* RESULT OVERVIEW BANNER */}
      {showResult && (
        <div className={`p-6 rounded-3xl text-white shadow-xl space-y-5 ${
          isPassed 
            ? 'bg-gradient-to-br from-emerald-950 via-teal-900 to-indigo-950 shadow-emerald-950/20' 
            : 'bg-gradient-to-br from-rose-950 via-red-900 to-slate-900 shadow-rose-950/20'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              {isPassed ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 inline-flex items-center gap-1.5 mb-2">
                  <i className="fa-solid fa-circle-check"></i> Testdan o'tdingiz (O'tish bali: {reqPassingScore}%)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40 inline-flex items-center gap-1.5 mb-2">
                  <i className="fa-solid fa-triangle-exclamation"></i> O'tolmadingiz (O'tish bali: {reqPassingScore}%)
                </span>
              )}
              <h3 className="text-2xl font-black tracking-tight">
                {isPassed ? "Tabriklaymiz! Testdan muvaffaqiyatli o'tdingiz" : "Test natijasi: Yetarli emas"}
              </h3>
              <p className="text-sm text-white/80 mt-1 max-w-xl">
                {isPassed 
                  ? `Siz ${percentage}% to'pladingiz (o'tish bali: ${reqPassingScore}%). Keyingi mavzular muvaffaqiyatli ochildi!` 
                  : `Keyingi yangi mavzularga o'tish uchun kamida ${reqPassingScore}% to'plash talab etiladi. Siz ${percentage}% to'pladingiz, shu sababli keyingi mavzular qulflangan.`}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-xs text-white/70 uppercase tracking-wider block font-semibold">To'plangan ball</span>
                <span className="text-2xl font-black">{correct} / {total}</span>
              </div>
              <div className="w-px h-10 bg-white/20"></div>
              <div className={`text-3xl font-black ${isPassed ? 'text-emerald-300' : 'text-amber-300'}`}>
                {percentage}%
              </div>
            </div>
          </div>

          {/* STATS BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
              <span className="text-xs text-white/70 block font-medium">Jami savollar</span>
              <span className="text-xl font-bold">{total} ta</span>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30">
              <span className="text-xs text-emerald-200 block font-medium">To'g'ri javoblar</span>
              <span className="text-xl font-bold text-emerald-300">{correct} ta</span>
            </div>
            <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-400/30">
              <span className="text-xs text-rose-200 block font-medium">Xato javoblar</span>
              <span className="text-xl font-bold text-rose-300">{incorrect} ta</span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
              <span className="text-xs text-white/70 block font-medium">O'tish chegarasi</span>
              <span className="text-xl font-bold">{reqPassingScore}%</span>
            </div>
          </div>

          {/* XP REWARD BANNER */}
          {quizScore?.earned_xp != null && (
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 font-black text-lg flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-amber-200">
                    +{quizScore.earned_xp} XP to'plandi!
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-white/80 flex-wrap">
                    <span>+{quizScore.xp_breakdown?.base_xp || (correct * 10)} XP to'g'ri javoblar</span>
                    {quizScore.xp_breakdown?.pass_bonus > 0 && (
                      <span>· +{quizScore.xp_breakdown.pass_bonus} XP o'tish bonusi</span>
                    )}
                    {quizScore.xp_breakdown?.perfect_bonus > 0 && (
                      <span className="text-amber-300 font-bold">· +{quizScore.xp_breakdown.perfect_bonus} XP 100% mukammal natija! 👑</span>
                    )}
                  </div>
                </div>
              </div>

              {quizScore.total_score != null && (
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] text-white/70 uppercase block font-semibold">Umumiy hisobingiz</span>
                  <span className="text-lg font-black text-white">
                    {quizScore.total_score} <span className="text-xs font-bold text-amber-300">XP</span>
                    {quizScore.level_info?.title && (
                      <span className="ml-1.5 text-xs font-normal text-white/80">({quizScore.level_info.title})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FILTER CONTROLS & NEXT LESSON ACTION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/80 font-semibold mr-1">Ko'rish:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filter === 'all'
                    ? 'bg-white text-indigo-900 shadow-md font-bold'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Barcha savollar ({total})
              </button>
              <button
                onClick={() => setFilter('wrong')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  filter === 'wrong'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-bold'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200'
                }`}
              >
                <i className="fa-solid fa-circle-xmark text-xs"></i>
                Faqat xatolar ({incorrect})
              </button>
              <button
                onClick={() => setFilter('correct')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  filter === 'correct'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-bold'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200'
                }`}
              >
                <i className="fa-solid fa-circle-check text-xs"></i>
                To'g'ri javoblar ({correct})
              </button>
            </div>

            {isPassed && onNextLesson && (
              <button
                type="button"
                onClick={onNextLesson}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-950 font-bold rounded-xl text-xs sm:text-sm transition hover:bg-emerald-50 active:scale-95 shadow-lg shadow-black/20 flex items-center justify-center gap-2 shrink-0"
              >
                <span>Keyingi darsga o'tish</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUESTIONS RENDER */}
      <div className="space-y-8">
        {displayQuestions.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i>
            <h4 className="font-bold text-gray-800 dark:text-gray-200">
              {filter === 'wrong' ? 'Xato javoblar yo\'q! Hammasi to\'g\'ri yechilgan.' : 'Savollar topilmadi.'}
            </h4>
          </div>
        ) : (
          displayQuestions.map((q, qIndex) => {
            const type = q.type || (q.isMultiSelect ? 'multiple_choice' : 'single_choice');
            const ans = answers[q.id];
            const isCorrect = !!q.is_correct;

            return (
              <div 
                key={q.id || qIndex} 
                className={`p-6 rounded-2xl border transition-all ${
                  showResult
                    ? isCorrect
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-gray-800/80 shadow-sm'
                      : 'border-rose-200 dark:border-rose-900/50 bg-white dark:bg-gray-800/80 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                {/* QUESTION HEADER WITH STATUS */}
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Savol #{qIndex + 1}
                  </span>
                  {showResult && (
                    isCorrect ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                        <i className="fa-solid fa-check"></i> To'g'ri javob
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 flex items-center gap-1.5 border border-rose-200 dark:border-rose-800">
                        <i className="fa-solid fa-xmark"></i> Xato javob
                      </span>
                    )
                  )}
                </div>

                <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-start gap-2 mb-4 leading-relaxed">
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question || '') }}></span>
                </h4>

                {/* 1. SINGLE & MULTIPLE CHOICE */}
                {(type === 'single_choice' || type === 'multiple_choice') && (
                  <div className="space-y-3">
                    {(q.options || []).map((opt, i) => {
                      const selections = ans || {};
                      const isSelected = !!selections[opt.id] || !!opt.isSelected;
                      let borderClass = "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10";
                      let badge = null;

                      if (showResult) {
                        if (opt.isCorrect && isSelected) {
                          borderClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold";
                          badge = (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-check"></i> Sizning to'g'ri javobingiz
                            </span>
                          );
                        } else if (!opt.isCorrect && isSelected) {
                          borderClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 font-semibold";
                          badge = (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-xmark"></i> Siz tanlagan xato javob
                            </span>
                          );
                        } else if (opt.isCorrect && !isSelected) {
                          borderClass = "border-emerald-400 border-dashed bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200";
                          badge = (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-arrow-left"></i> Aslida to'g'ri variant
                            </span>
                          );
                        } else {
                          borderClass = "border-gray-200 dark:border-gray-800 opacity-60 text-gray-500";
                        }
                      } else if (isSelected) {
                        borderClass = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";
                      }

                      return (
                        <label 
                          key={opt.id} 
                          className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                            showResult ? 'cursor-default' : 'cursor-pointer'
                          } ${borderClass}`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="shrink-0 flex items-center justify-center">
                              {type === 'multiple_choice' || q.isMultiSelect ? (
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <i className="fa-solid fa-check text-xs"></i>}
                                </div>
                              ) : (
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex items-center">
                              <span className="font-semibold text-gray-400 dark:text-gray-500 mr-3 w-5 shrink-0 text-center">
                                {String.fromCharCode(65 + i)}.
                              </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {opt.text}
                              </span>
                            </div>
                          </div>

                          {badge}

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

                {/* 2. TRUE/FALSE */}
                {type === 'true_false' && (
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      {['true', 'false'].map((val) => {
                        const isChosen = String(ans).toLowerCase() === val;
                        const isExpected = String(q.correct_answer).toLowerCase() === val;
                        const label = val === 'true' ? "To'g'ri" : "Noto'g'ri";

                        let btnClass = "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300";
                        if (showResult) {
                          if (isExpected && isChosen) {
                            btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold";
                          } else if (!isExpected && isChosen) {
                            btnClass = "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 font-bold";
                          } else if (isExpected) {
                            btnClass = "border-emerald-400 border-dashed bg-emerald-50/50 text-emerald-800 dark:text-emerald-200 font-bold";
                          } else {
                            btnClass = "opacity-50 border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-400";
                          }
                        } else if (isChosen) {
                          btnClass = "bg-indigo-600 text-white border-indigo-600";
                        }

                        return (
                          <button 
                            key={val}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, val)} 
                            disabled={showResult} 
                            className={`px-6 py-3 rounded-xl border font-bold transition flex-1 flex items-center justify-between ${btnClass}`}
                          >
                            <span>{label}</span>
                            {showResult && isChosen && (
                              <span className="text-xs font-normal">
                                {isExpected ? "(Siz tanladingiz ✓)" : "(Siz tanladingiz ✗)"}
                              </span>
                            )}
                            {showResult && !isChosen && isExpected && (
                              <span className="text-xs font-bold text-emerald-600">(To'g'ri javob)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. SHORT ANSWER & NUMERIC */}
                {(type === 'short_answer' || type === 'numeric') && (
                  <div className="space-y-3">
                    <input 
                      type={type === 'numeric' ? 'number' : 'text'} 
                      disabled={showResult} 
                      placeholder="Javobingizni yozing..." 
                      value={ans || ''} 
                      onChange={e => handleAnswerChange(q.id, e.target.value)} 
                      className={`w-full max-w-md px-4 py-3 rounded-xl border ${
                        showResult 
                          ? isCorrect 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold' 
                            : 'border-rose-500 bg-rose-50 text-rose-900 font-semibold' 
                          : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'
                      }`} 
                    />
                    {showResult && !isCorrect && (
                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-sm max-w-md">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block mb-0.5">
                          To'g'ri javob:
                        </span>
                        <span className="font-bold">{q.correct_answer || (q.correct_answers || []).join(' yoki ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ESSAY */}
                {type === 'essay' && (
                  <div>
                    <textarea 
                      disabled={showResult} 
                      placeholder="Fikringizni yozing..." 
                      value={ans || ''} 
                      onChange={e => handleAnswerChange(q.id, e.target.value)} 
                      className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-1">Ushbu savol javobi o'qituvchi tomonidan tekshiriladi.</p>
                  </div>
                )}

                {/* 5. SEQUENCE */}
                {type === 'sequence' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {(ans || q.items.map(i=>i.id)).map((itemId, idx, arr) => {
                        const item = (q.items || []).find(i => i.id === itemId) || { id: itemId, text: itemId };
                        let isItemCorrect = false;
                        if (showResult) isItemCorrect = isCorrect && (q.items[idx]?.id === itemId);

                        return (
                          <div 
                            key={itemId} 
                            className={`flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-gray-800 ${
                              showResult 
                                ? (isItemCorrect ? 'border-emerald-500' : 'border-rose-500') 
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <button 
                                disabled={showResult || idx === 0} 
                                onClick={() => handleSequenceMove(q.id, idx, -1)} 
                                className="text-gray-400 hover:text-indigo-500 disabled:opacity-30"
                              >
                                <i className="fa-solid fa-chevron-up"></i>
                              </button>
                              <button 
                                disabled={showResult || idx === arr.length - 1} 
                                onClick={() => handleSequenceMove(q.id, idx, 1)} 
                                className="text-gray-400 hover:text-indigo-500 disabled:opacity-30"
                              >
                                <i className="fa-solid fa-chevron-down"></i>
                              </button>
                            </div>
                            <span className="font-bold text-gray-400 w-6 text-center">{idx + 1}.</span>
                            <span className="font-medium flex-1 text-gray-800 dark:text-gray-200">{item.text}</span>
                          </div>
                        );
                      })}
                    </div>
                    {showResult && !isCorrect && (
                      <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl text-sm border border-emerald-200 dark:border-emerald-900/40">
                        <strong className="text-emerald-700 dark:text-emerald-300 block mb-1">
                          <i className="fa-solid fa-check mr-1"></i> To'g'ri ketma-ketlik:
                        </strong>
                        <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                          {(q.correct_items || q.items || []).map(i => <li key={i.id}>{i.text}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. MATCHING */}
                {type === 'matching' && (
                  <div className="grid grid-cols-1 gap-3 max-w-2xl">
                    {(q.pairs || []).map((pair) => {
                      const matches = ans || {};
                      const selectedRight = matches[pair.id] || '';
                      const pairCorrect = pair.isCorrect ?? (selectedRight === String(pair.correctRightId ?? pair.right_id ?? pair.id));
                      
                      const rightOptions = q.rightOptions || [...(q.pairs || [])]
                        .sort((a,b) => String(a.id).localeCompare(String(b.id)))
                        .map(option => ({ id: option.id, text: option.right }));

                      return (
                        <div key={pair.id} className="space-y-1">
                          <div className="flex gap-4 items-center">
                            <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium">
                              {pair.left}
                            </div>
                            <i className="fa-solid fa-arrow-right text-gray-400"></i>
                            <div className="flex-1">
                              {showResult ? (
                                <div className={`p-3 rounded-xl border font-semibold flex items-center justify-between ${
                                  pairCorrect 
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                                    : 'border-rose-500 bg-rose-50 text-rose-800'
                                }`}>
                                  <span>{pair.studentSelectedText || selectedRight || '(Tanlanmagan)'}</span>
                                  <i className={`fa-solid ${pairCorrect ? 'fa-check text-emerald-600' : 'fa-xmark text-rose-600'}`}></i>
                                </div>
                              ) : (
                                <select 
                                  value={selectedRight} 
                                  onChange={(e) => handleNestedAnswerChange(q.id, pair.id, e.target.value)} 
                                  className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="" disabled>Tanlang...</option>
                                  {rightOptions.map(ro => (
                                    <option key={ro.id} value={ro.id}>{ro.text ?? ro.right}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                          {showResult && !pairCorrect && (
                            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold pl-2">
                              <i className="fa-solid fa-check mr-1"></i> To'g'ri jufti: {pair.correctRightText || pair.right}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 7. FILL BLANKS & DRAG WORDS */}
                {(type === 'fill_blanks' || type === 'drag_words') && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-800 text-base leading-loose">
                      {q.text}
                    </div>
                    {showResult && !isCorrect && q.correct_blanks && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-800">
                        <strong>To'g'ri javoblar:</strong> {q.correct_blanks.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* 8. DROPDOWN */}
                {type === 'dropdown' && (
                  <div className="space-y-3">
                    {(q.fields || []).map(f => {
                      const selectedVal = (ans || {})[f.id] || f.student_value || '';
                      return (
                        <div key={f.id} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{f.label || `Maydon #${f.id}`}:</span>
                          {showResult ? (
                            <div className="text-right">
                              <span className={`font-semibold ${f.is_correct ? 'text-emerald-600' : 'text-rose-600 line-through'}`}>
                                {selectedVal || '(Tanlanmagan)'}
                              </span>
                              {!f.is_correct && (
                                <span className="text-xs text-emerald-600 block font-bold">To'g'risi: {f.correct}</span>
                              )}
                            </div>
                          ) : (
                            <select 
                              value={selectedVal} 
                              onChange={e => handleNestedAnswerChange(q.id, f.id, e.target.value)} 
                              className="p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            >
                              <option value="">Tanlang...</option>
                              {String(f.options || '').split(',').map((opt, oIdx) => (
                                <option key={oIdx} value={opt.trim()}>{opt.trim()}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {submissionError && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-base"></i>
          <span>{submissionError}</span>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {!showResult ? (
          <>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {unansweredCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  {unansweredCount} ta savol hali belgilanmagan
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check"></i>
                  Barcha savollarga javob berildi
                </span>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={answeredCount === 0 || isSubmitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2 text-base"
            >
              <i className="fa-solid fa-flag-checkered"></i>
              <span>{isSubmitting ? 'Topshirilmoqda...' : 'Testni tugatish'}</span>
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-lock text-gray-400 text-lg"></i>
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Ushbu test topshirilgan. Testni qayta ishlash imkoni mavjud emas.
              </span>
            </div>
            <Link
              to="/results"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0"
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Topshirilgan testlar tarixi</span>
            </Link>
          </div>
        )}
      </div>

      {/* CONFIRMATION SUBMISSION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <i className="fa-solid fa-flag-checkered"></i>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Testni tugatishni tasdiqlaysizmi?
              </h3>
              {unansweredCount > 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
                  <p className="font-semibold flex items-center justify-center gap-1.5 mb-1">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Diqqat!
                  </p>
                  Siz hali <strong>{unansweredCount} ta</strong> savolga javob bermadingiz. Belgilanmagan savollar xato hisoblanadi.
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Javoblaringiz qabul qilinadi va natija darhol hisoblanadi.
                </p>
              )}
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                Eslatma: Keyingi mavzularni ochish uchun kamida {reqPassingScore}% to'plashingiz lozim. Testni qayta topshirish imkoni bo'lmaydi!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 text-sm transition"
              >
                Davom etish
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-check"></i>
                Ha, tugatish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizViewer;
