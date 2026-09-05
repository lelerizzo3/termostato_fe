import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const dir = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = pathToFileURL(path.join(dir, 'mockups.html')).href;

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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=2', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 1000, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  for (const [id, out] of shots) {
    const el = await page.$('#' + id);
    if (!el) throw new Error(`Mockup element not found: #${id}`);
    await el.screenshot({ path: path.join(dir, out) });
    console.log('written', out);
  }

  await page.screenshot({ path: path.join(dir, 'schermate-tutte.png'), fullPage: true });
  console.log('written schermate-tutte.png');
} finally {
  await browser.close();
}
