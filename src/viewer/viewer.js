/* redpen — 拡張内ビューアのエントリ
 *
 * Chrome はローカルの .md を表示せずダウンロードすることがある。
 * その場合はこのページが原文を読み込み、レンダリングとレビューを引き受ける。
 */
(function () {
  'use strict';
  const RP = globalThis.RedPen;
  const util = RP.util;

  const dropzone = document.getElementById('dropzone');
  const dropMessage = document.getElementById('dropMessage');
  const dropNote = document.getElementById('dropNote');
  const shell = document.getElementById('shell');
  const article = document.getElementById('rp-doc');
  const fileInput = document.getElementById('fileInput');
  const recent = document.getElementById('recent');
  const recentList = document.getElementById('recentList');

  const params = new URLSearchParams(location.search);
  const src = params.get('src');

  async function main() {
    if (src) {
      try {
        const source = await fetchSource(src);
        await open(source, {
          key: util.docKey(src),
          title: util.basename(src),
          path: util.displayPath(util.docKey(src))
        });
        return;
      } catch (err) {
        showDropzone(
          '`' + util.displayPath(src) + '` を読み込めませんでした。',
          fileAccessHint(err)
        );
        return;
      }
    }
    showDropzone();
  }

  async function fetchSource(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }

  function fileAccessHint(err) {
    const isFile = String(src).startsWith('file://');
    if (!isFile) return String(err?.message || err);
    return (
      'ローカルファイルを直接読むには、拡張機能の詳細画面で ' +
      '<code>ファイルの URL へのアクセスを許可する</code> を ON にしてください。' +
      'ON にしたくない場合は、下のボタンからファイルを選んでも同じようにレビューできます。'
    );
  }

  async function showDropzone(message, note) {
    if (message) dropMessage.innerHTML = message;
    if (note) dropNote.innerHTML = note;
    dropzone.hidden = false;
    shell.hidden = true;

    const docs = await RP.store.listDocs();
    if (docs.length === 0) return;
    recent.hidden = false;
    recentList.textContent = '';
    for (const d of docs.slice(0, 8)) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href =
        d.key.startsWith('file://') && d.mode === 'markdown' ? util.viewerUrl(d.key) : d.key;
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = d.title;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = `未対応 ${d.open} / 全 ${d.total}`;
      a.append(name, meta);
      a.title = d.path;
      li.appendChild(a);
      recentList.appendChild(li);
    }
  }

  async function open(source, meta) {
    dropzone.hidden = true;
    shell.hidden = false;
    document.title = meta.title + ' — redpen';
    const lines = RP.markdown.render(source, article);
    const outline = RP.outline.create(article, { anchorTo: shell, mode: 'markdown' });
    await RP.app.start({
      root: article,
      mode: 'markdown',
      sourceLines: lines,
      outline,
      // このページは redpen 専用なので、止める先がない
      canDisable: false,
      key: meta.key,
      title: meta.title,
      path: meta.path
    });
  }

  async function openFile(file) {
    const source = await file.text();
    // パスが取れないので、ファイル名とサイズで同一性を担保する
    await open(source, {
      key: `redpen-local:${file.name}:${file.size}`,
      title: file.name,
      path: file.name + '（ファイル選択で開いた文書）'
    });
  }

  /* ---- ファイル選択 / ドロップ ---- */
  document.getElementById('pickBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) openFile(file);
  });

  for (const type of ['dragenter', 'dragover']) {
    document.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  }
  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) dropzone.classList.remove('dragover');
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) openFile(file);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'rp-command') {
      RP.session?.handleCommand(msg.name);
      sendResponse({ ok: Boolean(RP.session) });
    }
    return false;
  });

  main();
})();
