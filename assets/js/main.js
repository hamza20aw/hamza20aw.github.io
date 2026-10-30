// ---------------------------------------------------------------------------
// Settings: paste your Microsoft Clarity project ID here (clarity.microsoft.com
// → New project → Settings → Overview → Project ID). Empty = analytics off.
// ---------------------------------------------------------------------------
const CLARITY_ID = "z4tgh6o3hg";
// Only the published site reports to Clarity, so local previews don't pollute the data.
const IS_LIVE = location.hostname === "hamza20aw.github.io";

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};
const params = new URLSearchParams(location.search);

// --- Analytics -------------------------------------------------------------
function track(...args) { if (window.clarity) window.clarity(...args); }

if (CLARITY_ID && IS_LIVE) {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);

  // Consent (needed for visitors from the EU/UK; harmless elsewhere).
  const consent = store.get("consent");
  const applyConsent = (ok) => track("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: ok ? "granted" : "denied",
  });
  const banner = document.querySelector(".consent");
  if (consent) applyConsent(consent === "yes");
  else banner.hidden = false;
  banner.addEventListener("click", (e) => {
    const choice = e.target.closest("[data-consent]")?.dataset.consent;
    if (!choice) return;
    store.set("consent", choice);
    applyConsent(choice === "yes");
    banner.hidden = true;
  });
}

// Per-application links: share ...?r=company-name and filter by the "ref" tag in Clarity.
const rawRef = params.get("r") || params.get("ref") || params.get("utm_source");
const ref = (rawRef || store.sget("ref") || "direct").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "direct";
store.sset("ref", ref);
track("set", "ref", ref);

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-track]");
  if (el) track("event", el.dataset.track);
});

const seen = new Set();
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting && !seen.has(en.target.id)) {
        seen.add(en.target.id);
        track("event", "view_" + en.target.id);
      }
    }
  }, { threshold: 0.35 });
  document.querySelectorAll("main section[id]").forEach((s) => io.observe(s));
}

// --- Language --------------------------------------------------------------
const nodes = [...document.querySelectorAll("[data-i18n]")];
const EN = Object.fromEntries(nodes.map((n) => [n.dataset.i18n, n.innerHTML]));
EN._title = document.title;

function setLang(lang) {
  const dict = lang === "tr" ? window.I18N_TR : EN;
  for (const n of nodes) {
    const v = dict[n.dataset.i18n];
    if (v != null) n.innerHTML = v;
  }
  document.title = dict._title;
  document.documentElement.lang = lang;
  document.querySelectorAll(".lang button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  store.set("lang", lang);
  track("set", "lang", lang);
}

document.querySelector(".lang").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-lang]");
  if (!b) return;
  setLang(b.dataset.lang);
  track("event", "lang_" + b.dataset.lang);
});

const initialLang = params.get("lang") || store.get("lang") ||
  ((navigator.language || "").toLowerCase().startsWith("tr") ? "tr" : "en");
setLang(initialLang === "tr" ? "tr" : "en");

// --- Lightbox --------------------------------------------------------------
const lb = document.querySelector(".lightbox");
const lbImg = lb.querySelector("img");
const lbCap = lb.querySelector("figcaption");
const photos = [...document.querySelectorAll(".gallery figure:not(.no-zoom) img, .card img, .edu-photo img, .contact-photo img")];
let cur = 0;

function caption(img) {
  return img.closest("figure")?.querySelector("figcaption")?.textContent
    || img.closest(".card")?.querySelector("h3")?.textContent
    || img.alt || "";
}
function show(i) {
  cur = (i + photos.length) % photos.length;
  const img = photos[cur];
  lbImg.src = img.currentSrc || img.src;
  lbImg.alt = caption(img);
  lbCap.textContent = caption(img);
}
photos.forEach((img, i) => img.addEventListener("click", () => {
  show(i);
  lb.showModal();
  track("event", "photo_" + img.src.split("/").pop().replace(/\.\w+$/, ""));
}));
lb.querySelector(".lb-close").addEventListener("click", () => lb.close());
lb.querySelector(".lb-prev").addEventListener("click", () => show(cur - 1));
lb.querySelector(".lb-next").addEventListener("click", () => show(cur + 1));
lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") show(cur + 1);
  if (e.key === "ArrowLeft") show(cur - 1);
});

// --- Reveal on scroll ------------------------------------------------------
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const items = document.querySelectorAll(".pipeline li, .gallery figure, .project, .card, .timeline > li, .skills > div, .edu-item, .portal");
  const ro = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((el) => { el.classList.add("reveal"); ro.observe(el); });
}
