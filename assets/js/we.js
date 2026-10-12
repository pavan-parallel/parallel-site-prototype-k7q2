/* We page behaviour
   1 Hero load-in: heading + subline lines rise out of a mask, logos fade up, team photo reveals (clip + settle)
   3 Word roller: "No ___" cycles layers. → Project Managers → Timesheets every ~2s with an eased roll
   4 Numbers: 100+, 20+ and 4.9 count up once on enter (the statement fill itself is base.js data-scroll-reveal)
   5 Leaders: tilted portrait card follows the cursor inside the hovered row (lerp), scales/fades in and out
*/
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".w-hero");
  const revealHero = () => hero && hero.classList.add("w-hero-ready");

  // Safety net: never leave the hero hidden (e.g. CDN blocked)
  setTimeout(revealHero, 2500);
  if (!window.P || !window.gsap) { revealHero(); return; }

  /* ---------- 1 · Hero load-in ---------- */
  function initHero() {
    if (!hero) return;
    if (reduced || !window.SplitText) { revealHero(); return; }
    const title = hero.querySelector(".w-hero__title");
    const sub = hero.querySelector(".w-hero__sub");
    const cells = hero.querySelectorAll(".w-logos__cell");
    const reel = hero.querySelector(".w-hero__reel");
    const img = hero.querySelector(".w-hero__img");

    const go = () => {
      const t = SplitText.create(title, { type: "lines", mask: "lines", linesClass: "w-line" });
      const s = SplitText.create(sub, { type: "lines", mask: "lines", linesClass: "w-line" });
      gsap.set([t.lines, s.lines], { yPercent: 110 });
      gsap.set(cells, { opacity: 0, y: 20 });
      gsap.set(reel, { clipPath: "inset(14% 5% 0% 5%)" });
      gsap.set(img, { scale: 1.18 });
      revealHero();

      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
      tl.to(t.lines, { yPercent: 0, duration: 1.1, stagger: 0.1 })
        .to(s.lines, { yPercent: 0, duration: 1, stagger: 0.08 }, 0.25)
        .to(cells, { opacity: 0.5, y: 0, duration: 0.9, stagger: 0.06 }, 0.5)
        .to(reel, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power3.inOut" }, 0.45)
        .to(img, { scale: 1, duration: 1.8, ease: "power3.out" }, 0.45)
        .add(() => { gsap.set(reel, { clearProps: "clipPath" }); });
    };
    // Split after the webfonts are in so line breaks are final
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  }

  /* ---------- 3 · Word roller ---------- */
  function initRoller() {
    const roller = document.querySelector(".w-roller");
    if (!roller) return;
    const track = roller.querySelector(".w-roller__track");
    const items = Array.from(track.children);
    const words = ["layers.", "Project Managers", "Timesheets"];
    let idx = 0;
    const mod = (n, m) => ((n % m) + m) % m;
    const render = () => items.forEach((el, i) => { el.textContent = words[mod(idx + i - 2, words.length)]; });
    render();
    if (reduced) return;

    const lh = () => items[0].getBoundingClientRect().height;
    const tl = gsap.timeline({
      repeat: -1, repeatDelay: 1.1, delay: 1.1, paused: true,
      onRepeat: () => { idx = mod(idx + 1, words.length); render(); },
    });
    tl.fromTo(track, { y: 0 }, { y: () => -lh(), duration: 0.9, ease: "power3.inOut", immediateRender: false });

    ScrollTrigger.create({
      trigger: roller, start: "top bottom", end: "bottom top",
      onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
    });
  }

  /* ---------- 4 · Count-up ---------- */
  function initCounts() {
    if (reduced) return;
    const els = document.querySelectorAll(".w-count[data-count]");
    if (!els.length) return;
    const section = document.querySelector(".w-numbers__text");
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    // base.js splits [data-scroll-reveal] after fonts.ready; this .then is registered later, so it runs after the split
    fontsReady.then(() => {
      const jobs = [];
      els.forEach((el) => {
        if (el.dataset.from) return; // the year stays put: counting a founding year reads as a gimmick
        const to = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.decimals || "0", 10);
        const suffix = el.dataset.suffix || "";
        el.style.width = el.getBoundingClientRect().width + "px"; // lock width at the final value: no reflow while counting
        el.style.whiteSpace = "nowrap";
        // write into the deepest text holder (SplitText wraps the word in .sr-word); looked up live so a late split is safe
        const write = (txt) => { (el.querySelector(".sr-word") || el).textContent = txt; };
        const fmt = (v) => v.toFixed(dec) + suffix;
        const o = { v: 0 };
        write(fmt(0));
        jobs.push(() => gsap.to(o, {
          v: to, duration: 1.6, ease: "power2.out",
          onUpdate: () => write(fmt(dec ? o.v : Math.round(o.v))),
        }));
      });
      ScrollTrigger.create({
        trigger: section, start: "top 90%", once: true,
        onEnter: () => jobs.forEach((j, i) => gsap.delayedCall(i * 0.12, j)),
      });
    });
  }

  /* ---------- 5 · Leaders hover portrait ---------- */
  function initLeaders() {
    const rows = document.querySelectorAll(".w-leader");
    rows.forEach((row) => {
      const card = row.querySelector(".w-leader__card");
      if (!card) return;
      let tx = 0, ty = 0, x = 0, y = 0, hovering = false, clientX = 0, clientY = 0;
      gsap.set(card, { scale: 0.6, rotation: 3, autoAlpha: 0 });

      const target = () => {
        const r = row.getBoundingClientRect();
        tx = clientX - r.left;
        ty = clientY - r.top;
      };
      const tick = () => {
        const k = reduced ? 1 : 0.14;
        const dx = tx - x;
        x += dx * k;
        y += (ty - y) * k;
        const tilt = 3 + gsap.utils.clamp(-6, 6, dx * 0.05);
        gsap.set(card, { x, y, rotation: tilt });
      };
      const onScroll = () => { if (hovering) target(); };

      row.addEventListener("mouseenter", (e) => {
        hovering = true;
        clientX = e.clientX; clientY = e.clientY;
        target(); x = tx; y = ty;
        row.classList.add("is-active");
        gsap.ticker.add(tick);
        window.addEventListener("scroll", onScroll, { passive: true });
        gsap.to(card, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      });
      row.addEventListener("mousemove", (e) => { clientX = e.clientX; clientY = e.clientY; target(); });
      row.addEventListener("mouseleave", () => {
        hovering = false;
        window.removeEventListener("scroll", onScroll);
        gsap.to(card, {
          autoAlpha: 0, scale: 0.6, duration: 0.3, ease: "power2.in", overwrite: "auto",
          onComplete: () => { if (!hovering) { gsap.ticker.remove(tick); row.classList.remove("is-active"); } },
        });
      });
    });
  }

  P.onReady(() => {
    initHero();
    initRoller();
    initCounts();
    initLeaders();
  });
})();
