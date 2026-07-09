(function () {
  const STORAGE_LANG = "rm-pitch-lang";
  const STORAGE_MODE = "rm-pitch-mode";

  const sections = [...document.querySelectorAll(".section[data-id]")];
  const dots = document.getElementById("progress-rail");
  const topbar = document.querySelector(".topbar");

  let lang = localStorage.getItem(STORAGE_LANG) || "fr";
  let mode = localStorage.getItem(STORAGE_MODE) || "all";

  function setLang(next) {
    lang = next;
    localStorage.setItem(STORAGE_LANG, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-fr]").forEach((el) => {
      const show = lang === "fr";
      el.hidden = !show;
    });
    document.querySelectorAll("[data-en]").forEach((el) => {
      const show = lang === "en";
      el.hidden = !show;
    });
    document.getElementById("lang-toggle").textContent = lang === "fr" ? "EN" : "FR";
  }

  function setMode(next) {
    mode = next;
    localStorage.setItem(STORAGE_MODE, mode);
    document.body.dataset.mode = mode;
    document.querySelectorAll(".audience-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    rebuildDots();
    observeSections();
  }

  function visibleSections() {
    return sections.filter((s) => {
      const aud = s.dataset.audience || "all";
      if (mode === "all") return true;
      return aud.split(" ").includes(mode) || aud === "all";
    });
  }

  function rebuildDots() {
    if (!dots) return;
    dots.innerHTML = "";
    visibleSections().forEach((section) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "progress-dot";
      btn.title = section.dataset.id;
      btn.addEventListener("click", () => {
        section.scrollIntoView({ behavior: "smooth" });
      });
      btn.dataset.target = section.dataset.id;
      dots.appendChild(btn);
    });
    updateActiveDot();
  }

  function updateActiveDot() {
    const visible = visibleSections();
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let activeId = visible[0]?.dataset.id;
    for (const section of visible) {
      if (section.offsetTop <= scrollY) activeId = section.dataset.id;
    }
    dots?.querySelectorAll(".progress-dot").forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.target === activeId);
    });
  }

  function animateCounters() {
    document.querySelectorAll("[data-count]").forEach((el) => {
      if (el.dataset.animated) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      el.dataset.animated = "1";
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent =
          prefix +
          val.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals,
          }) +
          suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    document.querySelectorAll(".roi-bar").forEach((bar) => {
      if (bar.classList.contains("animated")) return;
      const rect = bar.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        bar.classList.add("animated");
      }
    });
  }

  function observeSections() {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.remove("visible");
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
        animateCounters();
        updateActiveDot();
      },
      { threshold: 0.12 }
    );
    visibleSections().forEach((section) => {
      section.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
      observer.observe(section);
    });
  }

  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    setLang(lang === "fr" ? "en" : "fr");
  });

  document.querySelectorAll(".audience-btn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  window.addEventListener(
    "scroll",
    () => {
      topbar?.classList.toggle("scrolled", window.scrollY > 12);
      updateActiveDot();
      animateCounters();
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    const visible = visibleSections();
    const scrollY = window.scrollY + window.innerHeight * 0.4;
    let idx = 0;
    visible.forEach((s, i) => {
      if (s.offsetTop <= scrollY) idx = i;
    });
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      visible[Math.min(idx + 1, visible.length - 1)]?.scrollIntoView({ behavior: "smooth" });
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      visible[Math.max(idx - 1, 0)]?.scrollIntoView({ behavior: "smooth" });
    }
  });

  setLang(lang);
  setMode(mode);
})();