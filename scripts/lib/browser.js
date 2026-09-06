/* redpen — 実ブラウザ検証の共通部品 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..', '..');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function ensureChrome() {
  if (fs.existsSync(CHROME)) return CHROME;
  console.error(`Chrome が見つかりません: ${CHROME}\nCHROME_PATH で指定してください。`);
  process.exit(2);
}

async function launch({ extension = false, headless = true } = {}) {
  const args = ['--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files'];
  if (extension) {
    args.push(`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`);
  }
  return puppeteer.launch({
    executablePath: ensureChrome(),
    // 拡張の読み込みはヘッドレスだと無視される場合があるので、そのときだけ画面つきで起動する
    headless: extension ? false : headless ? 'new' : false,
    args
  });
}

/**
 * examples/ をローカル配信する。
 * .md は text/plain で返し、Chrome にプレーンテキスト表示させる
 * （= 拡張が実際に踏む content script モードを再現する）。
 */
function serveExamples(dir = path.join(ROOT, 'examples')) {
  const types = {
    '.md': 'text/plain; charset=utf-8',
    '.markdown': 'text/plain; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8'
  };
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    if (name === 'favicon.ico') {
      res.writeHead(204).end();
      return;
    }
    const file = path.join(dir, path.basename(name));
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })
    );
  });
}

/** 要素の位置・大きさ・実際に見えているか。shadow:true でレビューパネル内を見る */
function box(page, selector, shadow = false) {
  return page.evaluate(
    ({ selector, shadow }) => {
      const el = shadow
        ? document.getElementById('redpen-root')?.shadowRoot?.querySelector(selector)
        : document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        visible:
          r.width > 0 && r.height > 0 &&
          s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'
      };
    },
    { selector, shadow }
  );
}

function reporter() {
  const state = { passed: 0, failed: 0 };
  return {
    state,
    check(name, cond, detail) {
      if (cond) {
        state.passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${name}`);
      } else {
        state.failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? '\n      ' + detail : ''}`);
      }
    },
    section: (t) => console.log(`\n${t}`),
    finish() {
      console.log(`\n${state.passed} passed, ${state.failed} failed\n`);
      process.exit(state.failed === 0 ? 0 : 1);
    }
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { ROOT, CHROME, launch, serveExamples, box, reporter, wait, ensureChrome };
