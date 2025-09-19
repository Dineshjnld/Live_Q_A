
import React, { useState, useCallback, useEffect } from 'react';
import Home from './components/Home';
import AdminDashboard from './components/AdminDashboard';
import AudienceView from './components/AudienceView';
import Header from './components/Header';
import type { Event } from './types';
import { getEventById, getEventByCode } from './services/api';
import Spinner from './components/Spinner';

enum View {
  Home,
  Audience,
  Admin,
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Restore persisted session (admin/audience) on load
  useEffect(() => {
    const restore = async () => {
      try {
        const storedRole = localStorage.getItem('liveqa_role'); // 'admin' | 'audience'
        const storedEventId = localStorage.getItem('liveqa_eventId');
        const storedCode = localStorage.getItem('liveqa_accessCode');
        if (storedRole && storedEventId) {
          const evt = await getEventById(storedEventId);
          if (evt) {
            setCurrentEvent(evt);
            setCurrentView(storedRole === 'admin' ? View.Admin : View.Audience);
          } else if (storedCode) {
            // Fallback: try restore by access code (e.g., different DB instance)
            const evtByCode = await getEventByCode(storedCode);
            if (evtByCode) {
              setCurrentEvent(evtByCode);
              setCurrentView(storedRole === 'admin' ? View.Admin : View.Audience);
              localStorage.setItem('liveqa_eventId', evtByCode.id);
            } else {
              setResumeError('Saved session not found. You may need to create or join again.');
            }
          } else {
            setResumeError('Saved session not found. You may need to create or join again.');
          }
        }
      } catch (e) {
        // ignore, fall back to Home
      } finally {
        setRestoring(false);
      }
    };
    restore();
  }, []);

  const resumeFromStorage = useCallback(async () => {
    setResumeError(null);
    try {
      const storedRole = localStorage.getItem('liveqa_role');
      const storedEventId = localStorage.getItem('liveqa_eventId');
      if (!storedRole || !storedEventId) {
        setResumeError('No saved session to resume.');
        return;
      }
      const evt = await getEventById(storedEventId);
      if (evt) {
        setCurrentEvent(evt);
        setCurrentView(storedRole === 'admin' ? View.Admin : View.Audience);
      } else {
        setResumeError('Event not found. It may have been deleted.');
        // Only clear if server explicitly says not found (handled in effect); here keep for retry.
      }
    } catch (e) {
      setResumeError('Could not contact server. Please check backend and try again.');
    }
  }, []);

  const handleJoinEvent = useCallback((event: Event) => {
    setCurrentEvent(event);
    setCurrentView(View.Audience);
    localStorage.setItem('liveqa_role', 'audience');
    localStorage.setItem('liveqa_eventId', event.id);
    localStorage.setItem('liveqa_accessCode', event.accessCode);
  }, []);

  const handleCreateEvent = useCallback((event: Event) => {
    setCurrentEvent(event);
    setCurrentView(View.Admin);
    localStorage.setItem('liveqa_role', 'admin');
    localStorage.setItem('liveqa_eventId', event.id);
    localStorage.setItem('liveqa_accessCode', event.accessCode);
    if (event.adminKey) localStorage.setItem('liveqa_adminKey', event.adminKey);
    if (event.adminPin) localStorage.setItem('liveqa_adminPin', event.adminPin);
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentEvent(null);
    setCurrentView(View.Home);
    localStorage.removeItem('liveqa_role');
    localStorage.removeItem('liveqa_eventId');
    localStorage.removeItem('liveqa_accessCode');
    localStorage.removeItem('liveqa_adminKey');
    localStorage.removeItem('liveqa_adminPin');
  }, []);

  const renderView = () => {
    switch (currentView) {
      case View.Audience:
        return currentEvent ? <AudienceView event={currentEvent} onLeave={handleBackToHome} /> : <Home onJoin={handleJoinEvent} onCreate={handleCreateEvent} />;
      case View.Admin:
        return currentEvent ? <AdminDashboard event={currentEvent} onExit={handleBackToHome} /> : <Home onJoin={handleJoinEvent} onCreate={handleCreateEvent} />;
      case View.Home:
      default:
        return <Home onJoin={handleJoinEvent} onCreate={handleCreateEvent} />;
    }
  };

  if (restoring) {
    return (
      <div className="min-h-screen bg-background font-sans flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header onLogoClick={handleBackToHome} />
      <main className="container mx-auto px-4 py-8">
        {currentView === View.Home && (localStorage.getItem('liveqa_role') && localStorage.getItem('liveqa_eventId')) ? (
          <div className="panel-animated p-4 mb-6 rounded-xl ring-1 ring-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-text-main">Resume your last session</h3>
                <p className="text-sm text-text-secondary">We found an ongoing session. You can continue as Admin or Audience depending on your last role.</p>
                {resumeError && <p className="text-sm text-danger mt-2">{resumeError}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={resumeFromStorage} className="px-4 py-2 rounded-lg bg-accent text-black font-semibold hover:bg-red-700 transition-colors">Resume</button>
                <button onClick={handleBackToHome} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors">Clear</button>
              </div>
            </div>
          </div>
        ) : null}
        {renderView()}
      </main>
    </div>
  );
};

export default App;
