import fs from 'node:fs';
import { readConfig } from '../config.js';
import { openDb } from './index.js';
import { seedIfEmpty } from './seed.js';

const config = readConfig();
const file = config.databasePath;

if (file !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(file + suffix, { force: true });
  }
}

const db = openDb(file);
seedIfEmpty(db);
db.close();
console.log(`Database reset and seeded at ${file}`);
