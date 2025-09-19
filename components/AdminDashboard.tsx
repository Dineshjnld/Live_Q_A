import React, { useState, useEffect, useCallback } from 'react';
import type { Event, Response, Question } from '../types';
import { addQuestionToEvent, getAllResponsesForEvent, moderateResponse, getActiveQuestionForEvent, submitResponse, getEventById, activateQuestion, clearResponsesForQuestion } from '../services/api';
import WordCloudDisplay from './WordCloud';
import Spinner from './Spinner';
import { LogOutIcon, BarChartIcon, ShieldOffIcon, PlusCircleIcon, DownloadIcon, EyeIcon, EyeOffIcon, RefreshCwIcon, SendIcon, MaximizeIcon, MinimizeIcon } from './icons';

interface AdminDashboardProps {
  event: Event;
  onExit: () => void;
}

enum Tab {
  WordCloud,
  Moderation,
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ event, onExit }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.WordCloud);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [isPosting, setIsPosting] = useState(false);
    const [showCreds, setShowCreds] = useState<boolean>(() => {
        // Show only once per created event session
        return !!(event as any).adminKey;
    });

  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fetchResponses = useCallback(async () => {
    const allResponses = await getAllResponsesForEvent(event.id);
    setResponses(allResponses);
    setIsLoading(false);
  }, [event.id]);

  const fetchActiveQuestion = useCallback(async () => {
    const question = await getActiveQuestionForEvent(event.id);
    setActiveQuestion(question);
  }, [event.id]);

  useEffect(() => {
    fetchActiveQuestion();
    const questionInterval = setInterval(fetchActiveQuestion, 5000);
    return () => clearInterval(questionInterval);
  }, [fetchActiveQuestion]);

  useEffect(() => {
    fetchResponses();
    const responseInterval = setInterval(fetchResponses, 3000); // Refresh data every 3 seconds
    return () => clearInterval(responseInterval);
  }, [fetchResponses]);

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setIsPosting(true);
    const postedQuestion = await addQuestionToEvent(event.id, newQuestion);
    if (postedQuestion) {
        setActiveQuestion(postedQuestion);
    }
    setNewQuestion('');
    setIsPosting(false);
  };

    const handleClearActiveQuestionResponses = async () => {
        if (!activeQuestion) return;
        const confirmMsg = `Clear all responses for:\n\n"${activeQuestion.text}"?\n\nThis cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;
        setIsClearing(true);
        await clearResponsesForQuestion(event.id, activeQuestion.id);
        await fetchActiveQuestion();
        await fetchResponses();
        setIsClearing(false);
    };

  const handleAdminResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminResponse.trim() || !activeQuestion) return;
    setIsSubmittingResponse(true);
    await submitResponse(event.id, activeQuestion.id, adminResponse, true);
    setAdminResponse('');
    setIsSubmittingResponse(false);
        // Refresh both lists so Word Cloud (active question) and moderation (all) stay in sync
        fetchResponses();
        fetchActiveQuestion();
  };
  
  const handleToggleModeration = async (responseId: string, currentStatus: boolean) => {
    await moderateResponse(event.id, responseId, !currentStatus);
    // Optimistic update
    setResponses(prev => prev.map(r => r.id === responseId ? {...r, isModerated: !currentStatus} : r));
  };
  
  const handleExport = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responses, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `event_${event.name}_responses.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  return (
    <div className="animate-fadeIn">
                {showCreds && (
                    <div className="panel-animated p-4 rounded-2xl shadow-2xl ring-1 ring-white/10 mb-4">
                        <h3 className="font-semibold mb-2">Admin Credentials</h3>
                        <p className="text-sm text-text-secondary mb-2">Save these to resume Admin access later. They’re shown only once now.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-secondary rounded-lg p-3"><span className="text-text-secondary text-xs">Admin Key</span><div className="font-mono break-all">{(event as any).adminKey}</div></div>
                            <div className="bg-secondary rounded-lg p-3"><span className="text-text-secondary text-xs">Admin PIN</span><div className="font-mono">{(event as any).adminPin}</div></div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => { navigator.clipboard.writeText(`Key: ${(event as any).adminKey} | PIN: ${(event as any).adminPin}`); }} className="px-3 py-2 rounded-lg bg-accent text-black font-semibold">Copy</button>
                            <button onClick={() => setShowCreds(false)} className="px-3 py-2 rounded-lg bg-secondary hover:bg-accent">Hide</button>
                        </div>
                    </div>
                )}
                <div className="panel-animated p-6 rounded-2xl shadow-2xl ring-1 ring-white/10 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold">{event.name}</h2>
                <p className="text-text-secondary">Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
                <p className="text-lg font-mono bg-secondary px-4 py-2 rounded-lg">
                    Access Code: <span className="font-bold text-accent tracking-widest">{event.accessCode}</span>
                </p>
                <button onClick={onExit} className="p-3 bg-secondary rounded-lg hover:bg-accent transition-colors"><LogOutIcon /></button>
            </div>
        </div>
        
    <div className="panel-animated p-6 rounded-2xl shadow-2xl ring-1 ring-white/10 mb-6">
            <form onSubmit={handlePostQuestion} className="flex flex-col sm:flex-row gap-4">
                <input 
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask a new question..."
                    className="flex-grow px-4 py-3 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
                <button type="submit" className="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-500" disabled={isPosting}>
                    {isPosting ? <Spinner /> : <><PlusCircleIcon className="w-5 h-5"/> Post Question</>}
                </button>
            </form>
            <QuestionSwitcher eventId={event.id} activeQuestionId={activeQuestion?.id || null} onSwitched={() => { fetchActiveQuestion(); fetchResponses(); }} />
        </div>

        {activeQuestion && (
            <div className="panel-animated p-6 rounded-2xl shadow-2xl ring-1 ring-white/10 mb-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-text-secondary mb-2">Current Active Question</h3>
                <p className="text-xl text-text-main mb-4">{activeQuestion.text}</p>
                <form onSubmit={handleAdminResponseSubmit}>
                    <textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Type your official answer here..."
                        className="w-full h-24 p-4 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent transition-colors text-lg"
                        maxLength={280}
                        disabled={isSubmittingResponse}
                    />
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-sm text-text-secondary">{280 - adminResponse.length} characters remaining</p>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={isSubmittingResponse || !adminResponse.trim()}
                        >
                            {isSubmittingResponse ? <Spinner/> : <><SendIcon className="w-5 h-5" /> Submit Answer</>}
                        </button>
                    </div>
                </form>
            </div>
        )}

    <div className="panel-animated p-2 sm:p-4 rounded-2xl shadow-2xl ring-1 ring-white/10">
            <div className="flex border-b border-secondary mb-4">
                <TabButton icon={<BarChartIcon className="w-5 h-5"/>} label="Word Cloud" isActive={activeTab === Tab.WordCloud} onClick={() => setActiveTab(Tab.WordCloud)} />
                <TabButton icon={<ShieldOffIcon className="w-5 h-5"/>} label="Moderation" isActive={activeTab === Tab.Moderation} onClick={() => setActiveTab(Tab.Moderation)} />
                <div className="flex-grow flex justify-end items-center p-2">
                    <button onClick={handleExport} className="flex items-center gap-2 text-sm px-4 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors">
                        <DownloadIcon className="w-4 h-4"/> Export Data
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-16"><Spinner /></div>
            ) : (
                <div className="p-2 sm:p-4">
                    {activeTab === Tab.WordCloud && (
                        <div>
                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={handleClearActiveQuestionResponses}
                                    disabled={!activeQuestion || isClearing}
                                    className="flex items-center gap-2 text-sm px-4 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Clear all responses for this question"
                                >
                                    <RefreshCwIcon className="w-4 h-4" />
                                    {isClearing ? 'Clearing…' : 'Clear responses'}
                                </button>
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className="ml-2 flex items-center gap-2 text-sm px-4 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors"
                                    title="Maximize word cloud"
                                >
                                    <MaximizeIcon className="w-4 h-4" />
                                    Maximize
                                </button>
                            </div>
                            <WordCloudDisplay responses={activeQuestion ? activeQuestion.responses : []} />
                        </div>
                    )}
                    {activeTab === Tab.Moderation && <ModerationPanel responses={responses} onToggleModeration={handleToggleModeration} />}
                </div>
            )}
        </div>
        {isFullscreen && (
            <FullscreenOverlay onClose={() => setIsFullscreen(false)}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-text-secondary">Word Cloud</h3>
                        {activeQuestion && <p className="text-text-main mt-1">{activeQuestion.text}</p>}
                    </div>
                    <button onClick={() => setIsFullscreen(false)} className="px-3 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                        <MinimizeIcon className="w-4 h-4" />
                        Close
                    </button>
                </div>
                <div className="flex-1 min-h-[60vh]">
                    <WordCloudDisplay responses={activeQuestion ? activeQuestion.responses : []} />
                </div>
            </FullscreenOverlay>
        )}
    </div>
  );
};


interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick}) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold rounded-t-lg transition-colors ${
            isActive ? 'bg-secondary text-accent' : 'text-text-secondary hover:bg-secondary/50'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

interface ModerationPanelProps {
    responses: Response[];
    onToggleModeration: (responseId: string, currentStatus: boolean) => void;
}

const ModerationPanel: React.FC<ModerationPanelProps> = ({ responses, onToggleModeration }) => (
    <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
        {responses.length === 0 ? <p className="text-center text-text-secondary py-8">No responses yet.</p> :
        [...responses].reverse().map(response => (
            <div key={response.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${response.isModerated ? 'bg-red-900/30' : 'bg-secondary'}`}>
                <p className={`text-text-main ${response.isModerated ? 'line-through text-text-secondary' : ''}`}>
                    {response.isFromAdmin && <span className="font-bold text-accent mr-2">[Admin]</span>}
                    {response.text}
                </p>
                <button 
                    onClick={() => onToggleModeration(response.id, response.isModerated)}
                    className="p-2 rounded-full hover:bg-background"
                    title={response.isModerated ? 'Show response' : 'Hide response'}
                >
                    {response.isModerated ? <EyeIcon className="w-5 h-5 text-green-400"/> : <EyeOffIcon className="w-5 h-5 text-red-400"/>}
                </button>
            </div>
        ))}
    </div>
);


export default AdminDashboard;

// Fullscreen overlay component
const FullscreenOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex flex-col">
            <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
                <div className="panel-animated p-4 sm:p-6 rounded-2xl shadow-2xl ring-1 ring-white/10 bg-background/90 flex-1 flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface QuestionSwitcherProps {
    eventId: string;
    activeQuestionId: string | null;
    onSwitched: () => void;
}

const QuestionSwitcher: React.FC<QuestionSwitcherProps> = ({ eventId, activeQuestionId, onSwitched }) => {
    const [questions, setQuestions] = React.useState<Question[]>([]);
    const [loading, setLoading] = React.useState(false);

    const load = React.useCallback(async () => {
        setLoading(true);
        const evt = await getEventById(eventId);
        setQuestions(evt?.questions || []);
        setLoading(false);
    }, [eventId]);

    React.useEffect(() => { load(); }, [load]);

    const handleActivate = async (qid: string) => {
        if (qid === activeQuestionId) return;
        await activateQuestion(eventId, qid);
        onSwitched();
        load();
    };

    if (loading) return <div className="mt-4 text-text-secondary">Loading questions…</div>;
    if (!questions.length) return null;

        return (
        <div className="mt-4">
            <h4 className="font-semibold mb-2 text-text-secondary">Switch to another question</h4>
            <div className="flex gap-2 flex-wrap">
                    {questions.map((q, idx) => {
                        const truncated = q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text;
                        const label = `Q${idx + 1}: ${truncated}`;
                        return (
                    <button
                            key={q.id}
                            onClick={() => handleActivate(q.id)}
                            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${q.id === activeQuestionId ? 'bg-accent text-black border-accent' : 'bg-secondary hover:bg-accent border-secondary'}`}
                            title={q.text}
                            aria-current={q.id === activeQuestionId ? 'true' : undefined}
                    >
                            {q.id === activeQuestionId ? 'Active: ' : ''}{label}
                    </button>
                        );
                    })}
            </div>
        </div>
    );
};