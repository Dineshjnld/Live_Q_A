import type { Event, Question, Response } from '../types';

// Normalize event payloads received from the server into typed objects with Date instances
const toEvent = (raw: any): Event => ({
  id: raw.id,
  name: raw.name,
  accessCode: raw.accessCode,
  createdAt: new Date(raw.createdAt),
  questions: (raw.questions || []).map((q: any) => ({
    ...q,
    createdAt: new Date(q.createdAt),
    responses: (q.responses || []).map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) }))
  }))
});

export const createEvent = async (eventName: string): Promise<Event> => {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: eventName })
  });
  if (!res.ok) throw new Error('Failed to create event');
  const data = await res.json();
  const evt = toEvent(data);
  // attach admin credentials if present
  if (data.adminKey) (evt as any).adminKey = data.adminKey;
  if (data.adminPin) (evt as any).adminPin = data.adminPin;
  return evt;
};

export const getEventByCode = async (code: string): Promise<Event | null> => {
  const res = await fetch(`/api/events/code/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch event');
  return toEvent(await res.json());
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  const res = await fetch(`/api/events/${eventId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch event');
  return toEvent(await res.json());
};

export const addQuestionToEvent = async (eventId: string, questionText: string): Promise<Question | null> => {
  const res = await fetch(`/api/events/${eventId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: questionText })
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to add question');
  const q = await res.json();
  return { ...q, createdAt: new Date(q.createdAt) } as Question;
};

export const getActiveQuestionForEvent = async (eventId: string): Promise<Question | null> => {
  const res = await fetch(`/api/events/${eventId}/questions/active`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch active question');
  const q = await res.json();
  return q ? ({ ...q, createdAt: new Date(q.createdAt) } as Question) : null;
};

export const activateQuestion = async (eventId: string, questionId: string): Promise<Question | null> => {
  const res = await fetch(`/api/events/${eventId}/questions/${questionId}/activate`, {
    method: 'POST'
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to activate question');
  const q = await res.json();
  return q ? ({ ...q, createdAt: new Date(q.createdAt) } as Question) : null;
};

export const clearResponsesForQuestion = async (eventId: string, questionId: string): Promise<Question | null> => {
  const res = await fetch(`/api/events/${eventId}/questions/${questionId}/responses/clear`, {
    method: 'POST'
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to clear responses');
  const q = await res.json();
  return q ? ({ ...q, createdAt: new Date(q.createdAt) } as Question) : null;
};

export const submitResponse = async (eventId: string, questionId: string, responseText: string, isFromAdmin = false, participantId?: string): Promise<Response | null> => {
  const res = await fetch(`/api/events/${eventId}/questions/${questionId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: responseText, isFromAdmin, participantId })
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to submit response');
  const r = await res.json();
  return { ...r, createdAt: new Date(r.createdAt) } as Response;
};

export const getAllResponsesForEvent = async (eventId: string): Promise<Response[]> => {
  const res = await fetch(`/api/events/${eventId}/responses`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch responses');
  const arr = await res.json();
  return arr.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) })) as Response[];
};

export const moderateResponse = async (eventId: string, responseId: string, shouldHide: boolean): Promise<boolean> => {
  const res = await fetch(`/api/events/${eventId}/responses/${responseId}/moderate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shouldHide })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.ok;
};

export const verifyAdmin = async (eventId: string, adminKey: string, adminPin?: string): Promise<boolean> => {
  const res = await fetch(`/api/events/${eventId}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey, adminPin })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.ok;
};