// Checks the Hostinger FTP brochure setup and lists the brochures folder.
//   node apps/server/scripts/check-brochure-ftp.js            (from the repo)
//   node scripts/check-brochure-ftp.js kudremukh              (also looks for one trek)
// Uses HOSTINGER_FTP_* and BROCHURE_FTP_DIR from apps/server/.env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const ftpBrochure = require('../src/components/broucher/ftpBrochure');

(async () => {
  if (!ftpBrochure.isConfigured()) {
    console.log('Not set up: fill HOSTINGER_FTP_HOST, HOSTINGER_FTP_USER and HOSTINGER_FTP_PASSWORD in apps/server/.env');
    process.exit(1);
  }
  console.log(`Connecting to ${process.env.HOSTINGER_FTP_HOST} as ${process.env.HOSTINGER_FTP_USER}, folder "${ftpBrochure.folder()}" …`);
  try {
    const entries = await ftpBrochure.listBrochures();
    console.log(`OK — ${entries.length} item(s) in ${ftpBrochure.folder()}:`);
    for (const e of entries) console.log(`  ${e.isDir ? '[folder] ' : ''}${e.name}${e.isDir ? '' : `  (${Math.round(e.size / 1024)} KB)`}`);
    const slug = process.argv[2];
    if (slug) {
      const found = await ftpBrochure.findBrochure(slug);
      console.log(found ? `Trek "${slug}": ${found.file} will be sent` : `Trek "${slug}": no PDF found (name it ${slug}.pdf)`);
    }
    process.exit(0);
  } catch (error) {
    console.log('FAILED:', error.message);
    if (/550|No such file|not found/i.test(error.message)) {
      console.log(`The folder "${ftpBrochure.folder()}" does not exist for this FTP login. Create it in File Manager, or set BROCHURE_FTP_DIR.`);
    }
    if (/530|login|auth/i.test(error.message)) console.log('Check HOSTINGER_FTP_USER / HOSTINGER_FTP_PASSWORD.');
    process.exit(1);
  }
})();
