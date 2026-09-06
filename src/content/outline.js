/* redpen — 見出しから目次を作り、読んでいる位置を示す
 * Markdown をこちらでレンダリングしたときだけ使う（既存 HTML のレイアウトには触らない）
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  const LEVELS = 'h1, h2, h3, h4';

  /** 見出しに一意な id を振り、目次に載せる情報を集める */
  function collect(root) {
    const items = [];
    root.querySelectorAll(LEVELS).forEach((el, i) => {
      const text = util.normalize(el.textContent);
      if (!text) return;
      if (!el.id) el.id = `rp-h${i}`;
      items.push({ el, text, level: Number(el.tagName[1]) });
    });
    return items;
  }

  /**
   * @param {HTMLElement} root  本文コンテナ
   * @param {HTMLElement} shell root を包む要素（目次はこの前に差し込む）
   */
  function create(root, shell) {
    const items = collect(root);
    if (items.length < 2) return null;

    const nav = document.createElement('nav');
    nav.className = 'rp-outline';
    nav.setAttribute('data-rp-ignore', '');

    const head = document.createElement('div');
    head.className = 'rp-outline-head';
    const label = document.createElement('span');
    label.className = 'rp-outline-label';
    label.textContent = '目次';
    const toggle = document.createElement('button');
    toggle.className = 'rp-outline-toggle';
    toggle.type = 'button';
    toggle.title = '目次を隠す';
    toggle.setAttribute('aria-label', '目次を隠す');
    head.append(label, toggle);
    nav.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'rp-outline-list';
    const links = new Map();

    for (const item of items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + item.el.id;
      a.textContent = item.text;
      a.title = item.text;
      a.className = `rp-outline-link rp-lv${item.level}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        item.el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + item.el.id);
      });
      li.appendChild(a);
      list.appendChild(li);
      links.set(item.el, a);
    }
    nav.appendChild(list);
    shell.parentNode.insertBefore(nav, shell);
    document.body.classList.add('rp-has-outline');

    /* ---- 折りたたみ ---- */
    const COLLAPSE_KEY = 'redpen-outline-collapsed';
    function setCollapsed(collapsed) {
      document.body.classList.toggle('rp-outline-collapsed', collapsed);
      toggle.title = collapsed ? '目次を表示' : '目次を隠す';
      toggle.setAttribute('aria-label', toggle.title);
      try {
        localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      } catch {
        /* file:// では localStorage が使えないことがある */
      }
    }
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      /* 同上 */
    }
    toggle.addEventListener('click', () =>
      setCollapsed(!document.body.classList.contains('rp-outline-collapsed'))
    );

    /* ---- 現在位置 ---- */
    let active = null;
    function setActive(el) {
      if (el === active) return;
      if (active) links.get(active)?.classList.remove('is-active');
      active = el;
      const link = links.get(el);
      if (!link) return;
      link.classList.add('is-active');
      const box = link.getBoundingClientRect();
      const navBox = nav.getBoundingClientRect();
      if (box.top < navBox.top + 8 || box.bottom > navBox.bottom - 8) {
        link.scrollIntoView?.({ block: 'nearest' });
      }
    }

    let scheduled = false;
    function update() {
      scheduled = false;
      // 画面上端をわずかに下回った位置を基準に、直前の見出しを現在地とする
      const line = 96;
      let current = items[0].el;
      for (const item of items) {
        if (item.el.getBoundingClientRect().top <= line) current = item.el;
        else break;
      }
      setActive(current);
    }
    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return {
      nav,
      destroy() {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        nav.remove();
        document.body.classList.remove('rp-has-outline', 'rp-outline-collapsed');
      }
    };
  }

  RP.outline = { create, collect };
})();
