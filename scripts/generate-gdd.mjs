import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'docs', 'gdd.html');
const pdfPath = path.join(root, 'GDD_La_Gran_Emboscada.pdf');
const previewDir = path.join(root, 'docs', 'gdd-preview');

fs.mkdirSync(previewDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.images].every((img) => img.complete));
await page.waitForTimeout(250);

const audit = await page.evaluate(() => {
  const pages = [...document.querySelectorAll('.page')];
  return {
    pages: pages.length,
    brokenImages: [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.getAttribute('src')),
    link: document.querySelector('.end-url')?.getAttribute('href') || null,
    layout: pages.map((p, index) => {
      const inner = p.querySelector('.page-inner') || p.querySelector('.cover-inner') || p.querySelector('.end-inner');
      const pageRect = p.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const bottomOverflow = innerRect.bottom - pageRect.bottom;
      const contentChildren = [...inner.children].filter((el) => !el.classList.contains('footer'));
      const contentBottom = contentChildren.length
        ? Math.max(...contentChildren.map((el) => el.getBoundingClientRect().bottom))
        : innerRect.top;
      return {
        page: index + 1,
        innerHeight: Math.round(innerRect.height),
        scrollHeight: inner.scrollHeight,
        clientHeight: inner.clientHeight,
        overflow: inner.scrollHeight - inner.clientHeight,
        bottomOverflow: Math.round(bottomOverflow),
        fill: Math.round(((contentBottom - innerRect.top) / innerRect.height) * 100),
      };
    }),
  };
});

console.log(JSON.stringify({ ...audit, link: audit.link }, null, 2));

if (audit.brokenImages.length) {
  throw new Error(`Imágenes rotas: ${audit.brokenImages.join(', ')}`);
}
if (audit.link !== 'https://lagranoleada.vercel.app/') {
  throw new Error(`Link final inesperado: ${audit.link}`);
}
const overflowing = audit.layout.filter((p) => p.overflow > 1 || p.bottomOverflow > 1);
if (overflowing.length) {
  console.warn('Páginas con posible desborde:', JSON.stringify(overflowing, null, 2));
}

for (const item of audit.layout) {
  const el = page.locator('.page').nth(item.page - 1);
  await el.screenshot({ path: path.join(previewDir, `page-${String(item.page).padStart(2, '0')}.png`) });
}

await page.pdf({
  path: pdfPath,
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
});

const pdf = fs.readFileSync(pdfPath);
const pdfText = pdf.toString('latin1');
const pageObjects = (pdfText.match(/\/Type\s*\/Page\b/g) || []).length;
console.log(JSON.stringify({
  pdf: pdfPath,
  bytes: pdf.length,
  header: pdf.subarray(0, 5).toString(),
  pageObjects,
  preview: previewDir,
}, null, 2));

await browser.close();
