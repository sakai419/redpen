#!/usr/bin/env node
/* redpen — 本物の Chrome で、実際のページに対する見た目と操作を確かめる
 *   node scripts/test-browser.js [--shot]
 *
 * Chrome 137 以降 --load-extension が無効化されたため、拡張として読ませる代わりに
 * content script と同じファイル一式を同じ順序でページに流し込んで検証する。
 * ページ自体は HTTP で配信した本物（.md は text/plain、.html は text/html）なので、
 * レイアウト・CSS・選択まわりはふだん使う経路と同じものを見ていることになる。
 */
const path = require('path');
const fs = require('fs');
const { ROOT, launch, serveExamples, box, reporter, wait } = require('./lib/browser');

const { check, section, finish } = reporter();
const WANT_SHOTS = process.argv.includes('--shot');
const SHOT_DIR = process.env.RP_SHOT_DIR || path.join(ROOT, '.shots');

// manifest の content_scripts と同じ並び
const CSS_FILES = ['src/content/page.css', 'src/content/hljs-theme.css'];
const JS_FILES = [
  'src/vendor/markdown-it.min.js',
  'src/vendor/purify.min.js',
  'src/vendor/highlight.min.js',
  'src/lib/util.js',
  'src/lib/store.js',
  'src/lib/exporter.js',
  'src/content/detect.js',
  'src/content/markdown.js',
  'src/content/outline.js',
  'src/content/anchor.js',
  'src/content/marks.js',
  'src/content/sidebar.js',
  'src/content/app.js',
  'src/content/main.js'
];

async function injectExtension(page) {
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'dev/chrome-stub.js'), 'utf8'));
  for (const f of CSS_FILES) await page.addStyleTag({ path: path.join(ROOT, f) });
  for (const f of JS_FILES) await page.addScriptTag({ path: path.join(ROOT, f) });
  await wait(500);
}

/** 段落をドラッグして 1 行選択する */
async function selectLineIn(page, selector, needle) {
  const target = await page.evaluate(
    ({ selector, needle }) => {
      const el = [...document.querySelectorAll(selector)].find((e) => e.textContent.includes(needle));
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width };
    },
    { selector, needle }
  );
  if (!target) return null;
  await wait(250);
  const fresh = await page.evaluate(
    ({ selector, needle }) => {
      const el = [...document.querySelectorAll(selector)].find((e) => e.textContent.includes(needle));
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width };
    },
    { selector, needle }
  );
  await page.mouse.move(fresh.x + 4, fresh.y + 12);
  await page.mouse.down();
  await page.mouse.move(fresh.x + fresh.w - 24, fresh.y + 12, { steps: 14 });
  await page.mouse.up();
  await wait(260);
  return fresh;
}

(async () => {
  const { server, origin } = await serveExamples();
  const browser = await launch();
  const errors = [];
  const shot = async (name) => {
    if (!WANT_SHOTS) return;
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOT_DIR, name) });
  };

  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 1440, height: 900 });

  /* ================= Markdown ================= */
  await page.goto(`${origin}/sample-report.md`, { waitUntil: 'load' });
  await injectExtension(page);

  section('Markdown ページ (1440x900)');
  check('例外が出ない', errors.length === 0, errors.join('\n').slice(0, 600));
  check('Markdown が描画される', (await page.$$eval('.rp-doc h2', (e) => e.length)) >= 4);
  check('原文の行番号が焼き込まれる', (await page.$$eval('.rp-doc [data-rp-line]', (e) => e.length)) > 10);
  check('コードがハイライトされる', (await page.$$eval('.rp-doc pre .hljs-keyword', (e) => e.length)) > 0);
  check('レビューパネルが差し込まれる', (await page.$('#redpen-root')) !== null);

  section('目次サイドバー');
  const nav = await box(page, '.rp-outline');
  check('目次が画面に出ている', nav?.visible, JSON.stringify(nav));
  check('左端に固定されている', nav && nav.x === 0 && nav.w > 200, JSON.stringify(nav));
  const doc = await box(page, '.rp-doc');
  check('本文が目次に潜り込まない', doc && nav && doc.x >= nav.w, `doc.x=${doc?.x} nav.w=${nav?.w}`);
  check('見出しが並ぶ', (await page.$$eval('.rp-outline-link', (e) => e.length)) >= 8);
  check('現在位置が示される', (await page.$('.rp-outline-link.is-active')) !== null);

  section('文字サイズ');
  const sizes = await page.evaluate(() => {
    const px = (sel) => {
      const el = document.querySelector(sel);
      return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10 : null;
    };
    return {
      body: px('.rp-doc p'), h1: px('.rp-doc h1'), h2: px('.rp-doc h2'), h3: px('.rp-doc h3'),
      li: px('.rp-doc li'), code: px('.rp-doc pre code'), table: px('.rp-doc td'),
      nav: px('.rp-outline-link')
    };
  });
  console.log(`      本文 ${sizes.body} / h1 ${sizes.h1} / h2 ${sizes.h2} / h3 ${sizes.h3} / 箇条書き ${sizes.li} / コード ${sizes.code} / 表 ${sizes.table} / 目次 ${sizes.nav}`);
  check('本文が 17px 以上', sizes.body >= 17, `${sizes.body}px`);
  check('箇条書きも同じ大きさ', sizes.li >= 17, `${sizes.li}px`);
  check('コードが 14px 以上', sizes.code >= 14, `${sizes.code}px`);
  check('表が 15px 以上', sizes.table >= 15, `${sizes.table}px`);
  check('目次が 13px 以上', sizes.nav >= 13, `${sizes.nav}px`);

  section('選択したときのツールチップ');
  const target = await selectLineIn(page, '.rp-doc p', '本システムは常時オンライン');
  check('テキストが選択できる',
    (await page.evaluate(() => window.getSelection().toString())).trim().length > 4);
  const launcher = await box(page, '#launcher', true);
  check('ツールチップが出る', launcher?.visible, JSON.stringify(launcher));
  check('選択位置の近くに出る',
    launcher && target && Math.abs(launcher.y - target.y) < 240,
    `launcher.y=${launcher?.y} target.y=${Math.round(target?.y)}`);
  check('続きの本文に被らない',
    launcher && target && launcher.y + launcher.h <= target.y + 2,
    `launcher下端=${launcher && launcher.y + launcher.h} 選択上端=${Math.round(target?.y)}`);
  check('画面の中に収まる',
    launcher && launcher.x >= 0 && launcher.y >= 0 && launcher.y + launcher.h <= 900,
    JSON.stringify(launcher));
  await shot('01-selection.png');

  section('コメントの追加');
  await page.evaluate(() =>
    document.getElementById('redpen-root').shadowRoot.getElementById('launcher').click());
  await wait(250);
  const composer = await box(page, '#composer', true);
  check('入力欄が出る', composer?.visible, JSON.stringify(composer));
  check('入力欄が画面に収まる',
    composer && composer.x >= 0 && composer.y >= 0 && composer.y + composer.h <= 900,
    JSON.stringify(composer));
  await page.evaluate(() => {
    const s = document.getElementById('redpen-root').shadowRoot;
    s.getElementById('composerInput').value = 'オフライン時の挙動が未定義です。';
    s.getElementById('composerSave').click();
  });
  await wait(400);
  check('本文にハイライトが入る', (await page.$$eval('mark.rp-hl', (e) => e.length)) > 0);
  const panel = await box(page, '.panel', true);
  check('レビューパネルが開く', panel?.visible && panel.w > 300, JSON.stringify(panel));
  check('本文とパネルが重ならない',
    (await box(page, '.rp-doc')).x + (await box(page, '.rp-doc')).w <= panel.x + 2,
    `doc右端=${(await box(page, '.rp-doc')).x + (await box(page, '.rp-doc')).w} panel.x=${panel.x}`);
  const exported = await page.evaluate(() =>
    window.RedPen.exporter.build(window.RedPen.session.state.doc, {}));
  check('行番号つきで書き出せる', exported.startsWith('## L30 — '), JSON.stringify(exported.slice(0, 60)));
  await shot('02-commented.png');

  section('狭い画面 (1024x800)');
  await page.setViewport({ width: 1024, height: 800 });
  await wait(400);
  const narrowNav = await box(page, '.rp-outline');
  const narrowDoc = await box(page, '.rp-doc');
  console.log(`      目次 ${narrowNav?.visible ? `見えている (${narrowNav.w}px)` : '隠れている'} / 本文 x=${narrowDoc?.x} w=${narrowDoc?.w}`);
  check('目次への入口が残る', narrowNav?.visible, JSON.stringify(narrowNav));
  check('自動で畳まれる', narrowNav && narrowNav.w < 80, `nav.w=${narrowNav?.w}`);
  check('本文が読める幅を保つ', narrowDoc && narrowDoc.w > 340, JSON.stringify(narrowDoc));
  check('本文が目次に潜り込まない',
    narrowDoc && narrowNav && narrowDoc.x >= narrowNav.w, `doc.x=${narrowDoc?.x} nav.w=${narrowNav?.w}`);

  // トグルを押して開くと、そのあとは幅が変わっても勝手に畳まれない
  await page.evaluate(() => document.querySelector('.rp-outline-toggle').click());
  await wait(300);
  check('手で開ける', (await box(page, '.rp-outline')).w > 200);
  await page.setViewport({ width: 900, height: 800 });
  await wait(300);
  check('自分で開いた状態は保たれる', (await box(page, '.rp-outline')).w > 200);
  await page.evaluate(() => document.querySelector('.rp-outline-toggle').click());
  await wait(200);
  await page.setViewport({ width: 1024, height: 800 });
  await wait(300);
  await shot('03-narrow.png');

  /* ================= HTML ================= */
  await page.setViewport({ width: 1440, height: 900 });
  const page2 = await browser.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push(String(e)));
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.goto(`${origin}/sample-report.html`, { waitUntil: 'load' });
  await injectExtension(page2);

  section('HTML ページ');
  check('例外が出ない', errors2.length === 0, errors2.join('\n').slice(0, 500));
  check('元ページの中身が残る',
    await page2.evaluate(() => document.querySelector('main h1') !== null));
  const htmlNav = await box(page2, '.rp-outline');
  check('HTML でも目次が出る', htmlNav?.visible, JSON.stringify(htmlNav));
  // 直前のページで畳んだ状態が引き継がれることがあるので、開いた状態で測る
  await page2.evaluate(() => {
    if (document.body.classList.contains('rp-outline-collapsed'))
      document.querySelector('.rp-outline-toggle').click();
  });
  await wait(300);
  const htmlNavStyle = await page2.evaluate(() => {
    const nav = document.querySelector('.rp-outline');
    const s = getComputedStyle(nav);
    return { bg: s.backgroundColor, w: s.width, border: s.borderRightWidth };
  });
  check('目次に地色と枠が付く',
    htmlNavStyle.bg !== 'rgba(0, 0, 0, 0)' && parseFloat(htmlNavStyle.border) > 0,
    JSON.stringify(htmlNavStyle));
  check('目次の幅が指定どおり', parseFloat(htmlNavStyle.w) === 264, JSON.stringify(htmlNavStyle));
  check('元ページの本文が目次の右に寄る',
    await page2.evaluate(() => document.documentElement.style.paddingLeft === '264px'),
    await page2.evaluate(() => document.documentElement.style.paddingLeft));
  check('本文が目次に潜り込まない',
    await page2.evaluate(() => {
      const nav = document.querySelector('.rp-outline');
      const main = document.querySelector('main');
      if (!nav || !main) return false;
      return main.getBoundingClientRect().x >= nav.getBoundingClientRect().width;
    }));
  await selectLineIn(page2, 'main p', 'レート制限のカウンタ');
  const launcher2 = await box(page2, '#launcher', true);
  check('HTML でもツールチップが出る', launcher2?.visible, JSON.stringify(launcher2));
  if (WANT_SHOTS) {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page2.screenshot({ path: path.join(SHOT_DIR, '04-html.png') });
  }

  check('最後まで例外なし', errors.length === 0 && errors2.length === 0,
    [...errors, ...errors2].join('\n').slice(0, 700));

  await browser.close();
  server.close();
  if (WANT_SHOTS) console.log(`\nスクリーンショット: ${SHOT_DIR}`);
  finish();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
