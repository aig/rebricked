(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const resultsEl = $("#results");
  const searchEl = $("#search");
  const chipsEl = $("#chips");
  const toastEl = $("#toast");

  let DATA = [];
  let activeCategory = null;
  let activeSection = null; // {label, ids} when a rail section is selected
  let activeKind = "all";   // "all" | "rename" | "deprecation" | "feature"

  // The kind filter (top of results). Orthogonal to section/category/search.
  const FILTERS = [
    { key: "all", label: "All" },
    { key: "rename", label: "Renamed" },
    { key: "deprecation", label: "Deprecated & removed" },
    { key: "feature", label: "New features" },
  ];

  // ---- sidebar config: mirrors the Databricks console rail ----
  // Every item is clickable. `ids` lists the databricks.json entries that changed under
  // that section; those items get a dot. Sections with no renames show an empty state.
  // Home clears the filter and shows everything.
  const NAV = [
    { label: "", items: [
      { label: "Home", icon: "home", home: true },
      { label: "Learn", icon: "learn" },
      { label: "Workspace", icon: "workspace", ids: ["repos", "serverless-workspaces", "pat", "oauth-token-federation", "databricks-connect-legacy"] },
      { label: "Recents", icon: "recents" },
      { label: "Catalog", icon: "catalog", ids: ["catalog-explorer", "uc-volumes", "lakehouse-federation", "delta-sharing", "hive-metastore", "abac", "uc-managed-iceberg", "clean-rooms"] },
      { label: "Jobs & Pipelines", icon: "jobs", ids: ["dlt", "workflows", "bundles", "dbx", "pipelines-editor"] },
      { label: "Compute", icon: "compute", ids: ["lakebase", "access-modes", "no-isolation-shared", "dbfs-init-scripts"] },
      { label: "Discover", icon: "discover" },
      { label: "Marketplace", icon: "marketplace" },
    ]},
    { label: "SQL", items: [
      { label: "SQL Editor", icon: "sqlEditor", ids: ["databricks-sql", "legacy-sql-editor"] },
      { label: "Queries", icon: "queries" },
      { label: "Dashboards", icon: "dashboards", ids: ["dashboards", "legacy-dashboards"] },
      { label: "Genie Agents", icon: "genie", ids: ["genie-spaces", "databricks-one"] },
      { label: "Alerts", icon: "alerts", ids: ["legacy-sql-alerts"] },
      { label: "Query History", icon: "history" },
      { label: "SQL Warehouses", icon: "warehouse", ids: ["sql-endpoint", "odbc-driver"] },
    ]},
    { label: "Data Engineering", items: [
      { label: "Runs", icon: "runs" },
      { label: "Data Ingestion", icon: "ingestion" },
      { label: "Visual Data Prep", icon: "dataprep", ids: ["lakeflow-designer"] },
    ]},
    { label: "AI/ML", items: [
      { label: "Playground", icon: "playground" },
      { label: "Agents", icon: "agents", ids: ["vector-search", "supervisor-agent"] },
      { label: "AI Gateway", icon: "gateway" },
      { label: "Experiments", icon: "experiments" },
      { label: "Features", icon: "features", ids: ["workspace-feature-store"] },
      { label: "Models", icon: "models", ids: ["workspace-model-registry"] },
      { label: "Serving", icon: "serving", ids: ["model-serving"] },
    ]},
  ];

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    learn: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
    workspace: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    recents: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    catalog: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    jobs: '<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M6 8.3v1.7a3 3 0 0 0 3 3h.5M18 8.3v1.7a3 3 0 0 1-3 3h-.5M12 13v2.7"/>',
    compute: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    discover: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
    marketplace: '<path d="M4 9h16l-1-4H5z"/><path d="M4.5 9v10h15V9"/><path d="M9 19v-5h6v5"/>',
    sqlEditor: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
    queries: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    dashboards: '<rect x="3" y="3" width="7" height="9" rx="1.4"/><rect x="14" y="3" width="7" height="5" rx="1.4"/><rect x="14" y="12" width="7" height="9" rx="1.4"/><rect x="3" y="16" width="7" height="5" rx="1.4"/>',
    genie: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    alerts: '<path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
    warehouse: '<rect x="3" y="4.5" width="18" height="6.5" rx="1.4"/><rect x="3" y="13" width="18" height="6.5" rx="1.4"/><path d="M6.5 7.7h.01M6.5 16.2h.01"/>',
    runs: '<path d="M6 4l13 8-13 8z"/>',
    ingestion: '<path d="M12 3v10m0 0 4-4m-4 4-4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    dataprep: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    playground: '<path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6z"/><path d="M17.5 13l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    agents: '<rect x="5" y="8" width="14" height="10" rx="2.5"/><path d="M12 8V4.5M9 13h.01M15 13h.01"/><circle cx="12" cy="3.2" r="1.1"/>',
    gateway: '<path d="M12 3 5 6v5c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6z"/>',
    experiments: '<path d="M9.5 3h5M10.5 3v5.5l-5.2 8.7A2 2 0 0 0 7 20h10a2 2 0 0 0 1.7-2.8L13.5 8.5V3"/><path d="M8 15h8"/>',
    features: '<circle cx="7" cy="7" r="2.1"/><circle cx="17" cy="7" r="2.1"/><circle cx="7" cy="17" r="2.1"/><circle cx="17" cy="17" r="2.1"/>',
    models: '<path d="M12 3 21 8v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    serving: '<circle cx="12" cy="12" r="2.2"/><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4"/>',
  };

  // ---- boot ----
  init();

  async function init() {
    wireStaticControls();
    renderNav();
    try {
      DATA = await loadData();
    } catch (err) {
      renderError();
      return;
    }
    renderCounter();
    renderChips();
    renderFilters();
    render();
    searchEl.focus();
  }

  // ---- kind filter (All / Renamed / Deprecated & removed / New features) ----
  function renderFilters() {
    const el = $("#filters");
    if (!el) return;
    const count = (key) =>
      key === "all" ? DATA.length : DATA.filter((d) => kindOf(d) === key).length;
    el.innerHTML = FILTERS.map((f) => {
      const active = activeKind === f.key;
      return `<button class="filter${active ? " active" : ""}" data-kind="${escapeAttr(f.key)}" aria-pressed="${active}">${escapeHtml(f.label)}<span class="filter-count">${count(f.key)}</span></button>`;
    }).join("");
    el.querySelectorAll(".filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeKind = btn.dataset.kind;
        el.querySelectorAll(".filter").forEach((b) => {
          const on = b.dataset.kind === activeKind;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on);
        });
        render();
      });
    });
  }

  function syncFilterButtons() {
    const el = $("#filters");
    if (!el) return;
    el.querySelectorAll(".filter").forEach((b) => {
      const on = b.dataset.kind === activeKind;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
  }

  function renderNav() {
    const nav = $("#nav");
    if (!nav) return;
    nav.innerHTML = NAV.map((group) => {
      const label = group.label
        ? `<div class="nav-group-label">${escapeHtml(group.label)}</div>`
        : "";
      const items = group.items.map((it) => {
        const ids = it.ids || [];
        const renamed = ids.length > 0;
        const svg = `<svg class="ic" viewBox="0 0 24 24" width="18" height="18">${ICONS[it.icon] || ""}</svg>`;
        const dot = renamed ? `<span class="renamed-dot" title="${ids.length} change${ids.length === 1 ? "" : "s"} under this section"></span>` : "";
        const cls = "nav-item" + (renamed ? " is-renamed" : "");
        const data = it.home ? ` data-home="1"` : ` data-ids="${escapeAttr(ids.join(","))}"`;
        return `<button class="${cls}"${data}><span class="ic-wrap">${svg}</span><span class="label">${escapeHtml(it.label)}</span>${dot}</button>`;
      }).join("");
      return label + items;
    }).join("");

    nav.querySelectorAll(".nav-item").forEach((el) => {
      el.addEventListener("click", () => {
        setActiveNav(el);
        if (el.dataset.home !== undefined) {
          goHome();
        } else {
          const ids = (el.dataset.ids || "").split(",").filter(Boolean);
          setSection(el.querySelector(".label").textContent, ids);
        }
      });
    });
  }

  function setActiveNav(el) {
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    if (el) el.classList.add("active");
  }

  // Filter the list to one rail section's renames.
  function setSection(label, ids) {
    activeSection = { label, ids };
    searchEl.value = "";
    activeCategory = null;
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    activeSection = null;
    searchEl.value = "";
    activeCategory = null;
    activeKind = "all";
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadData() {
    // Primary source of truth. On GitHub Pages / any http(s) server this just works.
    const res = await fetch("databricks.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response " + res.status);
    return res.json();
  }

  // ---- rendering ----
  function render() {
    const q = searchEl.value.trim().toLowerCase();
    let rows = DATA.slice();

    // A rail section takes precedence: show exactly that section's entries.
    if (activeSection) {
      const ids = activeSection.ids;
      rows = rows.filter((d) => ids.includes(d.id));
    } else {
      if (activeCategory) {
        rows = rows.filter((d) => d.category === activeCategory);
      }
      if (q) {
        rows = rows.filter((d) => haystack(d).includes(q));
      }
    }

    // The kind filter is orthogonal — it narrows whatever's showing.
    if (activeKind !== "all") {
      rows = rows.filter((d) => kindOf(d) === activeKind);
    }

    // Most recently changed first — the freshest confusion on top.
    rows.sort((a, b) => changedAt(b).localeCompare(changedAt(a)));

    if (rows.length === 0) {
      const kindNote =
        activeKind !== "all"
          ? ` matching <b>${escapeHtml(FILTERS.find((f) => f.key === activeKind).label)}</b>`
          : "";
      resultsEl.innerHTML = activeSection
        ? `<div class="empty">Nothing${kindNote} under <b>${escapeHtml(activeSection.label)}</b> — yet.<br>Either it kept its name, or Databricks hasn't gotten to it.</div>`
        : `<p class="empty">No results${kindNote}. Either it was never renamed,<br>or it was renamed to something you haven't heard yet.</p>`;
      return;
    }

    resultsEl.innerHTML = rows.map((d) => rowHTML(d, activeSection ? "" : q)).join("");
    wireRows();
  }

  function rowHTML(d, q) {
    const kind = kindOf(d);

    const src = d.source
      ? `<a href="${escapeAttr(d.source)}" target="_blank" rel="noopener">source ↗</a>`
      : `<span class="nosrc">no source</span>`;
    const note = d.note ? `<p class="row-note">${escapeHtml(d.note)}</p>` : "";
    const occasion = d.occasion ? ` · ${escapeHtml(d.occasion)}` : "";

    let trail, badge = "", dateText, rowCls = "";
    if (kind === "feature") {
      rowCls = " is-feature";
      trail = featureTrail(d, q);
      const status = d.status || "ga";
      const label = status === "preview" ? "preview" : "new";
      badge = `<span class="badge badge-${escapeAttr(status)}">${escapeHtml(label)}</span>`;
      dateText = `introduced ${escapeHtml(d.introducedAt || "?")}${occasion}`;
    } else if (kind === "deprecation") {
      rowCls = " is-deprecation";
      trail = depTrail(d, q);
      const status = d.status || "deprecated";
      badge = `<span class="badge badge-${escapeAttr(status)}">${escapeHtml(status)}</span>`;
      const removed = d.removedAt ? ` · access ended ${escapeHtml(d.removedAt)}` : "";
      dateText = `deprecated ${escapeHtml(d.deprecatedAt || "?")}${removed}${occasion}`;
    } else {
      trail = renameTrail(d, q);
      dateText = `renamed ${escapeHtml(d.renamedAt || "?")}${occasion}`;
    }

    return `
      <article class="row${rowCls}" data-id="${escapeAttr(d.id)}">
        <div class="row-main"><div class="lineage">${trail}</div></div>
        <p class="row-what">${escapeHtml(d.what || "")}</p>
        <div class="row-meta">
          <span class="cat">${escapeHtml(d.category || "")}</span>
          ${badge}
          ${src}
          <span class="date">${dateText}</span>
        </div>
        ${note}
      </article>`;
  }

  // A feature renders just its current name, clickable to copy a "yes, that's real" line.
  function featureTrail(d, q) {
    const when = d.introducedAt ? escapeAttr(d.introducedAt) : "";
    return `<span class="current feature-name" data-name="${escapeAttr(d.name)}" data-feature="1" data-when="${when}" title="click to copy">${highlight(escapeHtml(d.name), q)}</span>`;
  }

  // A rename renders its full lineage trail, ending in the clickable current name.
  function renameTrail(d, q) {
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
    return chain.join(` <span class="arrow">→</span> `);
  }

  // A deprecation renders old-name → replacement (or "retired" when there's no successor).
  function depTrail(d, q) {
    const removedYr = d.removedAt ? `<span class="yr"> ${escapeHtml(shortYear(d.removedAt))}</span>` : "";
    const old = `<span class="old dep-name">${highlight(escapeHtml(d.name), q)}${removedYr}</span>`;
    if (d.replacement) {
      const rep = `<span class="current" data-name="${escapeAttr(d.replacement)}" data-old="${escapeAttr(d.name)}" data-dep="1" title="click to copy a correction">${highlight(escapeHtml(d.replacement), q)}</span>`;
      return `${old} <span class="arrow">→</span> ${rep}`;
    }
    return `${old} <span class="arrow">→</span> <span class="retired">retired — no direct replacement</span>`;
  }

  function renderError() {
    resultsEl.innerHTML = `
      <div class="error">
        <p><strong>Couldn't load <code>databricks.json</code>.</strong></p>
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
        activeSection = null; // category chips override a rail-section filter
        setActiveNav(null);
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
    // days since the most recent change (rename or deprecation) anywhere in the dataset
    const latest = DATA
      .map(changedAt)
      .filter(Boolean)
      .sort()
      .pop();
    const days = daysSince(latest);
    const el = $("#counter-text");
    if (days == null) {
      el.textContent = "change date unknown";
      return;
    }
    el.innerHTML = `<b>${days}</b> day${days === 1 ? "" : "s"} since the last change`;
  }

  // ---- interactions ----
  function wireStaticControls() {
    searchEl.addEventListener("input", () => {
      activeSection = null; // manual typing clears any rail-section filter
      setActiveNav(null);
      render();
    });

    $("#roulette").addEventListener("click", roulette);

    const sideNew = $("#side-new");
    if (sideNew) sideNew.addEventListener("click", goHome);

    $("#theme-toggle").addEventListener("click", () => {
      const root = document.documentElement;
      const cur = root.dataset.theme || "light";
      const next = cur === "dark" ? "light" : "dark";
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
        let text;
        if (el.dataset.feature) {
          const when = el.dataset.when ? ` (since ${el.dataset.when})` : "";
          text = `Yes, "${name}" is a real Databricks feature${when}.`;
        } else if (el.dataset.dep) {
          text = `Actually, "${el.dataset.old}" is deprecated — use "${name}" now.`;
        } else {
          text = `Actually, it's called "${name}" now.`;
        }
        copy(text).then((ok) =>
          toast(ok ? `Copied: ${text}` : "Copy failed — select it manually.")
        );
      });
    });
  }

  function roulette() {
    if (DATA.length === 0) return;
    // clear filters so the pick is always visible
    setActiveNav(null);
    activeSection = null;
    searchEl.value = "";
    activeCategory = null;
    activeKind = "all";
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
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
      d.current,        // renames
      d.name,           // deprecations
      d.replacement,    // deprecations
      d.category,
      d.what,
      ...(d.aliases || []),
      ...(d.lineage || []).flatMap((s) => [s.name, s.abbr]),
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();
  }

  // A rename's "when" is renamedAt; a deprecation's is when it was removed, else
  // deprecated; a feature's is when it was introduced.
  function changedAt(d) {
    return d.renamedAt || d.removedAt || d.deprecatedAt || d.introducedAt || "";
  }

  // Normalize an entry to one of the three filter buckets. Absent kind => rename.
  function kindOf(d) {
    return d.kind === "deprecation" || d.kind === "feature" ? d.kind : "rename";
  }

  function isDeprecation(d) {
    return d.kind === "deprecation";
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
