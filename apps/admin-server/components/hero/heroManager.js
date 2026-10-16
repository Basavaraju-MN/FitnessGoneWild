// Website Hero screen: the home page heroes. Each hero is its own slide with
// its own photo, label, headline, line of text, two buttons and stats.
// Called by controller/controller.js; reads and writes through db/dbops.js.
// Photos are saved where the website reads them: apps/client/public/images/hero/
// (and the built site, so they show at once).
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const dbops = require('../../db/dbops');
const { paths } = require('../../config');
const { badRequest, notFound, logActivity } = require('../../utils/http');

const MAX_HEROES = 8;
const MAX_FACTS = 4;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Home page sections a hero button can go to
const TARGETS = ['trips', 'featured', 'why', 'reviews', 'faq', 'contact'];

const heroDirs = () => [
  path.join(paths.clientPublic, 'images', 'hero'),
  ...(fs.existsSync(paths.clientDist) ? [path.join(paths.clientDist, 'images', 'hero')] : []),
];

const text = (value, max) => {
  const v = String(value ?? '').trim();
  return v ? v.slice(0, max) : null;
};

function parseFacts(raw) {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const toHero = (row) => ({ ...row, is_active: Number(row.is_active) === 1, facts: parseFacts(row.facts) });

async function getHero() {
  const [settings, rows] = await Promise.all([dbops.getHeroSettings(), dbops.getHeroSlides()]);
  return {
    heroes: rows.map(toHero),
    slide_seconds: settings?.slide_seconds || 4,
    targets: TARGETS,
  };
}

// New photo from the admin ("data:image/jpeg;base64,…") -> /images/hero/<file>
async function savePhoto(dataUrl) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw badRequest('The photo could not be read. Please choose it again.');
  const ext = IMAGE_TYPES[match[1]];
  if (!ext) throw badRequest('Photos must be JPG, PNG or WebP');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('The photo is too large (max 8 MB)');

  const file = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  for (const dir of heroDirs()) {
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, file), buffer);
  }
  return `/images/hero/${file}`;
}

// Only photos uploaded here (in images/hero/) are deleted, never the originals
async function removePhoto(imagePath) {
  const match = /^\/images\/hero\/([\w.-]+)$/.exec(String(imagePath || ''));
  if (!match) return;
  for (const dir of heroDirs()) {
    await fsp.rm(path.join(dir, match[1]), { force: true });
  }
}

// Fields of one hero from the admin form
function cleanHero(body) {
  const headline1 = text(body.headline_line1, 120);
  if (!headline1) throw badRequest('Enter the first line of the headline');

  const facts = (Array.isArray(body.facts) ? body.facts : [])
    .map((f) => ({ value: text(f?.value, 20), label: text(f?.label, 40) }))
    .filter((f) => f.value || f.label)
    .slice(0, MAX_FACTS);
  const target = (value, fallback) => (TARGETS.includes(value) ? value : fallback);

  return {
    eyebrow: text(body.eyebrow, 150),
    headline_line1: headline1,
    headline_line2: text(body.headline_line2, 120),
    message: text(body.message, 200),
    primary_label: text(body.primary_label, 60),
    primary_target: target(body.primary_target, 'trips'),
    secondary_label: text(body.secondary_label, 80),
    secondary_target: target(body.secondary_target, 'reviews'),
    facts: JSON.stringify(facts),
    is_active: body.is_active === false || Number(body.is_active) === 0 ? 0 : 1,
  };
}

async function findHero(id) {
  const hero = (await dbops.getHeroSlides()).find((h) => Number(h.id) === Number(id));
  if (!hero) throw notFound('Hero not found');
  return hero;
}

const activeCount = async () => (await dbops.getHeroSlides()).filter((h) => Number(h.is_active) === 1).length;

async function createHero(admin, body = {}) {
  const all = await dbops.getHeroSlides();
  if (all.length >= MAX_HEROES) throw badRequest(`Up to ${MAX_HEROES} heroes`);
  if (!body.dataUrl) throw badRequest('Choose a background photo');

  const data = cleanHero(body);
  const imagePath = await savePhoto(body.dataUrl);
  try {
    const sortOrder = all.reduce((max, h) => Math.max(max, Number(h.sort_order) || 0), 0) + 1;
    const id = await dbops.createHeroSlide({ ...data, image_path: imagePath, sort_order: sortOrder });
    await logActivity(admin, 'create', 'hero', id, data.headline_line1);
    return toHero(await findHero(id));
  } catch (error) {
    await removePhoto(imagePath).catch(() => {});
    throw error;
  }
}

async function updateHero(admin, id, body = {}) {
  const hero = await findHero(id);
  const data = cleanHero(body);
  if (!data.is_active && Number(hero.is_active) === 1 && (await activeCount()) <= 1) {
    throw badRequest('Keep at least one hero showing on the website');
  }

  let imagePath = hero.image_path;
  if (body.dataUrl) imagePath = await savePhoto(body.dataUrl);

  await dbops.updateHeroSlide(hero.id, { ...data, image_path: imagePath });
  if (imagePath !== hero.image_path) await removePhoto(hero.image_path);

  await logActivity(admin, 'update', 'hero', hero.id, data.headline_line1);
  return toHero(await findHero(hero.id));
}

async function deleteHero(admin, id) {
  const hero = await findHero(id);
  const all = await dbops.getHeroSlides();
  if (all.length <= 1) throw badRequest('Keep at least one hero');
  if (Number(hero.is_active) === 1 && (await activeCount()) <= 1) {
    throw badRequest('This is the only hero showing on the website. Switch on another one first.');
  }

  await dbops.deleteHeroSlide(hero.id);
  await removePhoto(hero.image_path);
  await logActivity(admin, 'delete', 'hero', hero.id, hero.headline_line1 || '');
  return true;
}

// ids in the new order
async function reorderHeroes(admin, ids = []) {
  const all = await dbops.getHeroSlides();
  const known = new Set(all.map((h) => Number(h.id)));
  const order = ids.map(Number).filter((id) => known.has(id));
  if (order.length !== all.length) throw badRequest('Order does not match the heroes');

  for (const [index, id] of order.entries()) await dbops.updateHeroSlide(id, { sort_order: index + 1 });
  await logActivity(admin, 'reorder', 'hero', null, order.join(','));
  return getHero();
}

async function saveHeroTiming(admin, body = {}) {
  const seconds = Math.min(15, Math.max(2, Math.round(Number(body.slide_seconds) || 4)));
  await dbops.saveHeroSettings({ slide_seconds: seconds, updated_by: admin.id || null });
  return { slide_seconds: seconds };
}

module.exports = {
  getHero,
  createHero,
  updateHero,
  deleteHero,
  reorderHeroes,
  saveHeroTiming,
};
