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

  /** この幅を下回ったら、目次は畳んだ状態で始める */
  const NARROW = 1180;

  /**
   * @param {HTMLElement} root 本文コンテナ
   * @param {object} opts
   *   anchorTo … 目次を差し込む基準要素（省略時は body 先頭）
   *   mode     … 'markdown' なら page.css が余白を作る。'html' は自前で本文を寄せる
   */
  function create(root, opts = {}) {
    const { anchorTo = null, mode = 'markdown' } = opts;
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
    if (anchorTo && anchorTo.parentNode) anchorTo.parentNode.insertBefore(nav, anchorTo);
    else document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add('rp-has-outline');

    /* ---- 折りたたみ ----
     * Markdown ビューの余白は page.css が持つ。既存 HTML の上に出すときは
     * こちらで本文を寄せる（相手のレイアウトに手を入れるのはこの 1 か所だけ）。 */
    const COLLAPSE_KEY = 'redpen-outline-collapsed';
    const WIDTH = 264;
    const COLLAPSED_WIDTH = 52;

    function setCollapsed(collapsed, remember = true) {
      document.body.classList.toggle('rp-outline-collapsed', collapsed);
      toggle.title = collapsed ? '目次を開く' : '目次を畳む';
      toggle.setAttribute('aria-label', toggle.title);
      if (mode === 'html') {
        document.documentElement.style.paddingLeft =
          (collapsed ? COLLAPSED_WIDTH : WIDTH) + 'px';
      }
      if (!remember) return;
      try {
        localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      } catch {
        /* file:// では localStorage が使えないことがある */
      }
    }

    // 覚えている設定があればそれに従い、無ければ画面幅で決める。
    // 自分で開閉した後は幅に関係なくその状態を守る。
    let userDecided = false;
    let initial = window.innerWidth < NARROW;
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '0' || saved === '1') {
        initial = saved === '1';
        userDecided = true;
      }
    } catch {
      /* 同上 */
    }
    setCollapsed(initial, false);

    toggle.addEventListener('click', () => {
      userDecided = true;
      setCollapsed(!document.body.classList.contains('rp-outline-collapsed'));
    });

    // 窓を狭めたときに本文へ覆いかぶさらないよう、自動で畳む
    function fitToWidth() {
      if (userDecided) return;
      const shouldCollapse = window.innerWidth < NARROW;
      if (shouldCollapse !== document.body.classList.contains('rp-outline-collapsed')) {
        setCollapsed(shouldCollapse, false);
      }
    }
    window.addEventListener('resize', fitToWidth, { passive: true });

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
      setCollapsed,
      destroy() {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        window.removeEventListener('resize', fitToWidth);
        nav.remove();
        document.body.classList.remove('rp-has-outline', 'rp-outline-collapsed');
        if (mode === 'html') document.documentElement.style.paddingLeft = '';
      }
    };
  }

  RP.outline = { create, collect };
})();
