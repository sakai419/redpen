/* redpen — ツールバーのポップアップ */
(function () {
  'use strict';
  const RP = globalThis.RedPen;
  const util = RP.util;

  const $ = (id) => document.getElementById(id);
  const VIEWER = util.VIEWER_PATH;
  const viewerUrl = (src) => util.viewerUrl(src);
  const docKeyOf = (url) => util.docKeyFromTabUrl(url);

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  async function copyDoc(key) {
    const doc = await RP.store.loadDoc(key);
    if (!doc || doc.comments.length === 0) return toast('コメントがありません');
    const text = RP.exporter.build(doc, { style: 'quote', includeResolved: false });
    await navigator.clipboard.writeText(text);
    toast('Markdown をコピーしました');
  }

  /* ---------- 現在のタブ ---------- */

  async function renderCurrent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const actions = $('curActions');
    actions.textContent = '';

    if (!tab?.url) {
      $('curTitle').textContent = '—';
      return;
    }

    const key = docKeyOf(tab.url);
    const isMd = util.isMarkdownUrl(tab.url);
    const isHtml = util.isHtmlUrl(tab.url);
    const isViewer = tab.url.startsWith(chrome.runtime.getURL(VIEWER));

    $('curTitle').textContent = key ? util.basename(key) : tab.title || '—';
    $('curTitle').title = key ? util.displayPath(key) : '';

    if (!key || !(isMd || isHtml || isViewer)) {
      $('curMeta').textContent = 'このページは redpen の対象外です';
      return;
    }

    const doc = await RP.store.loadDoc(key);
    const open = doc ? doc.comments.filter((c) => c.status !== 'resolved').length : 0;
    const total = doc ? doc.comments.length : 0;
    $('curMeta').textContent = total > 0 ? `未対応 ${open} 件 / 全 ${total} 件` : 'コメントはまだありません';

    if (total > 0) {
      const copy = button('コメントをコピー', 'primary', () => copyDoc(key));
      actions.appendChild(copy);
    }
    if (isMd && !isViewer) {
      actions.appendChild(
        button('ビューアで開く', '', () => {
          chrome.tabs.update(tab.id, { url: viewerUrl(tab.url) });
          window.close();
        })
      );
    }
  }

  function button(label, cls, onClick) {
    const b = document.createElement('button');
    b.className = 'btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- 文書一覧 ---------- */

  async function renderDocs() {
    const docs = await RP.store.listDocs();
    const list = $('docList');
    list.textContent = '';
    $('docEmpty').hidden = docs.length > 0;

    for (const d of docs) {
      const li = document.createElement('li');

      const a = document.createElement('a');
      a.href = '#';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openDoc(d);
      });

      const row = document.createElement('div');
      row.className = 'doc-row';
      const name = document.createElement('span');
      name.className = 'doc-name';
      name.textContent = d.title;
      const count = document.createElement('span');
      count.className = 'doc-count';
      count.innerHTML = `<span class="open">${d.open}</span> / ${d.total}`;
      row.append(name, count);

      const path = document.createElement('div');
      path.className = 'doc-path';
      path.textContent = d.path;
      path.title = d.path;

      a.append(row, path);
      li.appendChild(a);

      const actions = document.createElement('div');
      actions.className = 'doc-actions';
      const copy = document.createElement('button');
      copy.className = 'mini';
      copy.textContent = 'コピー';
      copy.addEventListener('click', () => copyDoc(d.key));
      const del = document.createElement('button');
      del.className = 'mini danger';
      del.textContent = 'コメントを削除';
      del.addEventListener('click', async () => {
        if (del.dataset.confirm !== '1') {
          del.dataset.confirm = '1';
          del.textContent = '本当に削除？';
          setTimeout(() => {
            del.dataset.confirm = '';
            del.textContent = 'コメントを削除';
          }, 3000);
          return;
        }
        await RP.store.removeDoc(d.key);
        toast('削除しました');
        renderDocs();
        renderCurrent();
      });
      actions.append(copy, del);
      li.appendChild(actions);

      list.appendChild(li);
    }
  }

  function openDoc(d) {
    const url =
      d.key.startsWith('redpen-local:')
        ? chrome.runtime.getURL(VIEWER)
        : d.mode === 'markdown' && d.key.startsWith('file://')
          ? viewerUrl(d.key)
          : d.key;
    chrome.tabs.create({ url });
    window.close();
  }

  /* ---------- 設定 ---------- */

  async function renderSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    const auto = Boolean(settings?.autoOpenViewer);
    $('autoViewer').checked = auto;
    $('autoViewer').addEventListener('change', async (e) => {
      const { settings: cur } = await chrome.storage.local.get('settings');
      await chrome.storage.local.set({
        settings: { ...(cur || {}), autoOpenViewer: e.target.checked }
      });
      toast(e.target.checked ? '.md をビューアで開きます' : '通常どおり開きます');
    });
  }

  renderCurrent();
  renderDocs();
  renderSettings();
})();
