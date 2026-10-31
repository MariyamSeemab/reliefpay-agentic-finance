import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { publicUser, requireAuth, signToken } from '../auth.js';

const SIGNUP_ROLES = ['BENEFICIARY', 'DONOR', 'VOLUNTEER'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authRouter({ db, config }) {
  const router = Router();
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    const row = findByEmail.get(email.trim());
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    const user = publicUser(row);
    writeAudit(db, { actor: actorFromUser(user), action: 'USER_LOGIN', target: `User ${user.id}` });
    return res.json({ token: signToken(user, config), user });
  });

  router.post('/auth/signup', (req, res) => {
    const { name, email, password, role } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'INVALID_NAME' });
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'INVALID_EMAIL' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'INVALID_PASSWORD' });
    }
    if (!SIGNUP_ROLES.includes(role)) {
      return res.status(400).json({ error: 'INVALID_ROLE' });
    }
    const cleanEmail = email.trim();
    if (findByEmail.get(cleanEmail)) {
      return res.status(409).json({ error: 'EMAIL_TAKEN' });
    }

    const id = 'usr-' + crypto.randomUUID().slice(0, 8);
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, org, title, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
    ).run(id, name.trim(), cleanEmail, bcrypt.hashSync(password, 10), role, new Date().toISOString());

    const user = publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    writeAudit(db, { actor: actorFromUser(user), action: 'USER_SIGNUP', target: `User ${user.id}` });
    return res.status(201).json({ token: signToken(user, config), user });
  });

  router.get('/auth/me', requireAuth(db, config), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
