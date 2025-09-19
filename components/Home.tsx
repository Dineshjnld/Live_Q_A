
import React, { useState } from 'react';
import { createEvent, getEventByCode, verifyAdmin } from '../services/api';
import type { Event } from '../types';
import Spinner from './Spinner';

interface HomeProps {
  onJoin: (event: Event) => void;
  onCreate: (event: Event) => void;
}

type HomeView = 'join' | 'chooseCreate' | 'resume' | 'create';

const Home: React.FC<HomeProps> = ({ onJoin, onCreate }) => {
  const [view, setView] = useState<HomeView>('join');
  const [joinCode, setJoinCode] = useState('');
  const [resumeCode, setResumeCode] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [eventName, setEventName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<null | 'join' | 'resume' | 'create'>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.replace(/\D/g, '').slice(0, 5);
    if (code.length !== 5) {
      setError('Access code must be 5 digits.');
      return;
    }
    setLoading('join');
    setError('');
    const event = await getEventByCode(code);
    if (event) {
      onJoin(event);
    } else {
      setError('Event not found. Please check the code.');
    }
    setLoading(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please enter an event name.');
      return;
    }
    setLoading('create');
    setError('');
    const newEvent = await createEvent(eventName);
    onCreate(newEvent);
    setLoading(null);
  };

  const handleResumeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resumeCode.replace(/\D/g, '').slice(0, 5);
    if (code.length !== 5 || !adminKey.trim() || !adminPin.trim()) {
      setError('Enter 5-digit code, admin key and PIN.');
      return;
    }
    setLoading('resume');
    setError('');
    const event = await getEventByCode(code);
    if (!event) {
      setError('Event not found. Please check the code.');
      setLoading(null);
      return;
    }
    const ok = await verifyAdmin(event.id, adminKey.trim(), adminPin.trim());
    if (!ok) {
      setError('Invalid admin credentials.');
      setLoading(null);
      return;
    }
    // Persist admin credentials for session restore
    localStorage.setItem('liveqa_adminKey', adminKey.trim());
    localStorage.setItem('liveqa_adminPin', adminPin.trim());
    onCreate(event); // reuse admin route handler
    setLoading(null);
  };

  return (
    <div className="animate-fadeIn max-w-xl mx-auto">
      {/* Join first */}
      {view === 'join' && (
        <div className="panel-animated p-8 rounded-2xl shadow-2xl ring-1 ring-white/10">
          <h2 className="text-3xl font-bold text-center mb-6 text-text-main">Join the Event</h2>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Enter 5-digit code"
              className="w-full px-4 py-3 bg-background/60 border-2 border-secondary rounded-lg text-2xl tracking-widest font-mono focus:outline-none focus:border-accent transition-colors"
              maxLength={5}
              disabled={loading === 'join'}
            />
            <button type="submit" disabled={loading === 'join'} className="w-full mt-4 bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:bg-gray-500 shadow-lg shadow-accent/30">
              {loading === 'join' ? <Spinner /> : 'Join Session'}
            </button>
          </form>
          <div className="text-center mt-6">
            <button onClick={() => { setError(''); setView('chooseCreate'); }} className="text-accent hover:underline">Or create an event</button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      )}

      {/* Choose create path */}
      {view === 'chooseCreate' && (
        <div className="panel-animated p-8 rounded-2xl shadow-2xl ring-1 ring-white/10">
          <h2 className="text-2xl font-bold mb-4">Create an event</h2>
          <p className="text-text-secondary mb-6">Do you already have an event?</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setView('resume')} className="flex-1 px-4 py-3 bg-secondary rounded-lg hover:bg-accent transition-colors">I already have an event (Admin)</button>
            <button onClick={() => setView('create')} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Create new event</button>
          </div>
          <div className="text-center mt-6">
            <button onClick={() => setView('join')} className="text-accent hover:underline">Back to Join</button>
          </div>
        </div>
      )}

      {/* Resume admin */}
      {view === 'resume' && (
        <div className="panel-animated p-8 rounded-2xl shadow-2xl ring-1 ring-white/10">
          <h2 className="text-2xl font-bold mb-4">Resume Admin</h2>
          <form onSubmit={handleResumeAdmin} className="space-y-3">
            <input
              type="text"
              value={resumeCode}
              onChange={e => setResumeCode(e.target.value)}
              placeholder="Access Code (5 digits)"
              className="w-full px-3 py-2 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Admin Key"
              className="w-full px-3 py-2 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              placeholder="Admin PIN (6 digits)"
              className="w-full px-3 py-2 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('chooseCreate')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors">Back</button>
              <button type="submit" disabled={loading === 'resume'} className="flex-1 bg-accent text-black font-bold py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:bg-gray-500">
                {loading === 'resume' ? <Spinner /> : 'Resume as Admin'}
              </button>
            </div>
          </form>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      )}

      {/* Create new */}
      {view === 'create' && (
        <div className="panel-animated p-8 rounded-2xl shadow-2xl ring-1 ring-white/10">
          <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="Event name"
              className="w-full px-3 py-2 bg-background/60 border-2 border-secondary rounded-lg focus:outline-none focus:border-accent"
              disabled={loading === 'create'}
            />
            <div className="flex gap-3 mt-3">
              <button type="button" onClick={() => setView('chooseCreate')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-accent transition-colors">Back</button>
              <button type="submit" disabled={loading === 'create' || !eventName.trim()} className="flex-1 bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-500">
                {loading === 'create' ? <Spinner /> : 'Create & Start'}
              </button>
            </div>
          </form>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Home;
