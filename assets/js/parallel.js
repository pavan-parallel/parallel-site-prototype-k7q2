/* Parallel page behaviour
   - Hero load-in: heading lines rise, subline fades, cover photo reveals, logos follow
   - "for" gets struck through, then "with" fades in
   - Slack thread plays in message by message when it scrolls into view
   - FAQ accordion: one open at a time
*/
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- FAQ accordion (works with or without GSAP) ---------- */
  function initAccordion() {
    $$("[data-accordion]").forEach((list) => {
      const items = $$(".p-faq__item", list);
      items.forEach((item) => {
        const btn = $(".p-faq__q", item);
        btn.addEventListener("click", () => {
          const willOpen = !item.classList.contains("is-open");
          items.forEach((other) => {
            other.classList.remove("is-open");
            $(".p-faq__q", other).setAttribute("aria-expanded", "false");
          });
          if (willOpen) {
            item.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
          }
          // page height changes while the panel animates; keep triggers in sync
          if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 550);
        });
      });
    });
  }

  /* ---------- Hero load-in ---------- */
  function heroIntro() {
    const lines = $$(".p-hero .p-line > span");
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(lines, { y: 0, duration: 1.1, stagger: 0.125, ease: "power3.out" })
      .fromTo(".p-hero__sub", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, 0.35)
      .to(".p-hero__cover", { clipPath: "inset(0% 0 0 0)", duration: 1.4, ease: "power3.inOut" }, 0.45)
      .fromTo(".p-hero__cover img", { scale: 1.12 }, { scale: 1, duration: 1.8, ease: "power3.out" }, 0.45)
      .fromTo(".p-logo", { opacity: 0, y: 12 }, { opacity: 0.5, y: 0, duration: 0.8, stagger: 0.07, ease: "power2.out" }, 1.25);
  }

  /* ---------- "we work for → with you" ---------- */
  function strikeHeading() {
    const strike = $(".p-strike");
    const withEl = $(".p-with__with");
    if (!strike || !withEl) return;
    gsap.set(strike, { "--strike": 0, color: "#111111" });
    gsap.set(withEl, { opacity: 0, y: 10 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".p-with__title", start: "top 75%", once: true },
    });
    tl.to(strike, { "--strike": 1, duration: 0.6, ease: "power2.inOut" }, 0.3)
      .to(strike, { color: "rgba(17,17,17,0.32)", duration: 0.5, ease: "power1.out" }, 0.6)
      .to(withEl, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.95);
  }

  /* ---------- Slack thread plays in ---------- */
  function threadPlay() {
    const card = $(".p-thread");
    if (!card) return;
    const msgs = $$("[data-msg]", card);
    const typing = $("[data-typing]", card);
    gsap.set(card, { opacity: 0, y: 32 });
    gsap.set(msgs, { opacity: 0, y: 14 });
    gsap.set($$("[data-react]", card), { opacity: 0, scale: 0.5, transformOrigin: "left center" });
    gsap.set(typing, { opacity: 0 });

    const STEP = 0.45;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: card, start: "top 75%", once: true },
    });
    tl.to(card, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0);
    let t = 0.5;
    msgs.forEach((m) => {
      tl.to(m, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, t);
      const reacts = $$("[data-react]", m);
      if (reacts.length) {
        tl.to(reacts, { opacity: 1, scale: 1, duration: 0.45, stagger: 0.12, ease: "back.out(2.4)" }, t + 0.45);
        t += 0.25;
      }
      t += STEP;
    });
    tl.to(typing, {
      opacity: 1, duration: 0.4, ease: "power1.out",
      onStart: () => typing.classList.add("is-live"),
    }, t + 0.1);
  }

  function initMotion() {
    if (reduced || !window.gsap) {
      document.documentElement.classList.add("p-no-motion");
      return;
    }
    heroIntro();
    strikeHeading();
    threadPlay();
  }

  initAccordion();
  // base.js may already have run its ready queue (both scripts are deferred), so run directly in that case
  const P = window.P || {};
  if ("lenis" in P) initMotion();
  else if (P.onReady) P.onReady(initMotion);
  else document.addEventListener("DOMContentLoaded", initMotion);
})();
