const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const dir = __dirname;
const fileUrl = 'file:///' + path.join(dir, 'mockups.html').replace(/\\/g, '/');

const shots = [
  ['s-config', 'schermata-1-configurazione.png'],
  ['s-cal',    'schermata-2-calendario.png'],
  ['s-log',    'schermata-3-log-grafico.png'],
  ['s-err',    'schermata-4-errori.png'],
  ['s-set',    'schermata-5-impostazioni.png'],
  ['s-gate',   'schermata-6-gate-apikey.png'],
  ['s-logdet', 'schermata-7-log-dettaglio.png'],
  ['s-status', 'schermata-8-stato.png'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=2', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 1000, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  for (const [id, out] of shots) {
    const el = await page.$('#' + id);
    await el.screenshot({ path: path.join(dir, out) });
    console.log('written', out);
  }

  // full overview
  await page.screenshot({ path: path.join(dir, 'schermate-tutte.png'), fullPage: true });
  console.log('written schermate-tutte.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
