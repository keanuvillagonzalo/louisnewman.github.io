/* Speaking page: play-to-load video, expandable lists, logo scroll, testimonial carousel.
   No dependencies. Every feature has a working no-JavaScript fallback in the HTML,
   and all automatic motion is off under prefers-reduced-motion. */
(function () {
  'use strict';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Hero video: load the file only when asked ---------- */
  var cover = document.querySelector('[data-play-cover]');
  var video = document.querySelector('[data-video]');
  if (cover && video) {
    cover.addEventListener('click', function (event) {
      event.preventDefault();
      video.src = cover.getAttribute('href');
      video.hidden = false;
      cover.hidden = true;
      var started = video.play();
      if (started && started.catch) started.catch(function () {});
      video.focus();
    });
  }

  /* ---------- In the Press, Media and Podcasts: See all / Show less ---------- */
  var groups = document.querySelectorAll('[data-expandable]');
  for (var g = 0; g < groups.length; g++) {
    setupExpandable(groups[g]);
  }

  function setupExpandable(group) {
    var list = group.querySelector('.posts');
    var button = group.querySelector('[data-toggle]');
    if (!list || !button) return;

    var extras = list.querySelectorAll('[data-extra]');
    for (var i = 0; i < extras.length; i++) {
      extras[i].style.setProperty('--i', i);
    }

    button.hidden = false;
    button.addEventListener('click', function () {
      var open = list.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.textContent = open ? 'Show less' : 'See all';
    });
  }

  /* ---------- Guest speaker logos: slow continuous scroll with a pause control ---------- */
  var marquees = document.querySelectorAll('[data-marquee]');
  for (var m = 0; m < marquees.length; m++) {
    setupMarquee(marquees[m]);
  }

  function setupMarquee(marquee) {
    var track = marquee.querySelector('.marquee__track');
    var toggle = marquee.parentElement.querySelector('[data-marquee-toggle]');
    if (!track || reduceQuery.matches) return;

    var items = Array.prototype.slice.call(track.children);
    for (var i = 0; i < items.length; i++) {
      var copy = items[i].cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('data-clone', '');
      track.appendChild(copy);
    }

    marquee.style.setProperty('--marquee-time', items.length * 4 + 's');
    marquee.classList.add('is-running');

    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () {
        var paused = marquee.classList.toggle('is-paused');
        toggle.textContent = paused ? 'Play logo scroll' : 'Pause logo scroll';
      });
    }
  }

  /* ---------- Testimonial carousel: scroll-snap, arrows, dots, gentle autoplay ---------- */
  var carousels = document.querySelectorAll('[data-carousel]');
  for (var c = 0; c < carousels.length; c++) {
    setupCarousel(carousels[c]);
  }

  function setupCarousel(carousel) {
    var track = carousel.querySelector('.carousel__track');
    var prev = carousel.querySelector('[data-prev]');
    var next = carousel.querySelector('[data-next]');
    var dotsBox = carousel.querySelector('[data-dots]');
    var toggle = carousel.querySelector('[data-autoplay-toggle]');
    if (!track || !dotsBox) return;

    var slides = track.children;
    var dots = [];
    var timer = null;
    var autoplay = !reduceQuery.matches;
    var inView = true;
    var ticking = false;

    function metrics() {
      var style = getComputedStyle(carousel);
      var per = parseInt(style.getPropertyValue('--per'), 10) || 1;
      var gap = parseFloat(style.getPropertyValue('--gap')) || 0;
      return {
        step: track.clientWidth + gap,
        pages: Math.max(1, Math.ceil(slides.length / per))
      };
    }

    function currentPage() {
      var info = metrics();
      var atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      if (atEnd) return info.pages - 1;
      return Math.max(0, Math.min(info.pages - 1, Math.round(track.scrollLeft / info.step)));
    }

    function goTo(page) {
      var info = metrics();
      var target = (page + info.pages) % info.pages;
      track.scrollTo({
        left: target * info.step,
        behavior: reduceQuery.matches ? 'auto' : 'smooth'
      });
    }

    function updateDots() {
      var now = currentPage();
      for (var i = 0; i < dots.length; i++) {
        if (i === now) dots[i].setAttribute('aria-current', 'true');
        else dots[i].removeAttribute('aria-current');
      }
    }

    function buildDots() {
      var info = metrics();
      dotsBox.textContent = '';
      dots = [];
      for (var i = 0; i < info.pages; i++) {
        dots.push(makeDot(i, info.pages));
      }
      updateDots();
    }

    function makeDot(index, total) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', 'Show testimonials ' + (index + 1) + ' of ' + total);
      dot.addEventListener('click', function () {
        setAutoplay(false);
        goTo(index);
      });
      dotsBox.appendChild(dot);
      return dot;
    }

    function startTimer() {
      if (!autoplay || !inView || timer) return;
      timer = setInterval(function () {
        goTo(currentPage() + 1);
      }, 6000);
    }

    function stopTimer() {
      clearInterval(timer);
      timer = null;
    }

    function setAutoplay(on) {
      autoplay = on;
      if (on) startTimer();
      else stopTimer();
      if (toggle) toggle.textContent = on ? 'Pause autoplay' : 'Play autoplay';
    }

    if (prev) {
      prev.addEventListener('click', function () {
        setAutoplay(false);
        goTo(currentPage() - 1);
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        setAutoplay(false);
        goTo(currentPage() + 1);
      });
    }

    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        updateDots();
      });
    }, { passive: true });

    /* Hovering or focusing the carousel holds autoplay; leaving lets it carry on. */
    carousel.addEventListener('mouseenter', stopTimer);
    carousel.addEventListener('mouseleave', startTimer);
    carousel.addEventListener('focusin', stopTimer);
    carousel.addEventListener('focusout', startTimer);

    /* Touching or dragging the slides ends autoplay for good, as on the old page. */
    track.addEventListener('pointerdown', function () { setAutoplay(false); });

    if (toggle && !reduceQuery.matches) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () { setAutoplay(!autoplay); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) startTimer();
        else stopTimer();
      }, { threshold: 0.3 }).observe(carousel);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(buildDots).observe(track);
    } else {
      buildDots();
      window.addEventListener('resize', buildDots);
    }

    startTimer();
  }
  /* Blog list: render six cards at a time. Without JS every card is shown. */
  var list = document.querySelector('[data-paginate]');
  if (list) {
    var items = Array.prototype.slice.call(list.children);
    var size = parseInt(list.getAttribute('data-page-size'), 10) || 6;
    var shown = Math.min(size, items.length);

    if (items.length > size) {
      var wrap = document.createElement('div');
      wrap.className = 'load-more';
      var status = document.createElement('p');
      status.className = 'load-more__status';
      status.setAttribute('role', 'status');
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'button';
      more.textContent = 'Show more notes';
      wrap.appendChild(status);
      wrap.appendChild(more);
      list.parentNode.insertBefore(wrap, list.nextSibling);

      var render = function () {
        items.forEach(function (li, i) { li.hidden = i >= shown; });
        status.textContent = 'Showing ' + shown + ' of ' + items.length + ' notes';
        if (shown >= items.length) wrap.removeChild(more);
      };

      more.addEventListener('click', function () {
        var first = shown;
        shown = Math.min(shown + size, items.length);
        render();
        var link = items[first].querySelector('a');
        if (link) link.focus({ preventScroll: false });
      });

      render();
    }
  }
})();
