/* ===== Помощь Егору — frontend logic ===== */
(function () {
  "use strict";

  /* ---------- Gallery source list ---------- */
  const GALLERY = [
    "egor-11.jpg",
    "egor-01.jpg",
    "egor-portrait-wide.jpg",
    "egor-sister-water.jpg",
    "egor-04.jpg",
    "egor-03.jpg",
    "egor-05.jpg"
  ].map((f) => "assets/photos/" + f);

  /* ---------- «Две жизни»: диптихи ----------
     Каждая пара: слева жизнь до болезни, справа — после диагноза.
     Файлы лежат в assets/photos/story/ в двух форматах: .webp и .jpg (фолбэк).
  */
  const STORY_DIR = "assets/photos/story/";
  const PAIRS = [1, 2, 3, 4, 5, 6, 7, 8];
  const SOLO = ["solo1", "solo2", "solo3"];

  /* ---------- «Дневник»: видео ----------
     Порядок = драматургия: голос Егора → история болезни → палата →
     скорая → выход из клиники → гитара → «просто ЖИТЬ!».
     subs: языки, для которых есть настоящая дорожка .vtt.
  */
  const VIDEOS = [
    { id: "clip-3714", n: 1, subs: ["ru", "en", "es", "pt", "fr", "de", "zh"] },
    { id: "clip-3434", n: 2, subs: ["ru", "en", "es", "pt", "fr", "de", "zh"] },
    { id: "clip-3380", n: 3, subs: [] },
    { id: "clip-amb", n: 4, subs: [] },
    { id: "clip-short", n: 5, subs: [] },
    { id: "clip-3766", n: 6, subs: [] },
    { id: "clip-3432", n: 7, subs: [] }
  ];
  const VIDEO_DIR = "assets/videos/";
  const SUBS_DIR = "assets/videos/subs/";

  /* ---------- Medical documents (PDF) ----------
     Две языковые версии: ru показывается при русском языке,
     en (Intl) — при всех остальных. Размеры в байтах — для подписи в модалке.
  */
  const DOCS = {
    ru: [
      { key: "doc.ru_center", file: "assets/documents/ru/vypiska-centr-2026-04-30.pdf", bytes: 20515843 },
      { key: "doc.ru_mse", file: "assets/documents/ru/vypiska-mse.pdf", bytes: 26783 },
      { key: "doc.ru_subcommission", file: "assets/documents/ru/zaklyuchenie-podkomissii.pdf", bytes: 2220753 },
      { key: "doc.ru_consult", file: "assets/documents/ru/zaklyuchenie-konsultaciya.pdf", bytes: 168501 },
      { key: "doc.ru_consult_answer", file: "assets/documents/ru/otvet-konsultaciya.pdf", bytes: 387166 },
      // инвойс клиники — единственный англоязычный документ в русском списке,
      // подпись помечена «(англ.)». Файл тот же, что и в intl — дубликат не нужен.
      { key: "doc.en_invoice", file: "assets/documents/en/treatment-invoice.pdf", bytes: 1158404 }
    ],
    intl: [
      { key: "doc.en_conclusion", file: "assets/documents/en/medical-conclusion.pdf", bytes: 1157130 },
      { key: "doc.en_preliminary", file: "assets/documents/en/preliminary-conclusion.pdf", bytes: 10263123 },
      { key: "doc.en_response", file: "assets/documents/en/consultation-response.pdf", bytes: 387166 },
      { key: "doc.en_invoice", file: "assets/documents/en/treatment-invoice.pdf", bytes: 1158404 }
    ]
  };

  document.addEventListener("DOMContentLoaded", () => {
    // сначала генерируем разметку — потом переводим и навешиваем наблюдателей
    buildCarousel();
    buildTwoLives();
    buildDiary();
    initI18n();
    initMobileMenu();
    initTabs();
    initIntlChoice();
    initCopyButtons();
    initReveal();
    initLightbox();
    initDocsModal();
  });

  /* ---------- i18n ---------- */
  const I18N = window.I18N || {};
  const LANGS = window.I18N_LANGS || [{ code: "ru", short: "RU" }];
  const DEFAULT_LANG = "ru";
  let currentLang = DEFAULT_LANG;

  function t(key) {
    const dict = I18N[currentLang] || I18N[DEFAULT_LANG] || {};
    if (key in dict) return dict[key];
    const fb = I18N[DEFAULT_LANG] || {};
    return key in fb ? fb[key] : key;
  }

  function detectLang() {
    const saved = (function () {
      try { return localStorage.getItem("lang"); } catch (e) { return null; }
    })();
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || "ru").slice(0, 2).toLowerCase();
    return I18N[nav] ? nav : DEFAULT_LANG;
  }

  function applyLang(lang) {
    if (!I18N[lang]) lang = DEFAULT_LANG;
    currentLang = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}

    document.documentElement.setAttribute("lang", lang);

    // text nodes
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    // html nodes (with inline tags like <br>, <b>)
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    // alt-текст картинок
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });

    // <title> is fixed to "Help Egor" in HTML — do not override per language

    // switcher label
    const meta = LANGS.find((l) => l.code === lang);
    const cur = document.querySelector("[data-lang-current]");
    if (cur && meta) cur.textContent = meta.short;

    // highlight active option
    document.querySelectorAll(".lang-option").forEach((opt) => {
      const active = opt.getAttribute("data-lang") === lang;
      opt.classList.toggle("bg-surface-container-low", active);
      opt.classList.toggle("text-primary", active);
      opt.classList.toggle("font-bold", active);
    });

    // re-render dynamic parts that contain translated text
    rebuildDocsList();
    syncSubtitleTracks();
  }

  function initI18n() {
    // switcher dropdown (desktop)
    const btn = document.getElementById("lang-btn");
    const menu = document.getElementById("lang-menu");
    if (btn && menu) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = !menu.classList.contains("hidden");
        menu.classList.toggle("hidden");
        btn.setAttribute("aria-expanded", String(!open));
      });
      document.addEventListener("click", (e) => {
        if (!menu.classList.contains("hidden") && !menu.contains(e.target) && e.target !== btn) {
          menu.classList.add("hidden");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // all language options (desktop menu + mobile buttons)
    document.querySelectorAll(".lang-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        applyLang(opt.getAttribute("data-lang"));
        if (menu) menu.classList.add("hidden");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
    });

    applyLang(detectLang());
  }


  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    const toggle = document.getElementById("menu-toggle");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      menu.classList.toggle("hidden");
      const icon = toggle.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = menu.classList.contains("hidden") ? "menu" : "close";
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.add("hidden");
        const icon = toggle.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = "menu";
      })
    );
  }

  /* ---------- Donate tabs ---------- */
  function initTabs() {
    const tabs = document.querySelectorAll("#donate-tabs [data-tab]");
    const panels = document.querySelectorAll("[data-panel]");
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("bg-primary-container", active);
          t.classList.toggle("text-on-primary", active);
          t.classList.toggle("hover:bg-surface-container-low", !active);
        });
        panels.forEach((p) =>
          p.classList.toggle("hidden", p.getAttribute("data-panel") !== target)
        );
      })
    );
  }

  /* ---------- Выбор способа иностранного перевода ----------
     Отдельные атрибуты data-intl-choice / data-intl-pane, чтобы не пересекаться
     с [data-panel] из initTabs() — иначе главные вкладки РФ/интл ломаются.
  */
  const INTL_ACTIVE = ["bg-primary-container", "text-on-primary", "border-primary-container"];
  const INTL_IDLE = ["bg-white", "text-on-surface", "border-outline-variant/30", "hover:bg-surface-container-low"];

  function initIntlChoice() {
    const opts = Array.from(document.querySelectorAll("#intl-choice [data-intl-choice]"));
    const panes = Array.from(document.querySelectorAll("[data-intl-pane]"));
    if (!opts.length || !panes.length) return;

    function select(target, focus) {
      opts.forEach((o) => {
        const active = o.getAttribute("data-intl-choice") === target;
        o.setAttribute("aria-selected", String(active));
        o.classList.remove(...INTL_ACTIVE, ...INTL_IDLE);
        o.classList.add(...(active ? INTL_ACTIVE : INTL_IDLE));
        if (active && focus) o.focus();
      });
      panes.forEach((p) =>
        p.classList.toggle("hidden", p.getAttribute("data-intl-pane") !== target)
      );
    }

    opts.forEach((opt, i) => {
      opt.addEventListener("click", () => select(opt.getAttribute("data-intl-choice"), false));
      // стрелки — стандартное поведение для role="tablist"
      opt.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = opts[(i + dir + opts.length) % opts.length];
        select(next.getAttribute("data-intl-choice"), true);
      });
    });

    // приводим состояние к разметке (по умолчанию — онлайн-способ)
    const initial = opts.find((o) => o.getAttribute("aria-selected") === "true") || opts[0];
    select(initial.getAttribute("data-intl-choice"), false);
  }

  /* ---------- Copy to clipboard ---------- */
  function initCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrap = btn.closest("div");
        const valEl = wrap && wrap.querySelector("[data-copy-value]");
        if (!valEl) return;
        const text = valEl.textContent.trim();
        copyText(text).then(
          () => {
            showToast(t("toast.copied") + ": " + text);
            flashIcon(btn);
          },
          () => showToast("✕")
        );
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function flashIcon(btn) {
    const icon = btn.querySelector(".material-symbols-outlined");
    if (!icon) return;
    const prev = icon.textContent;
    icon.textContent = "check";
    setTimeout(() => (icon.textContent = prev), 1200);
  }

  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    const txt = document.getElementById("toast-text");
    if (!toast || !txt) return;
    txt.textContent = msg;
    toast.classList.remove("opacity-0", "translate-y-4");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("opacity-0", "translate-y-4"), 2200);
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal, .reveal-l, .reveal-r");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((e) => io.observe(e));
  }

  /* ---------- Carousel ---------- */
  function buildCarousel() {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    // Two identical sets for seamless loop
    const oneSet = GALLERY.map(
      (src) => `
      <div class="carousel-item flex-shrink-0 w-[280px] h-[300px] rounded-xl overflow-hidden soft-shadow relative mr-md">
        <img alt="Егор" class="w-full h-full object-cover" data-gallery loading="lazy" src="${src}" />
      </div>`
    ).join("");
    track.innerHTML = oneSet + oneSet;
  }

  /* ---------- «Две жизни»: диптихи ---------- */
  function picture(slug, altKey, extra) {
    return `
        <picture>
          <source srcset="${STORY_DIR}${slug}.webp" type="image/webp" />
          <img src="${STORY_DIR}${slug}.jpg" class="w-full h-full object-cover ${extra || ""}"
               data-gallery data-i18n-alt="${altKey}" alt="" loading="lazy" />
        </picture>`;
  }

  function buildTwoLives() {
    const grid = document.getElementById("two-lives-grid");
    if (!grid) return;

    const rows = PAIRS.map(
      (i) => `
      <figure class="dip grid grid-cols-2 gap-[3px] bg-white rounded-xl overflow-hidden soft-shadow hover-shadow">
        <div class="dip-cell reveal-l relative aspect-square">
          ${picture("pair" + i + "-life", "twolives.p" + i + "_life")}
          <figcaption class="dip-cap" data-i18n="twolives.p${i}_life"></figcaption>
        </div>
        <div class="dip-cell dip-hosp reveal-r relative aspect-square">
          ${picture("pair" + i + "-hosp", "twolives.p" + i + "_hosp")}
          <figcaption class="dip-cap" data-i18n="twolives.p${i}_hosp"></figcaption>
        </div>
      </figure>`
    ).join("");

    const solo = `
      <div class="mt-md reveal">
        <div class="flex items-center gap-sm mb-sm">
          <span class="h-px flex-grow bg-outline-variant/50"></span>
          <span class="material-symbols-outlined text-outline text-[20px]">filter_none</span>
          <span class="h-px flex-grow bg-outline-variant/50"></span>
        </div>
        <p class="text-center font-headline-sm text-headline-sm text-on-surface-variant" data-i18n="twolives.solo_title"></p>
        <p class="text-center font-label-md text-label-md text-on-surface-variant/70 mt-xs mb-md" data-i18n="twolives.solo_desc"></p>
        <div class="grid grid-cols-3 gap-[3px] md:gap-sm">
          ${SOLO.map(
            (s) => `
          <div class="dip-cell dip-hosp relative aspect-square rounded-xl overflow-hidden soft-shadow">
            ${picture(s, "twolives.solo_title")}
          </div>`
          ).join("")}
        </div>
      </div>`;

    grid.innerHTML = rows + solo;
  }

  /* ---------- «Дневник»: видео ---------- */
  function buildDiary() {
    const list = document.getElementById("diary-list");
    if (!list) return;

    list.innerHTML = VIDEOS.map((v, i) => {
      const right = i % 2 === 1; // чётные слева, нечётные справа
      const tracks = v.subs
        .map((code) => {
          const meta = LANGS.find((l) => l.code === code);
          return `<track kind="captions" src="${SUBS_DIR}${v.id}.${code}.vtt" srclang="${code}" label="${meta ? meta.label : code}" />`;
        })
        .join("");

      // у клипов с речью подписи не нужны — субтитры включаются сами
      const badge = v.subs.length
        ? ""
        : `<span class="diary-badge bg-surface-container-high text-on-surface-variant">
             <span class="material-symbols-outlined text-[16px]">music_note</span>
             <span data-i18n="diary.no_speech"></span>
           </span>`;

      return `
      <article class="grid md:grid-cols-2 gap-md md:gap-lg items-center reveal">
        <div class="${right ? "md:order-2" : ""}">
          <div class="rounded-xl overflow-hidden soft-shadow bg-black">
            <video class="diary-video" controls playsinline preload="none"
                   poster="${VIDEO_DIR}${v.id}-poster.jpg">
              <source src="${VIDEO_DIR}${v.id}.mp4" type="video/mp4" />
              ${tracks}
            </video>
          </div>
        </div>
        <div class="flex flex-col gap-sm ${right ? "md:order-1 md:text-right md:items-end" : ""}">
          <div class="flex items-center gap-sm ${right ? "md:flex-row-reverse" : ""}">
            <span class="w-9 h-9 flex-shrink-0 rounded-full bg-primary-container text-white flex items-center justify-center font-headline-sm text-[15px]">${String(v.n).padStart(2, "0")}</span>
            ${badge}
          </div>
          <h3 class="font-headline-md text-headline-md text-primary" data-i18n="diary.v${v.n}_title"></h3>
          <blockquote class="diary-quote ${right ? "diary-quote-r" : ""}" data-i18n="diary.v${v.n}_quote"></blockquote>
          <p class="font-body-md text-body-md text-on-surface-variant" data-i18n="diary.v${v.n}_desc"></p>
        </div>
      </article>`;
    }).join("");

    // часть браузеров сбрасывает режим дорожек при загрузке видео — возвращаем свой
    list.querySelectorAll("video.diary-video").forEach((v) => {
      v.addEventListener("loadedmetadata", syncSubtitleTracks);
    });
  }

  /* Сразу включает дорожку текущего языка. На русском не включаем —
     звук и так на русском, субтитры только мешали бы. */
  function syncSubtitleTracks() {
    document.querySelectorAll("video.diary-video").forEach((v) => {
      const tt = v.textTracks;
      if (!tt) return;
      for (let i = 0; i < tt.length; i++) {
        tt[i].mode =
          currentLang !== "ru" && tt[i].language === currentLang ? "showing" : "disabled";
      }
    });
  }

  /* ---------- Documents modal ---------- */
  function currentDocs() {
    return currentLang === "ru" ? DOCS.ru : DOCS.intl;
  }

  function fmtBytes(b) {
    return b >= 1048576
      ? (b / 1048576).toFixed(1) + " " + t("docs.mb")
      : Math.round(b / 1024) + " " + t("docs.kb");
  }

  function rebuildDocsList() {
    const list = document.getElementById("docs-list");
    if (!list) return;
    const docs = currentDocs();
    if (docs.length === 0) {
      list.innerHTML = `
        <div class="text-center py-lg text-on-surface-variant">
          <span class="material-symbols-outlined text-5xl text-primary-container">hourglass_empty</span>
          <p class="font-body-md text-body-md mt-sm">${t("docs.empty_title")}</p>
          <p class="font-label-md text-label-md mt-xs opacity-70">${t("docs.empty_desc")}</p>
        </div>`;
    } else {
      list.innerHTML =
        `<p class="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant/70 mb-sm">
           <span class="material-symbols-outlined text-[18px]">translate</span>${t("docs.lang_note")}
         </p>` +
        docs
          .map(
            (d) => `
        <a href="${d.file}" target="_blank" rel="noopener"
           class="flex items-center gap-sm bg-white p-md rounded-xl border border-outline-variant/20 soft-shadow hover-shadow transition-transform duration-300 hover:scale-[1.02] mb-sm group">
          <span class="material-symbols-outlined text-3xl text-error">picture_as_pdf</span>
          <span class="flex-grow">
            <span class="block font-body-md text-body-md text-on-surface">${t(d.key)}</span>
            <span class="block font-label-md text-label-md text-on-surface-variant/60">PDF · ${fmtBytes(d.bytes)}</span>
          </span>
          <span class="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">open_in_new</span>
        </a>`
          )
          .join("");
    }
  }

  function initDocsModal() {
    const modal = document.getElementById("docs-modal");
    const openBtn = document.getElementById("open-docs");
    const closeBtn = document.getElementById("docs-close");
    const list = document.getElementById("docs-list");
    if (!modal || !openBtn || !list) return;

    rebuildDocsList();

    function open() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      requestAnimationFrame(() => modal.classList.remove("opacity-0"));
      document.body.style.overflow = "hidden";
    }
    function close() {
      modal.classList.add("opacity-0");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }, 300);
      document.body.style.overflow = "";
    }
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
    });
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    const box = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    const closeBtn = document.getElementById("lightbox-close");
    const prevBtn = document.getElementById("lightbox-prev");
    const nextBtn = document.getElementById("lightbox-next");
    if (!box || !img) return;

    let current = 0;

    function collect() {
      // unique srcs in DOM order (carousel duplicates + story thumbs)
      const seen = new Set();
      const list = [];
      document.querySelectorAll("img[data-gallery]").forEach((el) => {
        if (!seen.has(el.src)) {
          seen.add(el.src);
          list.push(el.src);
        }
      });
      return list;
    }

    function open(src) {
      const list = collect();
      current = Math.max(0, list.indexOf(src));
      show(list);
      box.classList.remove("hidden");
      box.classList.add("flex");
      requestAnimationFrame(() => box.classList.remove("opacity-0"));
      document.body.style.overflow = "hidden";
    }
    function show(list) {
      img.src = list[current];
    }
    function close() {
      box.classList.add("opacity-0");
      setTimeout(() => {
        box.classList.add("hidden");
        box.classList.remove("flex");
      }, 300);
      document.body.style.overflow = "";
    }
    function move(dir) {
      const list = collect();
      current = (current + dir + list.length) % list.length;
      img.style.transform = "scale(0.96)";
      setTimeout(() => {
        show(list);
        img.style.transform = "scale(1)";
      }, 120);
    }

    document.addEventListener("click", (e) => {
      const t = e.target.closest("img[data-gallery]");
      if (t) open(t.src);
    });
    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => move(-1));
    nextBtn.addEventListener("click", () => move(1));
    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", (e) => {
      if (box.classList.contains("hidden")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    });
  }
})();
