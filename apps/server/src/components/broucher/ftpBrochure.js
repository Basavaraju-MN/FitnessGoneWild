// Brochures kept on Hostinger, read over FTP (no public web address needed).
// Manage the PDFs in Hostinger File Manager → public/brochures/:
//   kudremukh.pdf               (slug.pdf — preferred)
//   kudremukh-2D1N.pdf          (any name starting with the slug)
//   kudremukh/anything.pdf      (a folder named by the slug)
//
// Environment (Render + apps/server/.env):
//   HOSTINGER_FTP_HOST       FTP hostname / IP from hPanel → Files → FTP Accounts
//   HOSTINGER_FTP_USER       FTP username
//   HOSTINGER_FTP_PASSWORD   FTP password
//   HOSTINGER_FTP_PORT       optional, default 21
//   HOSTINGER_FTP_SECURE     optional: "true" (FTPS, default) or "false" (plain FTP)
//   BROCHURE_FTP_DIR         optional, default public/brochures (relative to the FTP login folder = public_html)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');
const ftp = require('basic-ftp');

// The admin can run on its own locally: the settings live in apps/server/.env
require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });

const env = () => ({
  host: String(process.env.HOSTINGER_FTP_HOST || '').trim(),
  user: String(process.env.HOSTINGER_FTP_USER || '').trim(),
  password: String(process.env.HOSTINGER_FTP_PASSWORD || ''),
  port: Number(process.env.HOSTINGER_FTP_PORT || 21),
  secure: String(process.env.HOSTINGER_FTP_SECURE || 'true').toLowerCase() !== 'false',
  dir: String(process.env.BROCHURE_FTP_DIR || 'public/brochures').trim().replace(/^\/+|\/+$/g, ''),
});

const isConfigured = () => Boolean(env().host && env().user && env().password);
const validSlug = (slug) => /^[a-z0-9_-]+$/i.test(String(slug || ''));
const isPdf = (name) => /\.pdf$/i.test(name);

async function connect() {
  const cfg = env();
  const client = new ftp.Client(20000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
      secure: cfg.secure,
      // Hostinger's FTP certificate is often issued for another hostname
      secureOptions: cfg.secure ? { rejectUnauthorized: false } : undefined,
    });
  } catch (error) {
    client.close();
    // FTPS not offered on this account: try plain FTP once
    if (cfg.secure && /AUTH|TLS|SSL|530 /i.test(String(error?.message))) {
      const plain = new ftp.Client(20000);
      await plain.access({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, secure: false });
      return plain;
    }
    throw error;
  }
  return client;
}

// Folder listing, kept for 2 minutes so checks stay fast
let cache = { at: 0, entries: null };
async function listFolder(client) {
  if (cache.entries && Date.now() - cache.at < 2 * 60 * 1000) return cache.entries;
  const entries = (await client.list(env().dir)).map((e) => ({ name: e.name, size: e.size, isDir: e.isDirectory }));
  cache = { at: Date.now(), entries };
  return entries;
}
const clearCache = () => { cache = { at: 0, entries: null }; };

// Path (inside the brochures folder) of the trek's PDF, or null
async function findPath(client, slug) {
  const entries = await listFolder(client);
  const lower = slug.toLowerCase();
  const pdfs = entries.filter((e) => !e.isDir && isPdf(e.name));

  const exact = pdfs.find((e) => e.name.toLowerCase() === `${lower}.pdf`);
  if (exact) return { file: exact.name, size: exact.size };

  const starts = pdfs.filter((e) => e.name.toLowerCase().startsWith(`${lower}`)).sort((a, b) => a.name.localeCompare(b.name));
  if (starts[0]) return { file: starts[0].name, size: starts[0].size };

  const folder = entries.find((e) => e.isDir && e.name.toLowerCase() === lower);
  if (folder) {
    const inside = (await client.list(`${env().dir}/${folder.name}`)).filter((e) => !e.isDirectory && isPdf(e.name)).sort((a, b) => a.name.localeCompare(b.name));
    if (inside[0]) return { file: `${folder.name}/${inside[0].name}`, size: inside[0].size };
  }
  return null;
}

/** { file, size } when the trek's brochure is on Hostinger, else null (never throws). */
async function findBrochure(slug, { fresh = false } = {}) {
  if (!isConfigured() || !validSlug(slug)) return null;
  let client;
  try {
    client = await connect();
    if (fresh) clearCache();
    return await findPath(client, slug);
  } catch (error) {
    console.error('Hostinger FTP (brochure check) failed:', error?.message || error);
    return null;
  } finally {
    client?.close();
  }
}

// Where each trek's PDF was last found, so most downloads skip the folder listing
const known = new Map(); // slug -> { file, size, at }
const KNOWN_FOR = 10 * 60 * 1000;

// The trek's PDF on an open connection: the remembered path if the file is
// still there (one quick SIZE call), else looked up fresh (renames show at once)
async function locate(client, slug) {
  const hit = known.get(slug);
  if (hit && Date.now() - hit.at < KNOWN_FOR) {
    try {
      const size = await client.size(`${env().dir}/${hit.file}`);
      return { file: hit.file, size };
    } catch {
      known.delete(slug); // moved or renamed
    }
  }
  clearCache();
  const found = await findPath(client, slug);
  if (found) known.set(slug, { ...found, at: Date.now() });
  return found;
}

// A copy of each PDF on this server's own disk, so most downloads need no FTP.
// The copy is trusted for 10 minutes, then checked against Hostinger again
// (a replaced or renamed file is picked up then). The disk is temporary on
// Render, so copies are fetched again after a restart (see warmUp).
const CACHE_DIR = path.join(os.tmpdir(), 'fgw-brochures');
const copies = new Map(); // slug -> { file, size, path, at }
const COPY_FRESH_FOR = 10 * 60 * 1000;

const copyIsThere = (copy) => {
  try {
    return fs.statSync(copy.path).size === copy.size;
  } catch {
    return false;
  }
};
const fromDisk = (copy) => ({ stream: fs.createReadStream(copy.path), file: copy.file, size: copy.size });

/**
 * The trek's PDF as { stream, file, size }, or null when it is not on Hostinger.
 * Sent from the local copy when there is a current one; otherwise downloaded
 * over one FTP connection and saved as the new copy while it is sent.
 */
async function openBrochure(slug) {
  if (!isConfigured() || !validSlug(slug)) return null;
  const key = slug.toLowerCase();

  const copy = copies.get(key);
  if (copy && Date.now() - copy.at < COPY_FRESH_FOR && copyIsThere(copy)) return fromDisk(copy);

  const client = await connect();
  try {
    const found = await locate(client, slug);
    if (!found) {
      client.close();
      copies.delete(key);
      return null;
    }

    // Same file as the copy: no need to download it again
    if (copy && copy.file === found.file && copy.size === found.size && copyIsThere(copy)) {
      client.close();
      copy.at = Date.now();
      return fromDisk(copy);
    }

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const target = path.join(CACHE_DIR, `${key}.pdf`);
    const part = `${target}.${process.pid}.${Date.now()}.part`;
    const disk = fs.createWriteStream(part);
    const diskClosed = new Promise((resolve) => disk.on('close', resolve).on('error', resolve));
    const stream = new PassThrough();
    const source = new PassThrough();
    source.pipe(stream);
    source.pipe(disk);

    client.downloadTo(source, `${env().dir}/${found.file}`)
      .then(async () => {
        await diskClosed;
        try {
          fs.renameSync(part, target);
          copies.set(key, { file: found.file, size: found.size, path: target, at: Date.now() });
        } catch { /* keep serving from Hostinger */ }
      })
      .catch((error) => {
        stream.destroy(error);
        disk.destroy();
        fs.rm(part, { force: true }, () => {});
      })
      .finally(() => client.close());
    return { stream, file: found.file, size: found.size };
  } catch (error) {
    client.close();
    throw error;
  }
}

/**
 * Fetches every brochure into the local copy in the background (one at a
 * time), so the first visitor after a restart also gets a fast download.
 * Covers trek folders (brochures/<slug>/) and <slug>.pdf files.
 */
async function warmUp() {
  if (!isConfigured()) return;
  let slugs = [];
  try {
    const entries = await listBrochures();
    slugs = entries
      .map((e) => (e.isDir ? e.name : e.name.replace(/\.pdf$/i, '')))
      .filter(validSlug);
  } catch (error) {
    console.error('Brochure warm-up: listing failed:', error?.message || error);
    return;
  }
  let done = 0;
  for (const slug of [...new Set(slugs)]) {
    try {
      const file = await openBrochure(slug);
      if (!file) continue;
      await new Promise((resolve) => {
        file.stream.on('end', resolve).on('error', resolve).on('close', resolve);
        file.stream.resume();
      });
      done += 1;
    } catch (error) {
      console.error(`Brochure warm-up (${slug}) failed:`, error?.message || error);
    }
  }
  console.log(`Brochures ready on this server: ${done} of ${slugs.length}`);
}

// For the admin: what is in the brochures folder
async function listBrochures() {
  if (!isConfigured()) return null;
  const client = await connect();
  try {
    clearCache();
    return (await listFolder(client)).filter((e) => e.isDir || isPdf(e.name));
  } finally {
    client.close();
  }
}

module.exports = { isConfigured, findBrochure, openBrochure, listBrochures, warmUp, folder: () => env().dir };
