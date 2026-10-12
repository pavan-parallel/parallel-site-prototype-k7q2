/* Parallel prototype · shared behaviour
   - Lenis smooth scroll (same settings as live: lerp .1, wheelMultiplier 1.2) wired into GSAP ScrollTrigger
   - Header: hides on scroll down, returns solid on scroll up (live newheader.js behaviour)
   - [data-fade-up]: fade + rise on enter
   - [data-scroll-reveal]: statement words fill from 30% to ink as you scroll (live Home statement)
     Words inside <span class="dim"> stay dim (two-tone statements).
   Page scripts can use window.P.lenis, window.P.onReady(fn).
*/
(function () {
  const P = (window.P = window.P || {});
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("reduced-motion");
  const ready = [];
  let inited = false;
  P.onReady = (fn) => {
    if (inited) { try { fn(P); } catch (e) { console.error(e); } }
    else ready.push(fn);
  };

  function initLenis() {
    if (reduced || !window.Lenis) return null;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.2, smoothWheel: true });
    lenis.on("scroll", () => window.ScrollTrigger && ScrollTrigger.update());
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -20, duration: 1.2 });
      });
    });
    return lenis;
  }

  function initHeader() {
    const h = document.querySelector(".site-header");
    if (!h) return;
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > last;
      h.classList.toggle("is-solid", y > 40);
      h.classList.toggle("is-hidden", down && y > 200);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initFadeUps() {
    if (reduced) return;
    gsap.utils.toArray("[data-fade-up]").forEach((el) => {
      const delay = parseFloat(el.dataset.fadeUp) || 0;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, delay, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
  }

  function initScrollReveal() {
    const run = () => gsap.utils.toArray("[data-scroll-reveal]").forEach((el) => {
      if (reduced || !window.SplitText) return;
      const split = new SplitText(el, { type: "words", wordsClass: "sr-word" });
      const words = split.words.filter((w) => !w.closest(".dim"));
      gsap.set(words, { opacity: 0.3 });
      gsap.to(words, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
      });
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
      run();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  function init() {
    if (window.gsap) {
      gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText].filter(Boolean));
    }
    P.lenis = initLenis();
    initHeader();
    if (window.gsap) {
      initFadeUps();
      initScrollReveal();
    }
    inited = true;
    ready.splice(0).forEach((fn) => { try { fn(P); } catch (e) { console.error(e); } });
    if (window.ScrollTrigger) {
      window.addEventListener("load", () => ScrollTrigger.refresh());
    }
  }

  // Wait for DOMContentLoaded so deferred page scripts (which run after this file) can register P.onReady first.
  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
