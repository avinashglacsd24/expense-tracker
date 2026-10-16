import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { auth } from './auth.js';
import { pool } from './db.js';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: 'Name, email and password (6+ chars) are required' });

    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',
      [name, email.toLowerCase(), hash]
    );
    await pool.query('INSERT INTO budgets (user_id,monthly_budget) VALUES (?,0)', [result.insertId]);

    const user = { id: result.insertId, email: email.toLowerCase() };
    res.status(201).json({ token: tokenFor(user), user: { id: user.id, name, email: user.email } });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    res.status(500).json({
      message: 'Registration failed',
      error: e.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email?.toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const u = rows[0];
    res.json({ token: tokenFor(u), user: { id: u.id, name: u.name, email: u.email } });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/expenses', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id,title,amount,category,expense_date,note FROM expenses WHERE user_id=? ORDER BY expense_date DESC,id DESC',
    [req.user.id]
  );
  res.json(rows);
});

app.post('/api/expenses', auth, async (req, res) => {
  const { title, amount, category, expense_date, note } = req.body;
  if (!title || !amount || !category || !expense_date)
    return res.status(400).json({ message: 'Title, amount, category and date are required' });

  const [result] = await pool.query(
    'INSERT INTO expenses (user_id,title,amount,category,expense_date,note) VALUES (?,?,?,?,?,?)',
    [req.user.id, title, Number(amount), category, expense_date, note || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Expense added' });
});

app.put('/api/expenses/:id', auth, async (req, res) => {
  const { title, amount, category, expense_date, note } = req.body;
  const [result] = await pool.query(
    'UPDATE expenses SET title=?,amount=?,category=?,expense_date=?,note=? WHERE id=? AND user_id=?',
    [title, Number(amount), category, expense_date, note || null, req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Expense not found' });
  res.json({ message: 'Expense updated' });
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM expenses WHERE id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Expense not found' });
  res.json({ message: 'Expense deleted' });
});

app.get('/api/budget', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT monthly_budget FROM budgets WHERE user_id=?', [req.user.id]);
  res.json({ monthly_budget: rows[0]?.monthly_budget || 0 });
});

app.put('/api/budget', auth, async (req, res) => {
  const budget = Number(req.body.monthly_budget);
  if (budget < 0 || Number.isNaN(budget)) return res.status(400).json({ message: 'Invalid budget' });
  await pool.query(
    'INSERT INTO budgets (user_id,monthly_budget) VALUES (?,?) ON DUPLICATE KEY UPDATE monthly_budget=?',
    [req.user.id, budget, budget]
  );
  res.json({ monthly_budget: budget });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`API running on http://localhost:${process.env.PORT || 5000}`);
});