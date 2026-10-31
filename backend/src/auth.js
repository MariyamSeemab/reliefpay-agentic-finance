import jwt from 'jsonwebtoken';

export function publicUser(row) {
  if (!row) return null;
  // Explicit allow-list: password_hash never leaves the server.
  return { id: row.id, name: row.name, email: row.email, role: row.role, org: row.org, title: row.title };
}

export function signToken(user, config) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireAuth(db, config) {
  const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return res.status(401).json({ error: 'UNAUTHENTICATED' });

    let payload;
    try {
      payload = jwt.verify(match[1].trim(), config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    const row = typeof payload?.sub === 'string' ? findUser.get(payload.sub) : undefined;
    if (!row) return res.status(401).json({ error: 'UNAUTHENTICATED' });

    req.user = publicUser(row);
    return next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    return next();
  };
}
