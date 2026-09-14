/* redpen — service worker
 * ・タブごとの有効／無効を持つ（切ったタブは storage.session に覚える）
 * ・ショートカットとコンテキストメニューを content script・ビューアに橋渡しする
 * ・Chrome が .md を表示できずダウンロードしてしまう環境向けに、
 *   ナビゲーションを拡張内ビューアへ振り替える（既定は無効）
 * ・現在のタブの未対応コメント数をバッジに出す
 */
importScripts(chrome.runtime.getURL('src/lib/util.js'));
const util = globalThis.RedPen.util;

const DOC_PATTERNS = ['file:///*', 'http://localhost/*', 'http://127.0.0.1/*'];
const MENU_TOGGLE = 'rp-toggle';
const MENU_COMMENT = 'rp-comment';
const MENU_VIEWER = 'rp-open-viewer';

/* ---------- タブごとの有効／無効 ----------
 * 切った状態はブラウザを閉じるまで。タブを閉じたら忘れる。 */

const OFF_KEY = 'disabledTabs';

async function offTabs() {
  const stored = await chrome.storage.session.get(OFF_KEY);
  return new Set(stored[OFF_KEY] || []);
}

async function isEnabled(tabId) {
  if (tabId == null) return true;
  return !(await offTabs()).has(tabId);
}

async function setEnabled(tabId, enabled) {
  if (tabId == null) return;
  const set = await offTabs();
  if (enabled) set.delete(tabId);
  else set.add(tabId);
  await chrome.storage.session.set({ [OFF_KEY]: [...set] });
  await syncMenus(tabId);
  await updateBadge(tabId);
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const set = await offTabs();
  if (set.delete(tabId)) await chrome.storage.session.set({ [OFF_KEY]: [...set] });
});

/* ---------- 設定 ----------
 * onBeforeNavigate はナビゲーションと競走するので、
 * ストレージを読みに行く前に判断できるようメモリに載せておく。 */

const defaultSettings = { autoOpenViewer: false };
let settings = { ...defaultSettings };

chrome.storage.local.get('settings').then(({ settings: stored }) => {
  settings = { ...defaultSettings, ...(stored || {}) };
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    settings = { ...defaultSettings, ...(changes.settings.newValue || {}) };
  }
});

/* ---------- メッセージ ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = msg?.tabId ?? sender?.tab?.id;

  if (msg?.type === 'rp-should-run') {
    isEnabled(tabId).then((enabled) => sendResponse({ enabled }));
    return true;
  }
  if (msg?.type === 'rp-get-state') {
    isEnabled(tabId).then((enabled) => sendResponse({ enabled }));
    return true;
  }
  if (msg?.type === 'rp-fetch-source') {
    // HTML の原文行番号を出すために、content script の代わりに原文を読む。
    // file:// は content script から直接 fetch できないため。
    fetchSource(msg.url, sender)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
  if (msg?.type === 'rp-set-enabled') {
    setEnabled(tabId, Boolean(msg.enabled)).then(() => {
      // 送り主が content script 自身なら、そちらは既に自分で畳んでいる
      if (msg.notify !== false && tabId != null) {
        sendToTab(tabId, { type: msg.enabled ? 'rp-enable' : 'rp-disable' });
      }
      sendResponse({ ok: true, enabled: Boolean(msg.enabled) });
    });
    return true;
  }
  return false;
});

/* ---------- 原文の読み直し ----------
 * 読むのは依頼元のタブが今開いているページそのものだけ。
 * 任意の URL を取りに行く踏み台にならないよう、送り主と突き合わせる。 */

const FETCHABLE = ['file:', 'http:', 'https:'];

function sameDocument(a, b) {
  try {
    const x = new URL(a);
    const y = new URL(b);
    x.hash = '';
    y.hash = '';
    return x.href === y.href;
  } catch {
    return false;
  }
}

async function fetchSource(url, sender) {
  if (!url || !FETCHABLE.includes(new URL(url).protocol)) {
    throw new Error('対象外の URL です');
  }
  const senderUrl = sender?.tab?.url || sender?.url;
  if (senderUrl && !sameDocument(url, senderUrl)) {
    throw new Error('開いているページと一致しません');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function sendToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    /* 対象外のページには受け手がいない */
  });
}

/* ---------- コンテキストメニュー ---------- */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_TOGGLE,
      title: 'redpen をこのタブで無効にする',
      // 無効にした後もここから戻せるよう、対象ページなら常に出す
      contexts: ['page', 'selection', 'frame', 'image', 'link'],
      documentUrlPatterns: [...DOC_PATTERNS, 'chrome-extension://*/*']
    });
    chrome.contextMenus.create({
      id: MENU_COMMENT,
      title: 'redpen: 選択範囲にコメントする',
      contexts: ['selection'],
      documentUrlPatterns: [...DOC_PATTERNS, 'chrome-extension://*/*']
    });
    chrome.contextMenus.create({
      id: MENU_VIEWER,
      title: 'redpen ビューアで開く',
      contexts: ['page', 'link'],
      documentUrlPatterns: DOC_PATTERNS
    });
  });
});

/** アクティブタブの状態にメニューの文言を合わせる */
async function syncMenus(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (tabId != null && tab.id !== tabId) return;
  const enabled = await isEnabled(tab.id);
  try {
    await chrome.contextMenus.update(MENU_TOGGLE, {
      title: enabled ? 'redpen をこのタブで無効にする' : 'redpen をこのタブで有効にする'
    });
    await chrome.contextMenus.update(MENU_COMMENT, { visible: enabled });
    await chrome.contextMenus.update(MENU_VIEWER, { visible: enabled });
  } catch {
    /* メニューがまだ作られていない */
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.id == null) return;
  if (info.menuItemId === MENU_TOGGLE) {
    const enabled = await isEnabled(tab.id);
    await setEnabled(tab.id, !enabled);
    sendToTab(tab.id, { type: enabled ? 'rp-disable' : 'rp-enable' });
  } else if (info.menuItemId === MENU_COMMENT) {
    sendToTab(tab.id, { type: 'rp-command', name: 'comment-selection' });
  } else if (info.menuItemId === MENU_VIEWER) {
    const target = info.linkUrl || info.pageUrl || tab.url;
    if (target) chrome.tabs.update(tab.id, { url: util.viewerUrl(target) });
  }
});

/* ---------- キーボードショートカット ---------- */

chrome.commands.onCommand.addListener(async (name) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return;
  if (!(await isEnabled(tab.id))) return;
  sendToTab(tab.id, { type: 'rp-command', name });
});

/* ---------- .md をビューアへ振り替える ---------- */

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    if (!settings.autoOpenViewer) return;
    if (!details.url.startsWith('file://')) return;
    if (!util.isMarkdownUrl(details.url)) return;
    chrome.tabs.update(details.tabId, { url: util.viewerUrl(details.url) }).catch(() => {});
  },
  { url: [{ schemes: ['file'] }] }
);

/* ---------- バッジ ---------- */

async function updateBadge(tabId, url) {
  if (tabId == null) return;
  let target = url;
  if (target === undefined) {
    try {
      target = (await chrome.tabs.get(tabId)).url;
    } catch {
      return;
    }
  }
  const key = util.docKeyFromTabUrl(target || '');
  const show = async (text, color) => {
    try {
      await chrome.action.setBadgeBackgroundColor({ tabId, color });
      await chrome.action.setBadgeText({ tabId, text });
    } catch {
      /* タブが既に無い */
    }
  };

  if (!key) return void show('', '#2563eb');
  if (!(await isEnabled(tabId))) return void show('off', '#8a8f98');

  const { index } = await chrome.storage.local.get('index');
  const open = index?.[key]?.open || 0;
  show(open > 0 ? String(open) : '', '#2563eb');
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) updateBadge(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  updateBadge(tabId);
  syncMenus(tabId);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes.index) return;
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) if (tab.id != null) updateBadge(tab.id, tab.url);
});
