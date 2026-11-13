// About Page screen: the website's /about page (story, numbers, founder,
// team, values). Called by controller/controller.js. The data and photos
// live in the database (see apps/server/src/components/about/aboutPage.js).
const about = require('../../../server/src/components/about/aboutPage');
const { badRequest, notFound, logActivity } = require('../../utils/http');
// Story and founder note come from the rich text editor (same as trips)
const { cleanRichText, plainText } = require('../package/richText');

const MAX_STORY_CHARS = 8000; // text, without the formatting
const MAX_NOTE_CHARS = 2000;

// Formatted text: cleaned HTML ('' when empty); too long -> error
function richText(value, maxChars, label) {
  const html = cleanRichText(String(value ?? '')) || '';
  if (plainText(html).length > maxChars) throw badRequest(`${label} is too long (max ${maxChars} characters)`);
  return html;
}

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEAM = 30;
const MAX_STATS = 4;
const MAX_VALUES = 6;
const MAX_CREDENTIALS = 6;

const text = (value, max) => String(value ?? '').trim().slice(0, max);

// "data:image/webp;base64,…" -> { mime, buffer }
function readPhoto(dataUrl) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw badRequest('The photo could not be read. Please choose it again.');
  if (!IMAGE_TYPES[match[1]]) throw badRequest('Photos must be JPG, PNG or WebP');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('The photo is too large (max 8 MB)');
  return { mime: match[1], buffer };
}

async function storePhoto(slot, dataUrl) {
  const { mime, buffer } = readPhoto(dataUrl);
  try {
    await about.savePhoto(slot, mime, buffer);
  } catch (error) {
    if (error.status === 400) throw badRequest(error.message);
    throw error;
  }
}

const getAbout = () => about.getAbout({ all: true });

/* ---------------- Page texts ---------------- */

const instagramLink = (value) => {
  const link = text(value, 200);
  if (!link) return '';
  if (!/^https:\/\/(www\.)?instagram\.com\//i.test(link)) throw badRequest('The Instagram link must start with https://instagram.com/');
  return link;
};

function cleanContent(body = {}) {
  const part = (key) => (body[key] && typeof body[key] === 'object' ? body[key] : {});
  const banner = part('banner');
  const story = part('story');
  const founder = part('founder');
  const team = part('team');
  const values = part('values');
  const cta = part('cta');

  const content = {
    banner: {
      eyebrow: text(banner.eyebrow, 60),
      title: text(banner.title, 120),
      subtitle: text(banner.subtitle, 200),
    },
    story: {
      eyebrow: text(story.eyebrow, 60),
      title: text(story.title, 120),
      text: richText(story.text, MAX_STORY_CHARS, 'The story'),
    },
    stats: (Array.isArray(body.stats) ? body.stats : [])
      .map((s) => ({ value: text(s?.value, 20), label: text(s?.label, 40) }))
      .filter((s) => s.value || s.label)
      .slice(0, MAX_STATS),
    founder: {
      show: founder.show === true,
      eyebrow: text(founder.eyebrow, 60),
      name: text(founder.name, 100),
      role: text(founder.role, 100),
      note: richText(founder.note, MAX_NOTE_CHARS, 'The founder note'),
      credentials: (Array.isArray(founder.credentials) ? founder.credentials : [])
        .map((c) => text(c, 60))
        .filter(Boolean)
        .slice(0, MAX_CREDENTIALS),
      instagram: instagramLink(founder.instagram),
    },
    team: {
      eyebrow: text(team.eyebrow, 60),
      title: text(team.title, 120),
      subtitle: text(team.subtitle, 300),
    },
    values: {
      eyebrow: text(values.eyebrow, 60),
      title: text(values.title, 120),
      items: (Array.isArray(values.items) ? values.items : [])
        .map((v) => ({ icon: text(v?.icon, 8), title: text(v?.title, 60), text: text(v?.text, 300) }))
        .filter((v) => v.title)
        .slice(0, MAX_VALUES),
    },
    cta: {
      title: text(cta.title, 120),
      button_label: text(cta.button_label, 40),
    },
  };

  if (!content.banner.title) throw badRequest('Enter the banner heading');
  if (!content.story.text) throw badRequest('Enter the story text');
  if (content.founder.show && !content.founder.name) throw badRequest("Enter the founder's name, or switch off the founder section");
  return content;
}

async function saveContent(admin, body) {
  const content = cleanContent(body);
  await about.saveContent(content, admin?.id);
  await logActivity(admin, 'update', 'about', null, 'texts');
  return getAbout();
}

/* ---------------- Page photos (banner, story, founder) ---------------- */

function pageSlot(slot) {
  if (!about.PAGE_SLOTS.includes(slot)) throw notFound('Unknown photo');
  return slot;
}

async function savePagePhoto(admin, slot, body = {}) {
  await storePhoto(pageSlot(slot), body.dataUrl);
  await logActivity(admin, 'upload_photo', 'about', null, slot);
  return getAbout();
}

async function deletePagePhoto(admin, slot) {
  await about.deletePhoto(pageSlot(slot));
  await logActivity(admin, 'delete_photo', 'about', null, slot);
  return getAbout();
}

/* ---------------- Team ---------------- */

function cleanMember(body = {}) {
  const name = text(body.name, 100);
  if (!name) throw badRequest("Enter the team member's name");
  return {
    name,
    role: text(body.role, 100) || null,
    intro: text(body.intro, 300) || null,
    fact: text(body.fact, 100) || null,
    is_active: body.is_active === false ? 0 : 1,
  };
}

async function findMember(id) {
  const member = (await about.getTeam()).find((m) => Number(m.id) === Number(id));
  if (!member) throw notFound('Team member not found');
  return member;
}

// Photo sent with the member: dataUrl = new photo, removePhoto = take it off
async function memberPhoto(id, body) {
  if (body.dataUrl) await storePhoto(`team-${id}`, body.dataUrl);
  else if (body.removePhoto) await about.deletePhoto(`team-${id}`);
}

async function createMember(admin, body = {}) {
  const team = await about.getTeam();
  if (team.length >= MAX_TEAM) throw badRequest(`Up to ${MAX_TEAM} team members`);
  const row = cleanMember(body);
  if (body.dataUrl) readPhoto(body.dataUrl); // a bad photo stops here, before the member is added
  const sortOrder = team.reduce((max, m) => Math.max(max, Number(m.sort_order) || 0), 0) + 1;
  const id = await about.addMember({ ...row, sort_order: sortOrder });
  await memberPhoto(id, body);
  await logActivity(admin, 'create', 'about_team', id, row.name);
  return getAbout();
}

async function updateMember(admin, id, body = {}) {
  const member = await findMember(id);
  const row = cleanMember(body);
  await about.updateMember(member.id, row);
  await memberPhoto(member.id, body);
  await logActivity(admin, 'update', 'about_team', member.id, row.name);
  return getAbout();
}

async function deleteMember(admin, id) {
  const member = await findMember(id);
  await about.deleteMember(member.id);
  await logActivity(admin, 'delete', 'about_team', member.id, member.name);
  return getAbout();
}

// ids in the new order
async function reorderTeam(admin, ids = []) {
  const team = await about.getTeam();
  const known = new Set(team.map((m) => Number(m.id)));
  const order = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => known.has(id));
  if (order.length !== team.length) throw badRequest('Order does not match the team');
  for (const [index, id] of order.entries()) await about.updateMember(id, { sort_order: index + 1 });
  await logActivity(admin, 'reorder', 'about_team', null, order.join(','));
  return getAbout();
}

module.exports = {
  getAbout,
  saveContent,
  savePagePhoto,
  deletePagePhoto,
  createMember,
  updateMember,
  deleteMember,
  reorderTeam,
};
