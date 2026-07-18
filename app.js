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
  let activeYear = null;    // "2025" etc. when a timeline bar is selected
  let focusId = null;       // a single deep-linked entry (#id), overrides everything

  // Rotated on each empty render so the deadpan doesn't get stale.
  const EMPTY_LINES = [
    "Either it was never renamed,<br>or it was renamed to something you haven't heard yet.",
    "Nothing here. Check back after the next summit keynote.",
    "No matches. It may have been renamed to a synonym of the word you typed.",
    "Zero results — which, for Databricks, is statistically surprising.",
    "Couldn't find it. Try the old name. Or the older name. Or the oldest name.",
  ];
  let emptyIdx = 0;

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
      { label: "Workspace", icon: "workspace", ids: ["repos", "legacy-cli", "serverless-workspaces", "pat", "oauth-token-federation", "databricks-connect-legacy"] },
      { label: "Recents", icon: "recents" },
      { label: "Catalog", icon: "catalog", ids: ["catalog-explorer", "uc-volumes", "dbfs-mounts", "lakehouse-federation", "delta-sharing", "delta-lake", "liquid-clustering", "hive-metastore", "abac", "uc-managed-iceberg", "clean-rooms"] },
      { label: "Jobs & Pipelines", icon: "jobs", ids: ["dlt", "workflows", "bundles", "dbx", "pipelines-editor"] },
      { label: "Compute", icon: "compute", ids: ["lakebase", "access-modes", "no-isolation-shared", "dbfs-init-scripts"] },
      { label: "Discover", icon: "discover" },
      { label: "Marketplace", icon: "marketplace" },
    ]},
    { label: "SQL", items: [
      { label: "SQL Editor", icon: "sqlEditor", ids: ["databricks-sql", "legacy-sql-editor"] },
      { label: "Queries", icon: "queries" },
      { label: "Dashboards", icon: "dashboards", ids: ["dashboards", "legacy-dashboards"] },
      { label: "Genie Agents", icon: "genie", ids: ["genie-spaces", "databricks-one", "genie-code"] },
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
    renderFooterLine();
    renderChips();
    renderFilters();
    renderTimeline();
    renderSpotlight();
    renderChallenge();   // show a "beat this score" banner from a shared ?quiz= link
    applyRoute();        // honor ?q= / #id from the address bar
    render();
    if (!focusId) searchEl.focus();
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
        writeURL();
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
        setSidebarOpen(false); // on mobile the rail overlays the content — close it after a pick
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

  // Mobile-only sidebar state; a no-op on desktop where the rail is always visible.
  function setSidebarOpen(open) {
    const sb = document.querySelector(".sidebar");
    if (!sb) return;
    sb.classList.toggle("open", open);
    const scrim = $("#scrim");
    if (scrim) scrim.hidden = !open;
    const btn = $("#menu-toggle");
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }

  // Filter the list to one rail section's renames.
  function setSection(label, ids) {
    activeSection = { label, ids };
    focusId = null;
    activeYear = null;
    searchEl.value = "";
    activeCategory = null;
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    writeURL();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    activeSection = null;
    focusId = null;
    activeYear = null;
    searchEl.value = "";
    activeCategory = null;
    activeKind = "all";
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    writeURL();
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
    // A single deep-linked entry (#id) shows on its own — nothing else competes.
    if (focusId) {
      const one = DATA.find((d) => d.id === focusId);
      updateHomeExtras();
      if (one) {
        resultsEl.innerHTML = rowHTML(one, "");
        wireRows();
        requestAnimationFrame(() => {
          const el = resultsEl.querySelector(".row");
          if (el) el.classList.add("flash");
        });
        return;
      }
      focusId = null; // unknown id — fall through to the normal list
    }

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

    // The timeline year filter is likewise orthogonal.
    if (activeYear) {
      rows = rows.filter((d) => shortYear(changedAt(d)) === activeYear);
    }

    // Most recently changed first — the freshest confusion on top.
    rows.sort((a, b) => dateKey(changedAt(b)).localeCompare(dateKey(changedAt(a))));

    updateHomeExtras();

    if (rows.length === 0) {
      const kindNote =
        activeKind !== "all"
          ? ` matching <b>${escapeHtml(FILTERS.find((f) => f.key === activeKind).label)}</b>`
          : "";
      const yearNote = activeYear ? ` in <b>${escapeHtml(activeYear)}</b>` : "";
      const line = EMPTY_LINES[emptyIdx++ % EMPTY_LINES.length];
      resultsEl.innerHTML = activeSection
        ? `<div class="empty">Nothing${kindNote}${yearNote} under <b>${escapeHtml(activeSection.label)}</b> — yet.<br>Either it kept its name, or Databricks hasn't gotten to it.</div>`
        : `<p class="empty">No results${kindNote}${yearNote}. ${line}</p>`;
      return;
    }

    resultsEl.innerHTML = rows.map((d) => rowHTML(d, activeSection ? "" : q)).join("");
    wireRows();
  }

  // The spotlight + timeline belong to the neutral Home view; hide them the
  // moment any filter, search, section, or deep link is active.
  function isHome() {
    return (
      !focusId &&
      !activeSection &&
      !activeCategory &&
      !activeYear &&
      activeKind === "all" &&
      searchEl.value.trim() === ""
    );
  }

  function updateHomeExtras() {
    const home = isHome();
    const tl = $("#timeline");
    const sp = $("#spotlight");
    if (tl) {
      tl.hidden = !home && !activeYear; // keep it visible while a year is selected
      tl.querySelectorAll(".tl-bar").forEach((b) =>
        b.classList.toggle("active", b.dataset.year === activeYear)
      );
    }
    if (sp) sp.hidden = !home;
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
      const verb = status === "legacy" ? "legacy since" : "deprecated";
      dateText = `${verb} ${escapeHtml(d.deprecatedAt || "?")}${removed}${occasion}`;
    } else {
      trail = renameTrail(d, q);
      dateText = `renamed ${escapeHtml(d.renamedAt || "?")}${occasion}`;
    }

    const odds = kind === "deprecation" ? "" : oddsBadge(d);

    return `
      <article class="row${rowCls}" data-id="${escapeAttr(d.id)}">
        <div class="row-main"><div class="lineage">${trail}</div></div>
        <p class="row-what">${escapeHtml(d.what || "")}</p>
        <div class="row-meta">
          <span class="cat">${escapeHtml(d.category || "")}</span>
          ${badge}
          ${odds}
          ${src}
          <button class="row-act" data-act="link" title="Copy a link to this entry">link</button>
          <button class="row-act" data-act="card" title="Copy a shareable blurb (paste into Slack)">copy card</button>
          <span class="date">${dateText}</span>
        </div>
        ${note}
      </article>`;
  }

  // A deadpan, entirely-made-up odds badge. Deterministic per entry (hashed id)
  // so it doesn't flicker between renders — and clearly labeled as a joke.
  function oddsBadge(d) {
    const pct = 20 + (hashStr(d.id) % 61); // 20–80%
    const yr = new Date().getFullYear() + 1 + (hashStr(d.id + "y") % 2); // next 1–2 yrs
    return `<span class="odds" title="Not a real forecast. We made this number up.">${pct}% chance of another name by ${yr}</span>`;
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  // A feature renders just its current name, clickable to copy a "yes, that's real" line.
  function featureTrail(d, q) {
    const when = d.introducedAt ? escapeAttr(d.introducedAt) : "";
    return `<span class="current feature-name" data-name="${escapeAttr(d.name)}" data-feature="1" data-when="${when}" title="click to copy">${highlight(d.name, q)}</span>`;
  }

  // A rename renders its full lineage trail, ending in the clickable current name.
  // A malformed entry (no lineage) degrades to just its current name — one bad row
  // must never take the whole render down.
  function renameTrail(d, q) {
    const steps = Array.isArray(d.lineage) && d.lineage.length ? d.lineage : null;
    if (!steps) {
      const name = d.current || d.name || d.id;
      return `<span class="current" data-name="${escapeAttr(name)}" title="click to copy a correction">${highlight(name, q)}</span>`;
    }
    const chain = steps.map((step, i) => {
      const isLast = i === steps.length - 1;
      const name = highlight(step.name, q);
      const abbr = step.abbr ? ` (${highlight(step.abbr, q)})` : "";
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
    const old = `<span class="old dep-name">${highlight(d.name, q)}${removedYr}</span>`;
    if (d.replacement) {
      const rep = `<span class="current" data-name="${escapeAttr(d.replacement)}" data-old="${escapeAttr(d.name)}" data-dep="1" title="click to copy a correction">${highlight(d.replacement, q)}</span>`;
      const repLink = d.replacementId && DATA.some((x) => x.id === d.replacementId)
        ? ` <a class="rep-link" href="#${escapeAttr(encodeURIComponent(d.replacementId))}" title="Open the successor's entry">entry ↗</a>`
        : "";
      return `${old} <span class="arrow">→</span> ${rep}${repLink}`;
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
        focusId = null;
        activeYear = null;
        setActiveNav(null);
        const cat = chip.dataset.cat;
        activeCategory = activeCategory === cat ? null : cat;
        chipsEl.querySelectorAll(".chip").forEach((c) =>
          c.classList.toggle("active", c.dataset.cat === activeCategory)
        );
        writeURL();
        render();
      });
    });
  }

  function renderCounter() {
    const el = $("#counter-text");
    if (!el) return;
    // days since the most recent change (rename or deprecation) anywhere in the dataset
    const latest = DATA
      .map(changedAt)
      .filter(Boolean)
      .sort((a, b) => dateKey(a).localeCompare(dateKey(b)))
      .pop();
    const days = daysSince(latest);
    if (days == null) {
      el.textContent = "change date unknown";
      return;
    }
    el.innerHTML = `<b>${days}</b> day${days === 1 ? "" : "s"} since the last change`;
  }

  // The footer's freshness line comes from the data itself: the newest `verified` date.
  function renderFooterLine() {
    const el = $("#footer-line");
    if (!el) return;
    const latest = DATA.map((d) => d.verified).filter(Boolean).sort().pop();
    if (latest) {
      el.textContent = `Accurate as of ${latest} — the last time we checked. Given the subject, it may already be wrong.`;
    }
  }

  // ---- interactions ----
  function wireStaticControls() {
    searchEl.addEventListener("input", () => {
      activeSection = null; // manual typing clears any rail-section filter
      focusId = null;
      activeYear = null;
      setActiveNav(null);
      writeURL();
      render();
    });

    // Back/forward and pasted-in-place links.
    window.addEventListener("hashchange", () => { applyRoute(); render(); });

    // Quiz overlay controls.
    const quizOpen = $("#quiz-open");
    if (quizOpen) quizOpen.addEventListener("click", openQuiz);
    const quizClose = $("#quiz-close");
    if (quizClose) quizClose.addEventListener("click", closeQuiz);
    const quizEl = $("#quiz");
    if (quizEl) quizEl.addEventListener("click", (e) => { if (e.target === quizEl) closeQuiz(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && quizEl && !quizEl.hidden) closeQuiz();
    });
    // Keep Tab inside the dialog while it's open (it's aria-modal).
    if (quizEl) quizEl.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(quizEl.querySelectorAll("button:not(:disabled)"))
        .filter((b) => !b.hidden && b.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    const rouletteBtn = $("#roulette");
    if (rouletteBtn) rouletteBtn.addEventListener("click", roulette);

    const sideNew = $("#side-new");
    if (sideNew) sideNew.addEventListener("click", goHome);

    const themeToggle = $("#theme-toggle");
    if (themeToggle) themeToggle.addEventListener("click", () => {
      const root = document.documentElement;
      const cur = root.dataset.theme || "light";
      const next = cur === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("rebricked-theme", next); } catch (e) {}
    });

    // Mobile: the hamburger opens the rail; the scrim, a nav pick, or Escape closes it.
    const menuBtn = $("#menu-toggle");
    if (menuBtn) menuBtn.addEventListener("click", () => {
      const sb = document.querySelector(".sidebar");
      setSidebarOpen(!(sb && sb.classList.contains("open")));
    });
    const scrim = $("#scrim");
    if (scrim) scrim.addEventListener("click", () => setSidebarOpen(false));
    document.addEventListener("keydown", (e) => {
      const sb = document.querySelector(".sidebar");
      if (e.key === "Escape" && sb && sb.classList.contains("open")) setSidebarOpen(false);
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
    // per-card actions: deep link + shareable blurb
    resultsEl.querySelectorAll(".row-act").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".row");
        const d = DATA.find((x) => x.id === row.dataset.id);
        if (!d) return;
        if (btn.dataset.act === "link") {
          const url = entryURL(d.id);
          copy(url).then((ok) =>
            toast(ok ? `Link copied — ${url}` : "Copy failed — select it manually.")
          );
        } else {
          const blurb = cardBlurb(d);
          copy(blurb).then((ok) =>
            toast(ok ? "Card copied — paste it into Slack." : "Copy failed — select it manually.")
          );
        }
      });
    });

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
    focusId = null;
    activeYear = null;
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
        // The roulette shows the full list, so the URL must reflect that state —
        // writing the entry hash here would reload into a different (focused) view.
        writeURL();
        brickConfetti();
      }
    };
    spin();
  }

  // ---- quiz: "guess the current name" ----
  const QUIZ_LEN = 5; // questions per round
  const quizState = { score: 0, total: 0, streak: 0, answered: false, asked: [], lastId: null };
  let quizReturnFocus = null; // element to restore focus to when the dialog closes

  // Entries that pose a fair "what's it called now?" question: renames (old → current)
  // and deprecations with a named replacement.
  function quizPool() {
    return DATA.filter((d) => {
      const k = kindOf(d);
      if (k === "rename") return d.lineage && d.lineage.length >= 2 && d.current;
      if (k === "deprecation") return !!d.replacement;
      return false;
    });
  }

  function quizPrompt(d) {
    if (kindOf(d) === "deprecation") return d.name;
    return d.lineage && d.lineage[0] ? d.lineage[0].name : d.current;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function openQuiz() {
    const el = $("#quiz");
    if (!el) return;
    quizState.score = 0;
    quizState.total = 0;
    quizState.streak = 0;
    quizState.asked = [];
    quizState.lastId = null;
    el.hidden = false;
    document.body.classList.add("modal-open");
    quizReturnFocus = document.activeElement;
    const closeBtn = $("#quiz-close");
    if (closeBtn) closeBtn.focus();
    const share = $("#quiz-share");
    if (share) {
      share.hidden = true;
      if (!share.dataset.wired) {
        share.dataset.wired = "1";
        share.addEventListener("click", shareQuizLinkedIn);
      }
    }
    nextQuestion();
  }

  // LinkedIn's share dialog only accepts a URL (it scrapes the page's OG tags — it
  // no longer honors prefilled text). So we copy a ready-to-paste brag to the
  // clipboard first, then open the composer for the user to paste into.
  // A link that carries the score, so whoever opens it sees a "beat this" banner.
  function quizResultURL() {
    return (
      location.origin +
      location.pathname +
      "?quiz=" +
      quizState.score +
      "-" +
      quizState.total
    );
  }

  function shareQuizLinkedIn() {
    const pct = quizState.total
      ? Math.round((quizState.score / quizState.total) * 100)
      : 0;
    const link = quizResultURL();
    const text =
      `I scored ${quizState.score}/${quizState.total} (${pct}%) on Rebricked — the quiz for ` +
      `whether you can keep up with everything Databricks has renamed. Think you can beat me? ${link}`;
    const shareUrl =
      "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link);
    copy(text).then((ok) => {
      toast(ok ? "Score copied — paste it into your LinkedIn post." : "Opening LinkedIn…");
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    });
  }

  // If the page was opened from a shared ?quiz=score-total link, show the challenge.
  function renderChallenge() {
    const el = $("#challenge");
    if (!el) return;
    const raw = new URLSearchParams(location.search).get("quiz");
    const m = raw && /^(\d+)-(\d+)$/.exec(raw);
    if (!m) { el.hidden = true; return; }
    const score = Number(m[1]);
    const total = Number(m[2]);
    if (!total || total > 999 || score > total) { el.hidden = true; return; }
    const pct = Math.round((score / total) * 100);
    el.innerHTML =
      `<span class="ch-badge">Challenge</span>` +
      `<span class="ch-text">Someone scored <b>${score}/${total}</b> (${pct}%) on the quiz — think you can beat them?</span>` +
      `<button class="ch-btn" id="ch-take">Take the quiz</button>`;
    el.hidden = false;
    const btn = $("#ch-take");
    if (btn) btn.addEventListener("click", openQuiz);
  }

  function closeQuiz() {
    const el = $("#quiz");
    if (!el) return;
    el.hidden = true;
    document.body.classList.remove("modal-open");
    if (quizReturnFocus && document.body.contains(quizReturnFocus)) quizReturnFocus.focus();
    quizReturnFocus = null;
  }

  function updateQuizScore() {
    const s = $("#quiz-score");
    if (s) s.textContent = `Score ${quizState.score} / ${quizState.total}`;
    const st = $("#quiz-streak");
    if (st) st.textContent = quizState.streak >= 2 ? `🔥 ${quizState.streak} in a row` : "";
    const share = $("#quiz-share");
    if (share) share.hidden = quizState.total === 0;
  }

  function nextQuestion() {
    const body = $("#quiz-body");
    const pool = quizPool();
    if (!body || pool.length < 4) {
      if (body) body.innerHTML = `<p class="quiz-msg">Not enough data to build a quiz yet.</p>`;
      return;
    }
    // A round is exactly QUIZ_LEN questions — after the last answer, show results.
    if (quizState.total >= QUIZ_LEN) {
      finishQuiz();
      return;
    }
    quizState.answered = false;
    updateQuizScore();

    // Cycle through the pool without repeats; once every entry has been asked,
    // start a fresh pass but never repeat the question we just showed.
    let candidates = pool.filter((d) => !quizState.asked.includes(d.id));
    if (candidates.length === 0) {
      quizState.asked = [];
      candidates = pool.filter((d) => d.id !== quizState.lastId);
      if (candidates.length === 0) candidates = pool;
    }
    const correct = candidates[Math.floor(Math.random() * candidates.length)];
    quizState.asked.push(correct.id);
    quizState.lastId = correct.id;
    const answer = currentNameOf(correct);
    // Distractors come from the whole dataset (features included), not just the
    // question pool, so there are always enough distinct names for 4 options.
    const distractors = shuffle(
      DATA.map(currentNameOf).filter((n) => n && n !== answer && !n.startsWith("("))
    );
    const seen = new Set([answer]);
    const options = [answer];
    for (const n of distractors) {
      if (options.length >= 4) break;
      if (!seen.has(n)) { seen.add(n); options.push(n); }
    }
    const choices = shuffle(options);

    body.innerHTML =
      `<p class="quiz-progress">Question ${quizState.total + 1} of ${QUIZ_LEN}</p>` +
      `<p class="quiz-q">What is <b>“${escapeHtml(quizPrompt(correct))}”</b> called now?</p>` +
      `<div class="quiz-opts">` +
      choices
        .map(
          (c) =>
            `<button class="quiz-opt" data-name="${escapeAttr(c)}">${escapeHtml(c)}</button>`
        )
        .join("") +
      `</div>` +
      `<div class="quiz-foot" id="quiz-foot"></div>`;

    body.querySelectorAll(".quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => answerQuestion(btn, answer, correct));
    });
  }

  function answerQuestion(btn, answer, entry) {
    if (quizState.answered) return;
    quizState.answered = true;
    quizState.total++;
    const opts = $("#quiz-body").querySelectorAll(".quiz-opt");
    const chosen = btn.dataset.name;
    const right = chosen === answer;
    if (right) { quizState.score++; quizState.streak++; }
    else { quizState.streak = 0; }

    opts.forEach((o) => {
      o.disabled = true;
      if (o.dataset.name === answer) o.classList.add("correct");
      else if (o === btn) o.classList.add("wrong");
    });
    updateQuizScore();

    const foot = $("#quiz-foot");
    if (foot) {
      const verdict = right
        ? `<span class="quiz-ok">Correct.</span>`
        : `<span class="quiz-no">Nope — it's “${escapeHtml(answer)}”.</span>`;
      const done = quizState.total >= QUIZ_LEN;
      foot.innerHTML =
        `<p class="quiz-expl">${verdict} ${escapeHtml(entry.what || "")}</p>` +
        `<div class="quiz-actions">` +
        `<button class="quiz-see" data-id="${escapeAttr(entry.id)}">see the entry ↗</button>` +
        `<button class="quiz-next">${done ? "See results" : "Next →"}</button>` +
        `</div>`;
      const next = foot.querySelector(".quiz-next");
      if (next) next.addEventListener("click", nextQuestion);
      const see = foot.querySelector(".quiz-see");
      if (see) see.addEventListener("click", () => { closeQuiz(); focusEntry(see.dataset.id); });
    }
  }

  function finishQuiz() {
    const body = $("#quiz-body");
    if (!body) return;
    const pct = Math.round((quizState.score / QUIZ_LEN) * 100);
    let verdict;
    if (pct === 100) verdict = "Flawless. You've been reading the release notes.";
    else if (pct >= 60) verdict = "Not bad — you mostly kept up with the renaming.";
    else if (pct >= 20) verdict = "Rough. In fairness, so is keeping track of this.";
    else verdict = "It's fine. Everything got renamed since you last looked anyway.";

    body.innerHTML =
      `<div class="quiz-result">` +
      `<p class="quiz-final">You scored <b>${quizState.score} / ${QUIZ_LEN}</b> <span class="quiz-pct">(${pct}%)</span></p>` +
      `<p class="quiz-verdict">${escapeHtml(verdict)}</p>` +
      `<div class="quiz-actions">` +
      `<button class="quiz-see" id="quiz-again">Play again</button>` +
      `<button class="quiz-next" id="quiz-done">Done</button>` +
      `</div>` +
      `</div>`;
    const again = $("#quiz-again");
    if (again) again.addEventListener("click", () => {
      quizState.score = 0;
      quizState.total = 0;
      quizState.streak = 0;
      quizState.asked = [];
      quizState.lastId = null;
      nextQuestion();
    });
    const done = $("#quiz-done");
    if (done) done.addEventListener("click", closeQuiz);
  }

  // ---- deep links / routing ----
  // #<id> opens one entry on its own; the query string carries everything else:
  // ?q=<search>, ?s=<rail section>, ?cat=<category>, ?kind=<filter>, ?year=<year>.
  function applyRoute() {
    const hash = decodeURIComponent((location.hash || "").replace(/^#/, "")).trim();
    if (hash && DATA.some((d) => d.id === hash)) {
      focusEntry(hash, { push: false });
      return;
    }
    // No (valid) hash — make sure we're not stuck focused on a stale entry.
    focusId = null;
    const params = new URLSearchParams(location.search);
    const q = (params.get("q") || "").trim();
    if (q) {
      searchEl.value = q;
      activeSection = null;
      setActiveNav(null);
    }
    const s = params.get("s");
    if (s) {
      const item = NAV.flatMap((g) => g.items).find((it) => it.label === s && it.ids);
      if (item) {
        activeSection = { label: item.label, ids: item.ids };
        document.querySelectorAll(".nav-item").forEach((n) => {
          const lbl = n.querySelector(".label");
          n.classList.toggle("active", !!lbl && lbl.textContent === s);
        });
      }
    }
    const cat = params.get("cat");
    if (cat && DATA.some((d) => d.category === cat)) {
      activeCategory = cat;
      chipsEl.querySelectorAll(".chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.cat === cat)
      );
    }
    const kind = params.get("kind");
    if (kind && FILTERS.some((f) => f.key === kind)) {
      activeKind = kind;
      syncFilterButtons();
    }
    const year = params.get("year");
    if (year && /^\d{4}$/.test(year)) activeYear = year;
  }

  function focusEntry(id, { push = true } = {}) {
    focusId = id;
    activeSection = null;
    activeCategory = null;
    activeYear = null;
    activeKind = "all";
    searchEl.value = "";
    setActiveNav(null);
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    if (push) writeURL();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Reflect current state into the address bar without spamming history.
  // Everything applyRoute() can read must be written here, or views stop being shareable.
  function writeURL() {
    let url = location.pathname;
    if (focusId) {
      url += "#" + encodeURIComponent(focusId);
    } else {
      const params = new URLSearchParams();
      const q = searchEl.value.trim();
      if (q) params.set("q", q);
      if (activeSection) params.set("s", activeSection.label);
      if (activeCategory) params.set("cat", activeCategory);
      if (activeKind !== "all") params.set("kind", activeKind);
      if (activeYear) params.set("year", activeYear);
      const qs = params.toString();
      if (qs) url += "?" + qs;
    }
    try { history.replaceState(null, "", url); } catch (e) {}
  }

  function entryURL(id) {
    return location.origin + location.pathname + "#" + encodeURIComponent(id);
  }

  function currentNameOf(d) {
    const kind = kindOf(d);
    if (kind === "feature") return d.name;
    if (kind === "deprecation") return d.replacement || "(retired — no successor)";
    return d.current;
  }

  // A tidy multi-line blurb for pasting into Slack / chat.
  function cardBlurb(d) {
    const kind = kindOf(d);
    const link = entryURL(d.id);
    if (kind === "feature") {
      return `🧱 "${d.name}" — new in Databricks (${d.introducedAt || "?"}).\n${d.what || ""}\n${link}`;
    }
    if (kind === "deprecation") {
      const successor = d.replacement
        ? `use "${d.replacement}" now`
        : "retired, no direct replacement";
      return `🧱 "${d.name}" is deprecated — ${successor}.\n${d.what || ""}\n${link}`;
    }
    const first = d.lineage && d.lineage[0] ? d.lineage[0].name : d.current;
    return `🧱 It's not called "${first}" anymore — it's "${d.current}" now (renamed ${d.renamedAt || "?"}).\n${d.what || ""}\n${link}`;
  }

  // ---- year timeline (Home) ----
  function renderTimeline() {
    const el = $("#timeline");
    if (!el) return;
    const counts = {};
    DATA.forEach((d) => {
      const y = shortYear(changedAt(d));
      if (y) counts[y] = (counts[y] || 0) + 1;
    });
    const years = Object.keys(counts).sort();
    if (years.length === 0) { el.hidden = true; return; }
    const max = Math.max(...years.map((y) => counts[y]));
    const bars = years
      .map((y) => {
        const n = counts[y];
        const h = Math.round((n / max) * 100);
        return `<button class="tl-bar" data-year="${escapeAttr(y)}" style="--h:${h}%" title="${n} change${n === 1 ? "" : "s"} in ${escapeHtml(y)}"><span class="tl-h"></span><span class="tl-n">${n}</span><span class="tl-y">'${escapeHtml(y.slice(2))}</span></button>`;
      })
      .join("");
    el.innerHTML =
      `<div class="tl-title">The renaming, by year <span class="tl-hint">— click a bar to filter</span></div>` +
      `<div class="tl-bars">${bars}</div>`;
    el.querySelectorAll(".tl-bar").forEach((b) => {
      b.addEventListener("click", () => {
        const y = b.dataset.year;
        // toggle off if the same year is clicked again
        activeYear = activeYear === y ? null : y;
        focusId = null;
        activeSection = null;
        activeCategory = null;
        searchEl.value = "";
        setActiveNav(null);
        chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        writeURL();
        render();
      });
    });
  }

  // ---- "on this day" spotlight (Home) ----
  function renderSpotlight() {
    const el = $("#spotlight");
    if (!el) return;
    const now = new Date();
    const thisMonth = String(now.getMonth() + 1).padStart(2, "0");
    // Prefer a change whose month matches this month; else the most recent one.
    const dated = DATA.filter((d) => changedAt(d));
    let pick =
      dated.find((d) => (changedAt(d).split("-")[1] || "") === thisMonth) ||
      dated.slice().sort((a, b) => dateKey(changedAt(b)).localeCompare(dateKey(changedAt(a))))[0];
    if (!pick) { el.hidden = true; return; }

    const when = changedAt(pick);
    const yr = Number(shortYear(when));
    const yearsAgo = now.getFullYear() - yr;
    const ago =
      yearsAgo <= 0 ? "this year" : `${yearsAgo} year${yearsAgo === 1 ? "" : "s"} ago`;
    const kind = kindOf(pick);
    const verb =
      kind === "feature" ? "shipped" : kind === "deprecation" ? "deprecated" : "renamed";
    el.innerHTML =
      `<span class="sp-tag">On this month</span>` +
      `<span class="sp-text"><b>${escapeHtml(currentNameOf(pick))}</b> was ${verb} <b>${ago}</b> (${escapeHtml(when)}). ` +
      `<button class="sp-link" data-id="${escapeAttr(pick.id)}">see it →</button></span>`;
    const link = el.querySelector(".sp-link");
    if (link) link.addEventListener("click", () => focusEntry(link.dataset.id));
  }

  // ---- brick confetti (roulette landing) ----
  function brickConfetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    for (let i = 0; i < 18; i++) {
      const b = document.createElement("span");
      b.className = "brick";
      b.textContent = "🧱";
      b.style.left = Math.random() * 100 + "vw";
      b.style.animationDelay = (Math.random() * 0.35).toFixed(2) + "s";
      b.style.animationDuration = (1.1 + Math.random() * 0.9).toFixed(2) + "s";
      b.style.fontSize = (14 + Math.random() * 16).toFixed(0) + "px";
      layer.appendChild(b);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 2400);
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

  // Mixed-precision dates ("2025" vs "2025-06") don't compare lexicographically —
  // "2025" < "2025-01" would make year-only entries the oldest in their year.
  // Treat a bare year as mid-year for comparison purposes only (display stays raw).
  function dateKey(s) {
    return s && s.length === 4 ? s + "-06" : (s || "");
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

  // Takes RAW text, matches on it, and escapes each piece separately — matching on
  // escaped text would let a search for "amp" land inside an "&amp;" entity.
  function highlight(text, q) {
    const s = String(text ?? "");
    if (!q) return escapeHtml(s);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let re;
    try {
      re = new RegExp(safe, "gi");
    } catch (e) {
      return escapeHtml(s);
    }
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m[0] === "") { re.lastIndex++; continue; }
      out += escapeHtml(s.slice(last, m.index)) + `<mark>${escapeHtml(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    return out + escapeHtml(s.slice(last));
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
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
})();
