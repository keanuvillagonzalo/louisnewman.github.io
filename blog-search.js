/* Blog search: filters the article cards on blog.html by title and excerpt.
 *
 * How it works with the existing pagination:
 *  - Loaded BEFORE site.js, so it snapshots every card before pagination hides any.
 *  - While a query is active, matching cards are shown in a separate results list and the
 *    paginated grid (plus its pager) is hidden. Clearing the search restores the normal view.
 *  - The query is mirrored to ?q= so a search can be bookmarked or shared.
 */
(function () {
  'use strict';

  var form = document.getElementById('blog-search');
  if (!form) return;

  var input = document.getElementById('blog-search-input');
  var status = document.getElementById('blog-search-status');
  var results = document.getElementById('blog-search-results');
  var empty = document.getElementById('blog-search-empty');
  var grid = document.querySelector('.blog-grid[data-paginate]');
  var clearBtn = document.getElementById('blog-search-clear');
  if (!input || !results || !grid) return;

  // Normalise text: lowercase, strip accents, straighten curly quotes, collapse punctuation.
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Snapshot all cards now (before pagination runs).
  var posts = Array.prototype.map.call(grid.querySelectorAll('.blog-card'), function (card, i) {
    var titleEl = card.querySelector('.blog-card__title');
    var excerptEl = card.querySelector('.blog-card__excerpt');
    var node = card.cloneNode(true);
    node.removeAttribute('hidden');
    node.style.removeProperty('display');
    return {
      index: i,
      node: node,
      title: norm(titleEl && titleEl.textContent),
      excerpt: norm(excerptEl && excerptEl.textContent)
    };
  });

  // Everything that belongs to the paginated view: the grid and any pager after it.
  function pagedViewElements() {
    var els = [grid];
    var sib = grid.nextElementSibling;
    while (sib) {
      if (sib !== results && sib !== empty) els.push(sib);
      sib = sib.nextElementSibling;
    }
    return els;
  }

  // Looked up at call time: site.js adds the pager after this script has already run.
  function setPagedVisible(visible) {
    pagedViewElements().forEach(function (el) { el.hidden = !visible; });
  }

  // A term matches when it starts a word ("prob" finds "probation"; "ai" won't match "again").
  function hasTerm(hay, term) {
    var i = -1;
    while ((i = hay.indexOf(term, i + 1)) !== -1) {
      if (i === 0 || !/[a-z0-9]/.test(hay.charAt(i - 1))) return true;
    }
    return false;
  }

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Highlight query terms in an element's text, preserving its link/structure.
  function highlight(el, terms) {
    if (!el || !terms.length) return;
    var re = new RegExp('(' + terms.map(escapeRegExp).join('|') + ')', 'gi');
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (tn) {
      var text = tn.nodeValue;
      // Match against an accent/quote-normalised copy so "advisers" finds "Adviser’s".
      var plain = text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[‘’ʼ]/g, "'");
      if (plain.length !== text.length) plain = text; // fall back if lengths diverge
      var frag = document.createDocumentFragment();
      var last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(plain)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        if (m.index > 0 && /[a-z0-9]/i.test(plain.charAt(m.index - 1))) continue; // mid-word: not a match
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var mark = document.createElement('mark');
        mark.textContent = text.slice(m.index, m.index + m[0].length);
        frag.appendChild(mark);
        last = m.index + m[0].length;
      }
      if (last === 0) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  function search(rawQuery) {
    var q = norm(rawQuery);
    results.textContent = '';

    if (!q) {
      results.hidden = true;
      empty.hidden = true;
      setPagedVisible(true);
      status.textContent = '';
      if (clearBtn) clearBtn.hidden = true;
      return;
    }

    var terms = q.split(' ').filter(Boolean);
    var matches = posts.filter(function (p) {
      var hay = p.title + ' ' + p.excerpt;
      return terms.every(function (t) { return hasTerm(hay, t); });
    });

    // Title matches first, then original (newest-first) order.
    matches.sort(function (a, b) {
      var at = terms.every(function (t) { return hasTerm(a.title, t); }) ? 0 : 1;
      var bt = terms.every(function (t) { return hasTerm(b.title, t); }) ? 0 : 1;
      return at - bt || a.index - b.index;
    });

    setPagedVisible(false);
    if (clearBtn) clearBtn.hidden = false;

    matches.forEach(function (p) {
      var li = p.node.cloneNode(true);
      highlight(li.querySelector('.blog-card__title a'), terms);
      highlight(li.querySelector('.blog-card__excerpt'), terms);
      results.appendChild(li);
    });

    results.hidden = matches.length === 0;
    empty.hidden = matches.length !== 0;
    status.textContent = matches.length === 0
      ? 'No articles found.'
      : matches.length + (matches.length === 1 ? ' article' : ' articles') + ' found.';
  }

  function syncUrl(value) {
    try {
      var url = new URL(window.location.href);
      if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
      window.history.replaceState(null, '', url);
    } catch (e) { /* non-critical */ }
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { search(input.value); syncUrl(input.value.trim()); }, 120);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(timer);
    search(input.value);
    syncUrl(input.value.trim());
  });

  function clearSearch() {
    input.value = '';
    search('');
    syncUrl('');
    input.focus();
  }
  if (clearBtn) clearBtn.addEventListener('click', clearSearch);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && input.value) { e.preventDefault(); clearSearch(); }
  });

  // Run a search from ?q= on load. Deferred so site.js has finished setting up pagination first.
  var initial = '';
  try { initial = new URL(window.location.href).searchParams.get('q') || ''; } catch (e) {}
  if (initial) {
    input.value = initial;
    window.addEventListener('DOMContentLoaded', function () { search(initial); });
    if (document.readyState !== 'loading') search(initial);
  }
})();
