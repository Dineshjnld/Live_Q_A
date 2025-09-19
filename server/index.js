import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { customAlphabet } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PORT = process.env.PORT || 5174;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'live_qa';

const nanoid = customAlphabet('0123456789', 5); // 5-digit access code
const adminKeyGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 20);
const adminPinGen = customAlphabet('0123456789', 6);

const app = express();
app.use(cors());
app.use(express.json());

let client; let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  await db.collection('events').createIndex({ accessCode: 1 }, { unique: true });
  return db;
}

// Helpers
const toEventDto = (event) => ({
  id: event._id.toString(),
  name: event.name,
  accessCode: event.accessCode,
  createdAt: event.createdAt,
  questions: event.questions || []
});

// Routes
app.post('/api/events', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    const db = await connect();

    // Ensure unique access code
    let accessCode; let exists = true; let tries = 0;
    while (exists && tries < 10) {
      tries++;
      accessCode = nanoid();
      exists = await db.collection('events').findOne({ accessCode });
    }
    if (!accessCode) return res.status(500).json({ error: 'Failed to generate access code' });

    const doc = {
      name: name.trim(),
      accessCode,
      createdAt: new Date(),
      questions: [],
      adminKey: adminKeyGen(),
      adminPin: adminPinGen()
    };
    const { insertedId } = await db.collection('events').insertOne(doc);
    const created = await db.collection('events').findOne({ _id: insertedId });
    // Return public event fields plus admin credentials only at creation time
    const base = toEventDto(created);
    res.json({ ...base, adminKey: created.adminKey, adminPin: created.adminPin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/events/code/:code', async (req, res) => {
  try {
    const db = await connect();
    const event = await db.collection('events').findOne({ accessCode: req.params.code });
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(toEventDto(event));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/events/:eventId', async (req, res) => {
  try {
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(toEventDto(event));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/events/:eventId/questions', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // deactivate previous
    const questions = (event.questions || []).map(q => ({ ...q, isActive: false }));
    const newQ = {
      id: 'q_' + Date.now(),
      text: text.trim(),
      createdAt: new Date(),
      isActive: true,
      responses: []
    };
    questions.push(newQ);

    await db.collection('events').updateOne({ _id }, { $set: { questions } });
    res.json(newQ);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/events/:eventId/questions/active', async (req, res) => {
  try {
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const active = (event.questions || []).find(q => q.isActive) || null;
    res.json(active);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/events/:eventId/questions/:questionId/activate', async (req, res) => {
  try {
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const questions = (event.questions || []).map(q => ({ ...q, isActive: q.id === req.params.questionId }));
    const activated = questions.find(q => q.id === req.params.questionId) || null;
    if (!activated) return res.status(404).json({ error: 'Question not found' });
    await db.collection('events').updateOne({ _id }, { $set: { questions } });
    res.json(activated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/events/:eventId/questions/:questionId/responses', async (req, res) => {
  try {
    const { text, isFromAdmin = false, participantId } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const question = (event.questions || []).find(q => q.id === req.params.questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const response = {
      id: 'r_' + Date.now(),
      text: text.trim(),
      isModerated: false,
      createdAt: new Date(),
      isFromAdmin: !!isFromAdmin,
      participantId: participantId || null
    };
    question.responses.push(response);
    await db.collection('events').updateOne({ _id }, { $set: { questions: event.questions } });
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Clear all responses for a specific question (admin action)
app.post('/api/events/:eventId/questions/:questionId/responses/clear', async (req, res) => {
  try {
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const question = (event.questions || []).find(q => q.id === req.params.questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    question.responses = [];
    await db.collection('events').updateOne({ _id }, { $set: { questions: event.questions } });
    return res.json(question);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/events/:eventId/responses', async (req, res) => {
  try {
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const all = (event.questions || []).flatMap(q => q.responses || []);
    res.json(all);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/events/:eventId/responses/:responseId/moderate', async (req, res) => {
  try {
    const { shouldHide } = req.body;
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    for (const q of event.questions || []) {
      const r = q.responses.find(r => r.id === req.params.responseId);
      if (r) {
        r.isModerated = !!shouldHide;
        await db.collection('events').updateOne({ _id }, { $set: { questions: event.questions } });
        return res.json({ ok: true });
      }
    }
    res.status(404).json({ error: 'Response not found' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Verify admin credentials for an event
app.post('/api/events/:eventId/admin/verify', async (req, res) => {
  try {
    const { adminKey, adminPin } = req.body || {};
    const db = await connect();
    const _id = new ObjectId(req.params.eventId);
    const event = await db.collection('events').findOne({ _id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const ok = !!adminKey && adminKey === event.adminKey && (!event.adminPin || adminPin === event.adminPin);
    res.json({ ok });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
