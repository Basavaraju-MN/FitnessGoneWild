// About page (/about), edited in the admin (About Page screen).
// Everything is in the database, so it survives deploys:
//   about_page    one row: all texts of the page (JSON)
//   about_team    team members, in order, each shown or hidden
//   about_photos  photos by slot: banner, story, founder, team-<member id>
// Photos are sent at /about-photo/<slot>?v=<version>; the address changes
// when a photo is replaced, so browsers keep each one for a year.
// Used by the website API (GET /api/about) and the admin (aboutManager.js).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pool, executeQuery } = require('../../db/connection');

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const CACHE_DIR = path.join(os.tmpdir(), 'fgw-about-photos');
const PAGE_SLOTS = ['banner', 'story', 'founder'];
const isSlot = (slot) => PAGE_SLOTS.includes(slot) || /^team-\d{1,9}$/.test(String(slot));

// What the page shows until the admin saves its own texts
const DEFAULT_CONTENT = {
  banner: {
    eyebrow: 'About us',
    title: "We're trekkers first, organisers second.",
    subtitle: 'Small-group treks and trips from Bangalore since 2018.',
  },
  story: {
    eyebrow: 'Our story',
    title: 'How it all started',
    text: 'We have been running treks and trips since 2018, from the Western Ghats to the Himalayas.\n\nGroups stay small, every trip has experienced trek leaders, and the price you see is the price you pay.',
  },
  stats: [
    { value: '10,000+', label: 'Travellers' },
    { value: '300+', label: 'Journeys organised' },
    { value: '4.9 ★', label: 'Average rating' },
    { value: '24×7', label: 'Traveller support' },
  ],
  founder: {
    show: false,
    eyebrow: 'Meet the founder',
    name: '',
    role: 'Founder',
    note: '',
    credentials: [],
    instagram: '',
  },
  team: {
    eyebrow: 'Our team',
    title: 'The people on the trail with you',
    subtitle: 'The trek leaders and crew who plan, lead and look after every trip.',
  },
  values: {
    eyebrow: 'What we stand for',
    title: 'How we run every trip',
    items: [
      { icon: '🛟', title: 'Safety first', text: 'Trained trek leaders, first-aid kits and a clear plan for every trail.' },
      { icon: '👥', title: 'Small groups', text: 'Groups stay small so everyone is looked after and nobody is left behind.' },
      { icon: '🌿', title: 'Leave no trace', text: 'We carry back what we carry in, and respect the places and people we visit.' },
      { icon: '💯', title: 'Fair pricing', text: 'The price you see is the price you pay: no hidden charges.' },
    ],
  },
  cta: {
    title: 'Ready for your first trek with us?',
    button_label: 'See upcoming trips',
  },
};

const SQL = {
  tables: [
    `CREATE TABLE IF NOT EXISTS about_page (
      id TINYINT NOT NULL PRIMARY KEY,
      content MEDIUMTEXT NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS about_team (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(100) NULL,
      intro VARCHAR(300) NULL,
      fact VARCHAR(100) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS about_photos (
      slot VARCHAR(40) NOT NULL PRIMARY KEY,
      mime VARCHAR(40) NOT NULL,
      data MEDIUMBLOB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ],
  getContent: 'SELECT content FROM about_page WHERE id = 1',
  saveContent: `
    INSERT INTO about_page (id, content, updated_by) VALUES (1, ?, ?)
    ON DUPLICATE KEY UPDATE content = VALUES(content), updated_by = VALUES(updated_by)`,
  team: 'SELECT id, name, role, intro, fact, sort_order, is_active FROM about_team ORDER BY sort_order, id',
  addMember: 'INSERT INTO about_team SET ?',
  updateMember: 'UPDATE about_team SET ? WHERE id = ?',
  deleteMember: 'DELETE FROM about_team WHERE id = ?',
  photos: 'SELECT slot, mime, UNIX_TIMESTAMP(updated_at) AS version FROM about_photos',
  photoData: 'SELECT data FROM about_photos WHERE slot = ?',
  savePhoto: `
    INSERT INTO about_photos (slot, mime, data) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
  deletePhoto: 'DELETE FROM about_photos WHERE slot = ?',
};

/* ---------------- Tables ---------------- */

let tablesReady = null;
// Creates the tables once per server start (before the first query)
function ensureTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of SQL.tables) await executeQuery(sql);
    })().catch((error) => {
      tablesReady = null; // try again next time
      throw error;
    });
  }
  return tablesReady;
}

/* ---------------- Texts ---------------- */

// Saved texts over the defaults, so a part never saved still shows
function withDefaults(saved) {
  const merged = {};
  for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
    const own = saved?.[key];
    if (Array.isArray(value)) merged[key] = Array.isArray(own) ? own : value;
    else merged[key] = { ...value, ...(own && typeof own === 'object' ? own : {}) };
  }
  return merged;
}

async function getContent() {
  await ensureTables();
  const [row] = await executeQuery(SQL.getContent);
  let saved = null;
  try {
    saved = row ? JSON.parse(row.content) : null;
  } catch {
    saved = null;
  }
  return withDefaults(saved);
}

async function saveContent(content, adminId) {
  await ensureTables();
  await executeQuery(SQL.saveContent, [JSON.stringify(content), adminId || null]);
}

/* ---------------- Team ---------------- */

const toMember = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role || '',
  intro: row.intro || '',
  fact: row.fact || '',
  sort_order: row.sort_order,
  is_active: Number(row.is_active) === 1,
});

async function getTeam() {
  await ensureTables();
  return (await executeQuery(SQL.team)).map(toMember);
}

async function addMember(row) {
  await ensureTables();
  const result = await executeQuery(SQL.addMember, [row]);
  return result.insertId;
}

async function updateMember(id, row) {
  await executeQuery(SQL.updateMember, [row, id]);
}

async function deleteMember(id) {
  await executeQuery(SQL.deleteMember, [id]);
  await deletePhoto(`team-${id}`);
}

/* ---------------- Photos ---------------- */

// slot -> { mime, version }; one small query, kept for 2 minutes and dropped
// at once when a photo changes here
const INDEX_FOR = 2 * 60 * 1000;
let photoIndex = null;
let photoIndexAt = 0;
async function getPhotoIndex() {
  if (!photoIndex || Date.now() - photoIndexAt > INDEX_FOR) {
    await ensureTables();
    const rows = await executeQuery(SQL.photos);
    photoIndex = new Map(rows.map((r) => [r.slot, { mime: r.mime, version: Number(r.version) }]));
    photoIndexAt = Date.now();
  }
  return photoIndex;
}
const forgetPhotos = () => { photoIndex = null; };

const photoUrl = (slot, photo) => (photo ? `/about-photo/${slot}?v=${photo.version}` : null);

async function savePhoto(slot, mime, buffer) {
  if (!isSlot(slot)) throw new Error('Unknown photo');
  await ensureTables();
  try {
    // Prepared statement: the photo is sent as it is, not as hex text
    await pool.promise().execute(SQL.savePhoto, [slot, mime, buffer]);
  } catch (error) {
    if (error?.code === 'ER_NET_PACKET_TOO_LARGE') {
      const tooBig = new Error('The database does not accept a photo this large. Please use a smaller photo.');
      tooBig.status = 400;
      throw tooBig;
    }
    throw error;
  } finally {
    forgetPhotos();
  }
}

async function deletePhoto(slot) {
  try {
    await executeQuery(SQL.deletePhoto, [slot]);
  } finally {
    forgetPhotos();
  }
}

const reading = new Map(); // cache file -> promise, so one photo is read once at a time

async function cacheFile(slot, photo) {
  const file = path.join(CACHE_DIR, `${slot}-${photo.version}.${EXT[photo.mime] || 'jpg'}`);
  if (fs.existsSync(file)) return file;
  if (!reading.has(file)) {
    reading.set(file, (async () => {
      const [row] = await executeQuery(SQL.photoData, [slot]);
      if (!row?.data) return null;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const part = `${file}.${process.pid}.part`;
      fs.writeFileSync(part, row.data);
      fs.renameSync(part, file);
      return file;
    })().finally(() => reading.delete(file)));
  }
  return reading.get(file);
}

/** Express handler for GET /about-photo/:slot */
async function aboutPhoto(req, res, next) {
  const { slot } = req.params;
  if (!isSlot(slot)) return res.status(404).end();
  try {
    const photo = (await getPhotoIndex()).get(slot);
    const file = photo && await cacheFile(slot, photo);
    if (!file) return res.status(404).end();
    const current = Number(req.query.v) === photo.version;
    return res.sendFile(file, {
      maxAge: current ? 365 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000,
      immutable: current,
      headers: { 'Content-Type': photo.mime },
    });
  } catch (error) {
    return next(error);
  }
}

/* ---------------- Whole page ---------------- */

/**
 * Everything the page needs. all = true (admin): hidden team members too.
 * { content, photos: { banner, story, founder }, team: [{ …, photo }] }
 */
async function getAbout({ all = false } = {}) {
  const [content, team, photos] = await Promise.all([getContent(), getTeam(), getPhotoIndex()]);
  return {
    content,
    photos: Object.fromEntries(PAGE_SLOTS.map((slot) => [slot, photoUrl(slot, photos.get(slot))])),
    team: team
      .filter((member) => all || member.is_active)
      .map((member) => ({ ...member, photo: photoUrl(`team-${member.id}`, photos.get(`team-${member.id}`)) })),
  };
}

module.exports = {
  DEFAULT_CONTENT,
  PAGE_SLOTS,
  isSlot,
  ensureTables,
  getAbout,
  saveContent,
  getTeam,
  addMember,
  updateMember,
  deleteMember,
  savePhoto,
  deletePhoto,
  aboutPhoto,
};
