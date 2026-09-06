/* redpen — service worker
 * ・ショートカット／コンテキストメニューを content script・ビューアに橋渡しする
 * ・Chrome が .md を表示できずダウンロードしてしまう環境向けに、
 *   ナビゲーションを拡張内ビューアへ振り替える（既定は無効）
 * ・現在のタブの未対応コメント数をバッジに出す
 */
importScripts(chrome.runtime.getURL('src/lib/util.js'));
const util = globalThis.RedPen.util;

const DOC_PATTERNS = ['file:///*', 'http://localhost/*', 'http://127.0.0.1/*'];

/* ---------- 設定 ----------
 * onBeforeNavigate はナビゲーションと競走するので、
 * ストレージを読みに行く前に判断できるようメモリに載せておく。
 */
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

/* ---------- コンテキストメニュー ---------- */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'rp-comment',
      title: 'redpen: 選択範囲にコメントする',
      contexts: ['selection'],
      documentUrlPatterns: [...DOC_PATTERNS, 'chrome-extension://*/*']
    });
    chrome.contextMenus.create({
      id: 'rp-open-viewer',
      title: 'redpen ビューアで開く',
      contexts: ['page', 'link'],
      documentUrlPatterns: DOC_PATTERNS
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id == null) return;
  if (info.menuItemId === 'rp-comment') {
    sendCommand(tab.id, 'comment-selection');
  } else if (info.menuItemId === 'rp-open-viewer') {
    const target = info.linkUrl || info.pageUrl || tab.url;
    if (target) chrome.tabs.update(tab.id, { url: util.viewerUrl(target) });
  }
});

/* ---------- キーボードショートカット ---------- */

function sendCommand(tabId, name) {
  chrome.tabs.sendMessage(tabId, { type: 'rp-command', name }).catch(() => {
    /* 対象外のページには受け手がいない */
  });
}

chrome.commands.onCommand.addListener(async (name) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) sendCommand(tab.id, name);
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
  const key = util.docKeyFromTabUrl(url || '');
  if (!key) {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    return;
  }
  const { index } = await chrome.storage.local.get('index');
  const open = index?.[key]?.open || 0;
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
    await chrome.action.setBadgeText({ tabId, text: open > 0 ? String(open) : '' });
  } catch {
    /* タブが既に無い */
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) updateBadge(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    updateBadge(tabId, tab.url);
  } catch {
    /* タブが既に無い */
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes.index) return;
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) if (tab.id != null) updateBadge(tab.id, tab.url);
});
