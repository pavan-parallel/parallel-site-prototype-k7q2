/* Home page behaviour
   1 Hero      · load-in + diagonal card carousel (port of the live "Diagonal Carousel" code component:
                 infinite diagonal track, hover stops the track, straightens the card and scatters/repels the rest)
   2 Logos     · CSS marquee, 30px/s, paused off-screen (live initCSSMarquee)
   4 Work      · category list swaps the case study (crossfade), cursor follower ring / ↗ disc
   6 Quotes    · Splide v4 loop slider with the Figma arrows + dots
   9 FAQ       · accordion, one open at a time
*/
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- 1 · Hero load-in ---------- */
  function initHeroIntro() {
    const title = $("[data-hero-title]");
    const sub = $("[data-hero-sub]");
    const cta = $("[data-hero-cta]");
    if (!title) return;
    title.innerHTML = title.innerHTML
      .split(/<br\s*\/?>/i)
      .map((l) => `<span class="h-line"><span>${l.trim()}</span></span>`)
      .join("");
    title.style.visibility = "visible";
    if (reduced || !window.gsap) return;
    const lines = $$(".h-line > span", title);
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 1.1, ease: "power3.out", stagger: 0.125 })
      .fromTo(sub, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0.45)
      .fromTo(cta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0.65);
  }

  /* ---------- 1 · Hero diagonal carousel ---------- */
  function initHeroCards() {
    const wrap = $("[data-hero-cards]");
    if (!wrap) return;
    const tpls = $$("template[data-card]", wrap);
    const N = 8;                // cards on the loop (the 4 Figma images, twice)
    const W = 338, H = 436;     // un-skewed card box (Figma mask 408×435.6, slant 9.8°)
    const BASE_SKEW = -9.8;
    const CRUISE = 0.18;        // segments per second (~32px/s, live speed 0.8px/frame)
    const REPULSE = 115, FALLOFF = 1.8; // live props: repulsionStrength / repulsionFalloff

    // Card centres in the 902×527 Figma box: bird, earth, ear, food at u = 2..5
    const bird = [650.8, -52.2], earth = [486.8, 217.8], ear = [349.8, 308.8], food = [206.8, 420.8];
    const up = [164, -270], down = [-143, 112];
    const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
    const Q = [add(bird, up, 2), add(bird, up, 1), bird, earth, ear, food, add(food, down, 1), add(food, down, 2), add(food, down, 3)];
    const dirLen = Math.hypot(food[0] - bird[0], food[1] - bird[1]);
    const dir = [(food[0] - bird[0]) / dirLen, (food[1] - bird[1]) / dirLen];

    const pathAt = (u) => {
      const k = Math.min(N - 1, Math.floor(u));
      const f = u - k;
      return [Q[k][0] + (Q[k + 1][0] - Q[k][0]) * f, Q[k][1] + (Q[k + 1][1] - Q[k][1]) * f];
    };
    const smooth = (x) => x * x * (3 - 2 * x);
    const alphaAt = (u) => (u < 1 ? 0 : u < 2 ? smooth(u - 1) : u <= 5 ? 1 : u < 5.7 ? smooth((5.7 - u) / 0.7) : 0);
    const rand = (e) => { const t = 43758.5453 * Math.sin(127.1 * e + 311.7); return t - Math.floor(t); };
    const scatter = Array.from({ length: N }, (_, i) => ({
      range: 12 * rand(3 * i + 1) + 4,
      sign: rand(3 * i + 2) > 0.5 ? 1 : -1,
      scaleMin: 0.88 + 0.06 * rand(3 * i + 3),
    }));

    const cards = [];
    for (let i = 0; i < N; i++) {
      const tpl = tpls[(((i - 2) % 4) + 4) % 4];
      const img = tpl.content.firstElementChild.cloneNode(true);
      const el = document.createElement("div");
      el.className = "h-card";
      const inner = document.createElement("div");
      inner.className = "h-card__inner";
      const box = document.createElement("div");
      box.className = "h-card__box" + (img.classList.contains("h-card__img--bird") ? " h-card__box--bird" : "");
      box.style.setProperty("--glow", (tpl.dataset.glow || 0) + "px");
      box.appendChild(img);
      inner.appendChild(box);
      el.appendChild(inner);
      wrap.appendChild(el);
      cards.push({ el, inner, x: 0, y: 0, skew: BASE_SKEW, scale: 1, rot: 0, rep: 0, op: 0, init: false });
    }

    const S = { t: reduced ? 0 : -1.4, speed: 0, hovered: -1, introDone: reduced, visible: true };
    let speedTween = null;
    const tweenSpeed = (val, duration, ease) => {
      if (speedTween) speedTween.kill();
      speedTween = gsap.to(S, { speed: val, duration, ease });
    };
    const progressOf = (i) => (((i + S.t) % N) + N) % N;

    cards.forEach((c, i) => {
      c.el.addEventListener("mouseenter", () => {
        if (reduced) return;
        S.hovered = i;
        tweenSpeed(0, 0.4, "power2.out");
      });
      c.el.addEventListener("mouseleave", () => {
        if (S.hovered === i) S.hovered = -1;
        if (S.introDone) tweenSpeed(CRUISE, 0.5, "power2.inOut");
      });
    });

    function frame(time, deltaTime) {
      if (!S.visible) return;
      const dt = Math.min(deltaTime || 16.7, 64) / 1000;
      const r = Math.min(dt * 60, 4); // frame-rate independent lerps (live tuned at 60fps)
      const lerp = (k) => 1 - Math.pow(1 - k, r);
      S.t += S.speed * dt;
      const hu = S.hovered >= 0 ? progressOf(S.hovered) : 0;

      cards.forEach((c, i) => {
        const u = progressOf(i);
        let [tx, ty] = pathAt(u);
        let rep = 0;
        if (S.hovered >= 0 && i !== S.hovered) {
          let d = u - hu;
          if (d > N / 2) d -= N;
          if (d < -N / 2) d += N;
          const a = Math.round(Math.abs(d));
          if (a > 0) rep = REPULSE * Math.exp(-FALLOFF * (a - 1)) * (d > 0 ? 1 : -1);
        }
        c.rep += (rep - c.rep) * lerp(0.09);
        tx += c.rep * dir[0];
        ty += c.rep * dir[1];
        if (!c.init || Math.hypot(tx - c.x, ty - c.y) > 380) { c.x = tx; c.y = ty; c.init = true; } // wrap-around: jump
        c.x += (tx - c.x) * lerp(0.13);
        c.y += (ty - c.y) * lerp(0.13);

        const isHover = i === S.hovered, any = S.hovered >= 0;
        let sk = BASE_SKEW, sc = 1, ro = 0;
        if (isHover) { sk = 0; sc = 1.08; ro = 0; }
        else if (any) {
          const s = scatter[i];
          sk = BASE_SKEW * (1 + 0.6 * rand(7 * i + S.hovered));
          ro = s.sign * s.range * (0.6 + 0.4 * rand(i + 3 * S.hovered)) * 0.5;
          sc = s.scaleMin;
        }
        c.skew += (sk - c.skew) * lerp(0.11);
        c.scale += (sc - c.scale) * lerp(0.11);
        c.rot += (ro - c.rot) * lerp(0.08);
        const a = !S.introDone && u > 5 ? 0 : alphaAt(u); // nothing leaves the stack while it settles in
        c.op += (a - c.op) * lerp(0.15);

        c.el.style.transform = `translate(${(c.x - W / 2).toFixed(2)}px, ${(c.y - H / 2).toFixed(2)}px) rotate(${c.rot.toFixed(3)}deg) skewX(${c.skew.toFixed(3)}deg) scale(${c.scale.toFixed(4)})`;
        c.inner.style.transform = `skewX(${(-c.skew).toFixed(3)}deg)`;
        c.el.style.opacity = c.op.toFixed(3);
        c.el.style.zIndex = isHover ? 100 : Math.round(u * 10) + 1;
        c.el.style.pointerEvents = c.op < 0.3 ? "none" : "auto";
      });
    }

    if (reduced || !window.gsap) {
      // one static render at the Figma composition
      cards.forEach((c, i) => {
        const u = progressOf(i);
        const [x, y] = pathAt(u);
        c.el.style.transform = `translate(${x - W / 2}px, ${y - H / 2}px) skewX(${BASE_SKEW}deg)`;
        c.inner.style.transform = `skewX(${-BASE_SKEW}deg)`;
        c.el.style.opacity = alphaAt(u);
        c.el.style.zIndex = Math.round(u * 10) + 1;
      });
      wrap.style.opacity = 1;
      return;
    }

    // test hook: P.heroCards.freeze() parks the loop on the Figma composition
    window.P.heroCards = { state: S, freeze() { gsap.killTweensOf(S); if (speedTween) speedTween.kill(); S.introDone = false; S.speed = 0; S.t = 0; } };
    gsap.ticker.add(frame);
    gsap.fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out", delay: 0.1 });
    gsap.to(S, {
      t: 0, duration: 2, ease: "power3.out", delay: 0.15,
      onComplete: () => {
        S.introDone = true;
        gsap.delayedCall(0.9, () => { if (S.hovered < 0) tweenSpeed(CRUISE, 1.4, "power2.inOut"); });
      },
    });

    const hero = wrap.closest(".h-hero");
    new IntersectionObserver((entries) => entries.forEach((e) => (S.visible = e.isIntersecting)), { threshold: 0 }).observe(hero);
  }

  /* ---------- 2 · Logo marquee (live: 30px/s, duplicated list, paused off-screen) ---------- */
  function initMarquee() {
    $$("[data-marquee]").forEach((m) => {
      const list = $("[data-marquee-list]", m);
      const dup = list.cloneNode(true);
      dup.setAttribute("aria-hidden", "true");
      $$("img", dup).forEach((i) => (i.alt = ""));
      m.appendChild(dup);
      const dur = list.offsetWidth / 30 + "s";
      $$("[data-marquee-list]", m).forEach((l) => (l.style.animationDuration = dur));
      if (reduced) return;
      new IntersectionObserver((es) => es.forEach((e) => m.classList.toggle("is-running", e.isIntersecting)), { threshold: 0 }).observe(m);
    });
  }

  /* ---------- 4 · Work band ---------- */
  function initWork() {
    const band = $("[data-work]");
    if (!band) return;
    const cases = $$("[data-case]", band);
    const cats = $$("[data-cat]", band);
    let active = 0;
    let inView = false;

    const videoOf = (i) => $("video", cases[i]);
    const syncVideos = () => {
      cases.forEach((c, i) => {
        const v = videoOf(i);
        if (!v) return;
        if (i === active && inView) {
          if (v.preload === "none") { v.preload = "auto"; v.load(); }
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else v.pause();
      });
    };

    function setActive(i) {
      if (i === active) return;
      const prev = active;
      active = i;
      cats.forEach((b, k) => {
        b.classList.toggle("is-active", k === i);
        b.setAttribute("aria-selected", k === i ? "true" : "false");
      });
      cases.forEach((c, k) => {
        c.classList.toggle("is-active", k === i);
        c.setAttribute("aria-hidden", k === i ? "false" : "true");
        const link = $("[data-case-media]", c);
        if (k === i) link.removeAttribute("tabindex"); else link.setAttribute("tabindex", "-1");
      });
      syncVideos();
      const next = cases[i];
      if (reduced || !window.gsap) {
        cases.forEach((c, k) => { c.style.opacity = k === i ? 1 : 0; c.style.visibility = k === i ? "visible" : "hidden"; });
        return;
      }
      cases.forEach((c, k) => {
        if (k === i) return;
        gsap.killTweensOf(c);
        gsap.to(c, { autoAlpha: 0, duration: 0.45, ease: "power2.out" });
      });
      gsap.killTweensOf(next);
      gsap.set(next, { zIndex: 2 });
      cases.forEach((c, k) => { if (k !== i) gsap.set(c, { zIndex: k === prev ? 1 : 0 }); });
      gsap.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.out" });
      const media = $("[data-case-media] > *", next);
      gsap.fromTo(media, { scale: 1.04 }, { scale: 1, duration: 1.2, ease: "power3.out", overwrite: true });
      gsap.fromTo($(".h-case__meta", next), { y: 12 }, { y: 0, duration: 0.8, ease: "power3.out", overwrite: true });
    }

    let hoverTimer = null;
    cats.forEach((b) => {
      const i = +b.dataset.cat;
      b.addEventListener("click", () => setActive(i));
      b.addEventListener("focus", () => setActive(i));
      b.addEventListener("mouseenter", () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => setActive(i), 70); });
      b.addEventListener("mouseleave", () => clearTimeout(hoverTimer));
      b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const n = (i + (e.key === "ArrowDown" ? 1 : -1) + cats.length) % cats.length;
        cats[n].focus();
      });
    });

    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; syncVideos(); }), { threshold: 0.15 }).observe(band);

    // cursor follower: ring follows the pointer inside the band, becomes the black ↗ disc over a case study,
    // and settles back to its Figma spot when the pointer leaves.
    const cur = $("[data-work-cursor]", band);
    if (!cur || reduced || !window.gsap) return;
    const REST = { x: 78, y: 739.84 };
    const pos = { ...REST }, target = { ...REST };
    band.addEventListener("mousemove", (e) => {
      const r = band.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      const t = e.target;
      cur.classList.toggle("is-media", !!t.closest(".h-case.is-active [data-case-media]"));
      cur.classList.toggle("is-link", !!t.closest(".h-cat, .h-work__all"));
    });
    band.addEventListener("mouseleave", () => {
      target.x = REST.x; target.y = REST.y;
      cur.classList.remove("is-media", "is-link");
    });
    gsap.ticker.add((time, deltaTime) => {
      if (!inView) return;
      const k = 1 - Math.pow(1 - 0.18, Math.min((deltaTime || 16.7) / 16.7, 4));
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      cur.style.transform = `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px)`;
    });
  }

  /* ---------- 6 · Testimonials ---------- */
  function initTestimonials() {
    const root = $("[data-tq]");
    const el = $("[data-tq-slider]");
    if (!root || !el || !window.Splide) return;
    const dotsWrap = $("[data-tq-dots]", root);
    const slides = $$(".splide__slide", el);
    const splide = new Splide(el, {
      type: "loop",
      perPage: 1,
      gap: "24px",
      arrows: false,
      pagination: false,
      speed: reduced ? 0 : 900,
      easing: "cubic-bezier(.65,0,.35,1)",
      drag: true,
      keyboard: "focused",
    });
    const dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "h-tq__dot" + (i === 0 ? " is-active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `Show testimonial ${i + 1}`);
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.addEventListener("click", () => splide.go(i));
      dotsWrap.appendChild(b);
      return b;
    });
    splide.on("move", (newIndex) => {
      dots.forEach((d, i) => {
        d.classList.toggle("is-active", i === newIndex);
        d.setAttribute("aria-selected", i === newIndex ? "true" : "false");
      });
    });
    splide.mount();
    $("[data-tq-prev]", root).addEventListener("click", () => splide.go("<"));
    $("[data-tq-next]", root).addEventListener("click", () => splide.go(">"));
    window.P.tq = splide; // handy for testing
  }

  /* ---------- 9 · FAQ accordion ---------- */
  function initFaq() {
    const list = $("[data-faq]");
    if (!list) return;
    const items = $$(".h-faq__item", list);
    const anim = !reduced && !!window.gsap;

    function close(item) {
      const a = $(".h-faq__a", item);
      const btn = $(".h-faq__q", item);
      if (!item.classList.contains("is-open")) return;
      btn.setAttribute("aria-expanded", "false");
      if (anim) {
        gsap.killTweensOf(a);
        gsap.set(a, { height: a.offsetHeight });
        item.classList.remove("is-open");
        gsap.to(a, { height: 0, duration: 0.5, ease: "power3.inOut" });
      } else item.classList.remove("is-open");
    }
    function open(item) {
      const a = $(".h-faq__a", item);
      const btn = $(".h-faq__q", item);
      btn.setAttribute("aria-expanded", "true");
      if (anim) {
        gsap.killTweensOf(a);
        const from = a.offsetHeight;
        item.classList.add("is-open");
        gsap.set(a, { height: "auto" });
        const to = a.offsetHeight;
        gsap.fromTo(a, { height: from }, { height: to, duration: 0.55, ease: "power3.inOut", onComplete: () => gsap.set(a, { clearProps: "height" }) });
        gsap.fromTo($("p", a), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.12, ease: "power2.out" });
      } else item.classList.add("is-open");
    }
    items.forEach((item) => {
      $(".h-faq__q", item).addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((o) => o !== item && close(o));
        if (isOpen) close(item); else open(item);
      });
    });
  }

  function init() {
    initHeroIntro();
    initHeroCards();
    initMarquee();
    initWork();
    initTestimonials();
    initFaq();
  }

  if (window.P && typeof window.P.onReady === "function") window.P.onReady(init);
  else document.addEventListener("DOMContentLoaded", init);
})();
