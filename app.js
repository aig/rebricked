(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const resultsEl = $("#results");
  const searchEl = $("#search");
  const chipsEl = $("#chips");
  const toastEl = $("#toast");

  let DATA = [];
  let activeCategory = null;

  // ---- boot ----
  init();

  async function init() {
    wireStaticControls();
    try {
      DATA = await loadData();
    } catch (err) {
      renderError();
      return;
    }
    renderCounter();
    renderChips();
    render();
    searchEl.focus();
  }

  async function loadData() {
    // Primary source of truth. On GitHub Pages / any http(s) server this just works.
    const res = await fetch("renames.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response " + res.status);
    return res.json();
  }

  // ---- rendering ----
  function render() {
    const q = searchEl.value.trim().toLowerCase();
    let rows = DATA.slice();

    if (activeCategory) {
      rows = rows.filter((d) => d.category === activeCategory);
    }
    if (q) {
      rows = rows.filter((d) => haystack(d).includes(q));
    }

    // Most recently renamed first — the freshest confusion on top.
    rows.sort((a, b) => (b.renamedAt || "").localeCompare(a.renamedAt || ""));

    if (rows.length === 0) {
      resultsEl.innerHTML =
        `<p class="empty">No results. Either it was never renamed,<br>or it was renamed to something you haven't heard yet.</p>`;
      return;
    }

    resultsEl.innerHTML = rows.map((d) => rowHTML(d, q)).join("");
    wireRows();
  }

  function rowHTML(d, q) {
    const chain = d.lineage.map((step, i) => {
      const isLast = i === d.lineage.length - 1;
      const name = highlight(escapeHtml(step.name), q);
      const abbr = step.abbr ? ` (${highlight(escapeHtml(step.abbr), q)})` : "";
      if (isLast) {
        return `<span class="current" data-name="${escapeAttr(step.name)}" title="click to copy a correction">${name}${abbr}</span>`;
      }
      const yr = step.to ? `<span class="yr"> ${escapeHtml(shortYear(step.to))}</span>` : "";
      return `<span class="old">${name}${abbr}${yr}</span>`;
    });

    const trail = chain.join(` <span class="arrow">→</span> `);
    const src = d.source
      ? `<a href="${escapeAttr(d.source)}" target="_blank" rel="noopener">source ↗</a>`
      : `<span class="nosrc">no source</span>`;
    const note = d.note ? `<p class="row-note">${escapeHtml(d.note)}</p>` : "";
    const occasion = d.occasion ? ` · ${escapeHtml(d.occasion)}` : "";

    return `
      <article class="row" data-id="${escapeAttr(d.id)}">
        <div class="row-main"><div class="lineage">${trail}</div></div>
        <p class="row-what">${escapeHtml(d.what || "")}</p>
        <div class="row-meta">
          <span class="cat">${escapeHtml(d.category || "")}</span>
          ${src}
          <span class="date">renamed ${escapeHtml(d.renamedAt || "?")}${occasion}</span>
        </div>
        ${note}
      </article>`;
  }

  function renderError() {
    resultsEl.innerHTML = `
      <div class="error">
        <p><strong>Couldn't load <code>renames.json</code>.</strong></p>
        <p>If you opened this file directly, your browser blocked the fetch.<br>
        Serve it over http instead — from this folder run:</p>
        <p><code>python -m http.server</code></p>
        <p>then open <code>http://localhost:8000</code>. It's a static site; that's all it needs.</p>
      </div>`;
  }

  function renderChips() {
    const cats = [...new Set(DATA.map((d) => d.category).filter(Boolean))].sort();
    chipsEl.innerHTML = cats
      .map((c) => `<button class="chip" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`)
      .join("");
    chipsEl.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const cat = chip.dataset.cat;
        activeCategory = activeCategory === cat ? null : cat;
        chipsEl.querySelectorAll(".chip").forEach((c) =>
          c.classList.toggle("active", c.dataset.cat === activeCategory)
        );
        render();
      });
    });
  }

  function renderCounter() {
    // days since the most recent rename anywhere in the dataset
    const latest = DATA
      .map((d) => d.renamedAt)
      .filter(Boolean)
      .sort()
      .pop();
    const days = daysSince(latest);
    const el = $("#counter-text");
    if (days == null) {
      el.textContent = "rename date unknown";
      return;
    }
    el.innerHTML = `It has been <b>${days}</b> day${days === 1 ? "" : "s"} since the last Databricks rename.`;
  }

  // ---- interactions ----
  function wireStaticControls() {
    searchEl.addEventListener("input", render);

    $("#roulette").addEventListener("click", roulette);

    $("#theme-toggle").addEventListener("click", () => {
      const root = document.documentElement;
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try { localStorage.setItem("rebricked-theme", next); } catch (e) {}
    });

    try {
      const saved = localStorage.getItem("rebricked-theme");
      if (saved) document.documentElement.dataset.theme = saved;
    } catch (e) {}

    // "/" focuses search, like every tool this audience already lives in.
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchEl) {
        e.preventDefault();
        searchEl.focus();
      }
    });
  }

  function wireRows() {
    // copy-as-you-were-wrong
    resultsEl.querySelectorAll(".current").forEach((el) => {
      el.addEventListener("click", () => {
        const name = el.dataset.name;
        const text = `Actually, it's called "${name}" now.`;
        copy(text).then((ok) =>
          toast(ok ? `Copied: ${text}` : "Copy failed — select it manually.")
        );
      });
    });
  }

  function roulette() {
    if (DATA.length === 0) return;
    // clear filters so the pick is always visible
    searchEl.value = "";
    activeCategory = null;
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    render();

    const rows = resultsEl.querySelectorAll(".row");
    if (rows.length === 0) return;

    // a short beat of fake suspense, then land
    let ticks = 6 + Math.floor(rows.length * 0.7);
    let i = 0;
    const spin = () => {
      rows.forEach((r) => r.classList.remove("flash"));
      const pick = rows[i % rows.length];
      pick.classList.add("flash");
      i++;
      if (ticks-- > 0) {
        setTimeout(spin, 60 + (1 - ticks / 12) * 40);
      } else {
        rows.forEach((r) => r.classList.remove("flash"));
        const winner = rows[(i - 1) % rows.length];
        winner.classList.add("flash");
        winner.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    spin();
  }

  // ---- helpers ----
  function haystack(d) {
    return [
      d.current,
      d.category,
      d.what,
      ...(d.aliases || []),
      ...d.lineage.flatMap((s) => [s.name, s.abbr]),
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();
  }

  function daysSince(dateStr) {
    if (!dateStr) return null;
    // accept YYYY or YYYY-MM; default missing parts to the start of the period
    const [y, m] = dateStr.split("-");
    const then = new Date(Number(y), (Number(m) || 1) - 1, 1);
    if (isNaN(then)) return null;
    const now = new Date();
    const diff = Math.floor((now - then) / 86400000);
    return diff < 0 ? 0 : diff;
  }

  function shortYear(dateStr) {
    return (dateStr || "").split("-")[0];
  }

  function highlight(text, q) {
    if (!q) return text;
    // q and text are already escaped; match on the escaped text
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      return text.replace(new RegExp(safe, "gi"), (m) => `<mark>${m}</mark>`);
    } catch (e) {
      return text;
    }
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    // fallback for file:// and http (non-secure) contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }
})();
