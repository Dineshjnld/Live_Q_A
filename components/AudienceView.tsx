import React, { useState, useEffect, useCallback } from 'react';
import type { Event, Question, Response } from '../types';
import { submitResponse, getEventById } from '../services/api';
import Spinner from './Spinner';
import { SendIcon, CheckCircleIcon } from './icons';

interface AudienceViewProps {
  event: Event;
  onLeave: () => void;
}

const AudienceView: React.FC<AudienceViewProps> = ({ event, onLeave }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [participantId, setParticipantId] = useState<string>('');

  // Generate or restore a participant ID scoped to this event
  useEffect(() => {
    const key = `liveqa_participantId_${event.id}`;
    let pid = localStorage.getItem(key);
    if (!pid) {
      pid = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, pid);
    }
    setParticipantId(pid);
  }, [event.id]);

  // Fetch all questions (and responses) periodically, and choose default selection
  const fetchEventQuestions = useCallback(async () => {
    const evt = await getEventById(event.id);
    const qs = evt?.questions || [];
    setQuestions(qs);
    // On first load or if selected question disappears, fallback to active or first
    setIsLoading(false);
    if (!qs.length) {
      setSelectedQuestionId(null);
      return;
    }
    setSelectedQuestionId(prev => {
      if (prev && qs.some(q => q.id === prev)) return prev;
      const active = qs.find(q => q.isActive);
      return active ? active.id : qs[0].id;
    });
  }, [event.id]);

  useEffect(() => {
    setIsLoading(true);
    fetchEventQuestions();
    const interval = setInterval(fetchEventQuestions, 5000);
    return () => clearInterval(interval);
  }, [fetchEventQuestions]);

  const selectedQuestion = selectedQuestionId ? questions.find(q => q.id === selectedQuestionId) || null : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || !selectedQuestion) return;

    setIsSubmitting(true);
    setError('');
    const result = await submitResponse(event.id, selectedQuestion.id, response, false, participantId);
    if (result) {
      setResponse('');
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 2000);
      // Optimistically append to local state to show in history immediately
      const newResp: Response = { ...result, createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt) } as Response;
      setQuestions(prev => prev.map(q => (
        q.id === selectedQuestion.id
          ? { ...q, responses: [...(q.responses || []), newResp] }
          : q
      )));
    } else {
      setError('Failed to submit response. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
  <div className="w-full max-w-2xl mx-auto animate-fadeIn">
  <div className="panel-animated p-8 rounded-2xl shadow-2xl ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold text-accent">Event: {event.name}</h2>
       <div className="flex items-center gap-2">
         <span className="text-sm font-mono bg-secondary px-3 py-2 rounded-lg">
           Code: <span className="font-bold text-accent tracking-widest">{event.accessCode}</span>
         </span>
         <button onClick={onLeave} className="px-3 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-semibold">Logout</button>
       </div>
      </div>
            {isLoading && !selectedQuestion ? (
                <div className="flex flex-col items-center justify-center h-48">
                    <Spinner />
                    <p className="mt-4 text-text-secondary">Waiting for question...</p>
                </div>
      ) : selectedQuestion ? (
                <div>
          {/* Question switcher */}
          {questions.length > 1 && (
            <div className="mb-4">
              <h4 className="font-semibold text-text-secondary mb-2">Switch question</h4>
              <div className="flex gap-2 flex-wrap justify-center">
                {questions.map((q, idx) => {
                  const truncated = q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text;
                  const label = `Q${idx + 1}: ${truncated}`;
                  const isActive = selectedQuestionId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors ${isActive ? 'bg-accent text-black border-accent' : 'bg-secondary hover:bg-accent border-secondary'}`}
                      title={q.text}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      {q.isActive ? 'Live • ' : ''}{label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h3 className="text-2xl md:text-3xl font-semibold text-text-main mb-2 text-center">{selectedQuestion.text}</h3>
          <p className="text-center text-text-secondary mb-4">You can submit multiple responses.</p>
          {justSubmitted && (
            <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <CheckCircleIcon className="w-5 h-5" />
            <span>Submitted!</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
              <textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                placeholder="Type your anonymous response here..."
                className="w-full h-32 p-4 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent transition-colors text-lg"
                                maxLength={280}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-between items-center mt-4">
                                <p className="text-sm text-text-secondary">{280 - response.length} characters remaining</p>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    disabled={isSubmitting || !response.trim()}
                                >
                                    {isSubmitting ? <Spinner/> : <><SendIcon className="w-5 h-5" /> Submit</>}
                                </button>
                            </div>
          </form>
          {/* Your history for this question */}
          <div className="mt-6">
            <h4 className="font-semibold text-text-secondary mb-2">Your responses for this question</h4>
            <ParticipantHistory
              responses={(selectedQuestion.responses || []).filter(r => r.participantId && r.participantId === participantId)}
            />
          </div>
                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                </div>
            ) : (
                <div className="text-center h-48 flex flex-col justify-center items-center">
                    <p className="text-xl text-text-secondary">The host hasn't asked a question yet.</p>
                    <p className="text-text-secondary mt-2">Please wait...</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AudienceView;

// Show a simple list of participant's own responses for the selected question
const ParticipantHistory: React.FC<{ responses: Response[] }> = ({ responses }) => {
  if (!responses.length) return <p className="text-text-secondary">No responses yet.</p>;
  const toDate = (d: any): Date => (d instanceof Date ? d : new Date(d));
  const sorted = [...responses].sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());
  return (
    <ul className="space-y-2 max-h-56 overflow-y-auto pr-2">
      {sorted.map(r => (
        <li key={r.id} className="bg-secondary rounded-lg p-3">
          <div className="text-sm text-text-secondary">{toDate(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-text-main">{r.text}</div>
        </li>
      ))}
    </ul>
  );
};
