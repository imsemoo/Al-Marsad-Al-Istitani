document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.c-header');
  if (!header) return;

  // 1) Scrolled state (lightweight)
  const setScrolled = () => {
    const scrolled = window.scrollY > 12;
    document.body.classList.toggle('is-scrolled', scrolled);
  };

  let raf = null;
  const onScroll = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      setScrolled();
      raf = null;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  setScrolled();

  // 2) Active link sync (desktop + offcanvas)
  const navGroups = Array.from(document.querySelectorAll('[data-nav]'));
  const allLinks = navGroups
    .flatMap((ul) => Array.from(ul.querySelectorAll('a[href^="#"]')))
    .filter(Boolean);

  const sections = Array.from(new Set(allLinks.map((a) => a.getAttribute('href'))))
    .map((hash) => document.querySelector(hash))
    .filter(Boolean);

  const setActive = (id) => {
    allLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
  };

  // Fallback default
  setActive('top');

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -55% 0px', threshold: [0.25, 0.5, 0.75] }
    );

    sections.forEach((s) => io.observe(s));
  }

  // 3) Close offcanvas on link click (better UX)
  const offcanvasEl = document.getElementById('siteNav');
  if (offcanvasEl) {
    offcanvasEl.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const instance = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (instance) instance.hide();
    });
  }
});
// Optional: smooth anchor scrolling (no DOM injection)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;

  const id = a.getAttribute('href');
  if (!id || id === '#') return;

  const el = document.querySelector(id);
  if (!el) return;

  e.preventDefault();

  const rect = el.getBoundingClientRect();
  const halfViewport = window.innerHeight / 2;
  const targetTop = window.scrollY + rect.top - halfViewport + rect.height / 2;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const finalScroll = Math.min(Math.max(targetTop, 0), maxScroll);

  window.scrollTo({ top: finalScroll, behavior: 'smooth' });
});
