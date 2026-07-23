(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const resultsEl = $("#results");
  const searchEl = $("#search");
  // Chips row was removed from the DOM; fall back to a detached element so the
  // (now inert) chip queries elsewhere stay harmless instead of throwing on null.
  const chipsEl = $("#chips") || document.createElement("div");
  const toastEl = $("#toast");

  // Umami custom events. No-op if the analytics script is blocked, absent, or not yet
  // loaded - tracking must never affect the app, so every call is guarded.
  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) {}
  }

  let DATA = [];
  let activeCategory = null;
  let activeSection = null; // {label, ids} when a rail section is selected
  // Multi-select status filter, keyed on the badge a card shows (see bucketOf), not on
  // kindOf. "All" is derived: it's active exactly when all three buckets are selected.
  // Toggling any bucket off deselects "All" too.
  const KIND_KEYS = ["current", "deprecation", "renamed"];
  let activeKinds = new Set(KIND_KEYS);
  const allKindsSelected = () => KIND_KEYS.every((k) => activeKinds.has(k));
  const filterOn = (key) => (key === "all" ? allKindsSelected() : activeKinds.has(key));
  const resetKinds = () => { activeKinds = new Set(KIND_KEYS); };
  let activeYear = null;    // "2025" etc. when a timeline bar is selected
  let tlView = "year";      // which lens the Home chart shows: "year" (changes over time) or "stage" (current release maturity)
  let focusId = null;       // a deep-linked entry (#id / ?id=): sets its crawlable meta and gets scrolled to
  let lastRouletteId = null; // last randomizer winner, to avoid picking it twice running

  // Rotated on each empty render so the deadpan doesn't get stale.
  const EMPTY_LINES = [
    "Either it was never renamed,<br>or it was renamed to something you haven't heard yet.",
    "Nothing here. Check back after the next summit keynote.",
    "No matches. It may have been renamed to a synonym of the word you typed.",
    "Zero results - which, for Databricks, is statistically surprising.",
    "Couldn't find it. Try the old name. Or the older name. Or the oldest name.",
  ];
  let emptyIdx = 0;

  // Inline SVGs for the card action toolbar. Stroke-based to match the app's icon
  // set; LinkedIn is its filled brand glyph (like the GitHub mark in the footer).
  const ICON = {
    link:
      '<svg viewBox="0 0 24 24" width="15" height="15" class="ic" aria-hidden="true">' +
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.72 1.71" />' +
      '<path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.71-1.71" /></svg>',
    source:
      '<svg viewBox="0 0 24 24" width="15" height="15" class="ic" aria-hidden="true">' +
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />' +
      '<path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" width="15" height="15" class="gh-icon" aria-hidden="true">' +
      '<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z" /></svg>',
  };

  // The status filter (top of results). Orthogonal to section/category/search.
  // Keys match the buckets bucketOf() returns and the badges the cards show.
  const FILTERS = [
    { key: "current", label: "Latest", hint: "In use now - new, preview and current names" },
    { key: "deprecation", label: "Legacy", hint: "Deprecated or retired" },
    { key: "renamed", label: "Renamed", hint: "Superseded former names" },
  ];

  // Status sort order within a year, and the order the filter buttons render in:
  // Active first, then Legacy, then Renamed. Keys match bucketOf().
  const BUCKET_ORDER = { current: 0, deprecation: 1, renamed: 2 };

  // ---- sidebar config: mirrors the Databricks console rail ----
  // Every item is clickable. `ids` lists the databricks.features.json entries that changed under
  // that section; those items get a dot. Sections with no renames show an empty state.
  // Home clears the filter and shows everything.
  const NAV = [
    { label: "", items: [
      { label: "Home", icon: "home", home: true },
      { label: "Learn", icon: "learn" },
      { label: "Workspace", icon: "workspace", ids: ["git-folders", "databricks-repos", "legacy-databricks-cli", "databricks-cli", "serverless-workspaces", "personal-access-tokens", "oauth-token-federation", "legacy-databricks-connect", "databricks-connect", "mission-critical", "lakebridge-agentic-converter"] },
      { label: "Recents", icon: "recents" },
      { label: "Catalog", icon: "catalog", ids: ["catalog-explorer", "data-explorer", "unity-catalog", "unity-catalog-volumes", "secrets-in-unity-catalog", "dbfs-mounts", "lakehouse-federation", "opensharing", "delta-sharing", "secureconnect", "delta-lake", "databricks-delta", "liquid-clustering", "hive-metastore", "attribute-based-access-control", "unity-catalog-managed-iceberg-tables", "managed-iceberg-materialized-views", "databricks-clean-rooms"] },
      { label: "Jobs & Pipelines", icon: "jobs", ids: ["lakeflow-declarative-pipelines", "delta-live-tables", "lakeflow-jobs", "workflows", "declarative-automation-bundles", "databricks-asset-bundles", "dbx", "lakeflow-pipelines-editor", "multi-file-editor", "standalone-pipelines"] },
      { label: "Compute", icon: "compute", ids: ["lakebase", "ai-runtime", "lakehouse-replay", "standard-and-dedicated-access-modes", "shared-single-user-access-modes", "no-isolation-shared-access-mode", "init-scripts-on-dbfs"] },
      { label: "Discover", icon: "discover", ids: ["discover"] },
      { label: "Marketplace", icon: "marketplace" },
      { label: "Apps", icon: "apps", ids: ["databricks-apps"] },
    ]},
    { label: "SQL", items: [
      { label: "SQL Editor", icon: "sqlEditor", ids: ["databricks-sql", "sql-analytics", "legacy-sql-editor", "new-sql-editor"] },
      { label: "Queries", icon: "queries" },
      { label: "Dashboards", icon: "dashboards", ids: ["ai-bi-dashboards", "lakeview-dashboards", "legacy-dashboards", "databricks-sql-dashboards"] },
      { label: "Genie Agents", icon: "genie", ids: ["genie-agents", "genie-spaces", "genie-one", "genie", "databricks-one", "genie-code", "databricks-assistant"] },
      { label: "Alerts", icon: "alerts", ids: ["legacy-sql-alerts", "databricks-sql-alerts"] },
      { label: "Query History", icon: "history" },
      { label: "SQL Warehouses", icon: "warehouse", ids: ["sql-warehouse", "sql-endpoint", "databricks-odbc-driver", "simba-spark-odbc-driver", "lakehouse-real-time"] },
    ]},
    { label: "Data Engineering", items: [
      { label: "Runs", icon: "runs" },
      { label: "Data Ingestion", icon: "ingestion" },
      { label: "Visual Data Prep", icon: "dataprep", ids: ["lakeflow-designer"] },
    ]},
    { label: "AI/ML", items: [
      { label: "Playground", icon: "playground" },
      { label: "Agents", icon: "agents", ids: ["databricks-ai-search", "databricks-vector-search", "mosaic-ai-vector-search", "agent-bricks", "information-extraction", "knowledge-assistant", "classification", "custom-llm", "supervisor-agent", "agent-bricks-multi-agent-supervisor"] },
      { label: "AI Gateway", icon: "gateway", ids: ["ai-gateway"] },
      { label: "Experiments", icon: "experiments" },
      { label: "Features", icon: "features", ids: ["workspace-feature-store", "feature-engineering-in-unity-catalog", "declarative-feature-engineering"] },
      { label: "Models", icon: "models", ids: ["workspace-model-registry", "models-in-unity-catalog"] },
      { label: "Serving", icon: "serving", ids: ["model-serving", "serverless-real-time-inference"] },
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
    apps: '<circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
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
    // Badge pages return here with this flag so their CTA behaves exactly like the
    // in-app quiz button, rather than merely landing on the catalogue.
    if (new URLSearchParams(location.search).get("startQuiz") === "1") {
      const url = new URL(location.href);
      url.searchParams.delete("startQuiz");
      try { history.replaceState(null, "", url.pathname + url.search + url.hash); } catch (e) {}
      openQuiz();
      return;
    }
    if (!focusId) searchEl.focus();
  }

  // Rows in the current section/category/search scope, before the kind & year
  // filters. The kind-filter counts and the main list both start from this pool,
  // so the counts always reflect the active sidebar section (or category/search).
  function contextRows() {
    if (activeSection) {
      const ids = activeSection.ids;
      return DATA.filter((d) => ids.includes(d.id));
    }
    let rows = DATA.slice();
    if (activeCategory) rows = rows.filter((d) => d.category === activeCategory);
    const q = searchEl.value.trim().toLowerCase();
    if (q) rows = rows.filter((d) => haystack(d).includes(q));
    return rows;
  }

  // ---- status filter (Active / Renamed / Deprecated) ----
  function renderFilters() {
    const el = $("#filters");
    if (!el) return;
    el.innerHTML = FILTERS.map((f) => {
      const title = f.hint ? ` title="${escapeAttr(f.hint)}"` : "";
      return `<button class="filter" data-kind="${escapeAttr(f.key)}"${title} aria-pressed="false">${escapeHtml(f.label)}<span class="filter-count">0</span></button>`;
    }).join("");
    el.querySelectorAll(".filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.kind;
        if (activeKinds.has(key)) {
          activeKinds.delete(key);
        } else {
          activeKinds.add(key);
        }
        focusId = null; // a deliberate filter leaves the deep-linked entry's focus
        track("filter-toggle", { filter: key, on: activeKinds.has(key) });
        writeURL();
        render();
      });
    });
    updateFilterCounts();
  }

  // Refresh each filter button's count (scoped to the active section/category/
  // search) and its active/pressed state.
  function updateFilterCounts() {
    const el = $("#filters");
    if (!el) return;
    const pool = contextRows();
    el.querySelectorAll(".filter").forEach((b) => {
      const key = b.dataset.kind;
      const span = b.querySelector(".filter-count");
      if (span) span.textContent = pool.filter((d) => bucketOf(d) === key).length;
      const on = filterOn(key);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
  }

  function syncFilterButtons() {
    const el = $("#filters");
    if (!el) return;
    el.querySelectorAll(".filter").forEach((b) => {
      const on = filterOn(b.dataset.kind);
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
        setSidebarOpen(false); // on mobile the rail overlays the content - close it after a pick
        if (el.dataset.home !== undefined) {
          track("nav", { section: "Home" });
          goHome();
        } else {
          const label = el.querySelector(".label").textContent;
          const ids = (el.dataset.ids || "").split(",").filter(Boolean);
          track("nav", { section: label });
          setSection(label, ids);
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
    scrollToFilters();
  }

  function goHome() {
    activeSection = null;
    focusId = null;
    activeYear = null;
    searchEl.value = "";
    activeCategory = null;
    resetKinds();
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    writeURL();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadData() {
    // Primary source of truth. On GitHub Pages / any http(s) server this just works.
    const res = await fetch("databricks.features.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response " + res.status);
    return res.json();
  }

  // ---- document metadata (title + description) ----
  // Deep-linked entries (?id=/#id) are the shareable, crawlable URLs, so give each its
  // own <title> and description; the list view falls back to the page defaults.
  const DEFAULT_TITLE = document.title;
  const DEFAULT_DESC = (document.querySelector('meta[name="description"]') || {}).content || "";
  function setMeta(title, desc) {
    document.title = title;
    const m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute("content", desc);
  }
  function entryMeta(entry) {
    const succ = entry.successorId && DATA.find((d) => d.id === entry.successorId);
    const title = (succ ? entry.name + " -> " + succ.name : entry.name) + " - REbricked";
    const desc = (whatNote(entry) || factNote(entry) || "").trim();
    setMeta(title, desc || DEFAULT_DESC);
  }

  // ---- rendering ----
  function render() {
    // A deep-linked entry (#id / ?id=) gets its own crawlable <title>/description, but
    // it still renders inside the full list - focusEntry() scrolls to and flashes the
    // card rather than collapsing the page down to that single entry.
    const focused = focusId ? DATA.find((d) => d.id === focusId) : null;
    if (focusId && !focused) focusId = null; // unknown id - treat as the plain list
    if (focused) entryMeta(focused);
    else setMeta(DEFAULT_TITLE, DEFAULT_DESC);

    // The kind-filter counts must track this same scope, so update them now.
    updateFilterCounts();

    const q = searchEl.value.trim().toLowerCase();
    let rows = contextRows();

    // The status filter is orthogonal - it narrows whatever's showing.
    if (!allKindsSelected()) {
      rows = rows.filter((d) => activeKinds.has(bucketOf(d)));
    }

    // The timeline year filter is likewise orthogonal.
    if (activeYear) {
      rows = rows.filter((d) => shortYear(changedAt(d)) === activeYear);
    }

    // Newest year on top; within a year, order by status - Active, then Legacy, then
    // Renamed (matching the filter buttons) - and by most recent change inside each.
    rows.sort(byRecency);

    updateHomeExtras();

    if (rows.length === 0) {
      const selectedKinds = FILTERS.filter((f) => f.key !== "all" && activeKinds.has(f.key));
      const kindNote =
        !allKindsSelected() && selectedKinds.length
          ? ` matching <b>${selectedKinds.map((f) => escapeHtml(f.label)).join(", ")}</b>`
          : "";
      const yearNote = activeYear ? ` in <b>${escapeHtml(activeYear)}</b>` : "";
      const line = EMPTY_LINES[emptyIdx++ % EMPTY_LINES.length];
      resultsEl.innerHTML = activeSection
        ? `<div class="empty">Nothing${kindNote}${yearNote} under <b>${escapeHtml(activeSection.label)}</b> - yet.<br>Either it kept its name, or Databricks hasn't gotten to it.</div>`
        : `<p class="empty">No results${kindNote}${yearNote}. ${line}</p>`;
      return;
    }

    // Collapse each lineage family to a single card: keep only the first-sorted member of
    // each family (the rest render as its tabs), so a rename chain shows once, not once
    // per name.
    const seenFamily = new Set();
    rows = rows.filter((d) => {
      const key = lineageFamily(d).map((x) => x.id).sort().join("|");
      if (seenFamily.has(key)) return false;
      seenFamily.add(key);
      return true;
    });

    resultsEl.innerHTML = groupedByPeriod(rows, activeSection ? "" : q);
    wireRows();
  }

  // Newest year on top; within a year, order by status - Active, then Legacy, then
  // Renamed (matching the filter buttons) - and by most recent change inside each.
  function byRecency(a, b) {
    const ya = shortYear(changedAt(a));
    const yb = shortYear(changedAt(b));
    if (ya !== yb) return yb.localeCompare(ya);
    const ra = BUCKET_ORDER[bucketOf(a)] ?? 9;
    const rb = BUCKET_ORDER[bucketOf(b)] ?? 9;
    if (ra !== rb) return ra - rb;
    return dateKey(changedAt(b)).localeCompare(dateKey(changedAt(a)));
  }

  // The full lineage family of an entry: every predecessor, the entry itself, and
  // every successor, as one de-duplicated set. Focusing an entry shows this whole
  // set together so the chain nodes have real sibling cards to scroll to.
  function lineageFamily(d) {
    const seen = new Set();
    const out = [];
    [...predecessorsOf(d), d, ...successorsOf(d)].forEach((x) => {
      if (x && !seen.has(x.id)) {
        seen.add(x.id);
        out.push(x);
      }
    });
    return out.sort(byRecency);
  }

  // Group key + label for the chronological dividers: the year of the change.
  function periodOf(d) {
    const y = shortYear(changedAt(d));
    return { key: y || "-", label: y || "undated" };
  }

  // The list is already sorted newest-change-first, so walking it top-to-bottom and
  // emitting a divider each time the year flips groups the cards into a chronological
  // path - one dated section per year, newest at the top.
  function groupedByPeriod(rows, q) {
    const counts = {};
    rows.forEach((d) => {
      const { key } = periodOf(d);
      counts[key] = (counts[key] || 0) + 1;
    });
    let last = null;
    return rows
      .map((d) => {
        const { key, label } = periodOf(d);
        let sep = "";
        if (key !== last) {
          last = key;
          sep = periodSepHTML(label, counts[key]);
        }
        return sep + rowHTML(d, q);
      })
      .join("");
  }

  function periodSepHTML(label, n) {
    const count = `${n} change${n === 1 ? "" : "s"}`;
    return (
      `<div class="year-sep" role="separator" aria-label="Changed in ${escapeAttr(label)} - ${escapeAttr(count)}">` +
      `<span class="year-num">${escapeHtml(label)}</span>` +
      `<span class="year-rule"></span>` +
      `<span class="year-count">${escapeHtml(count)}</span>` +
      `</div>`
    );
  }

  // The spotlight + timeline belong to the neutral Home view; hide them the
  // moment any filter, search, section, or deep link is active.
  function isHome() {
    return (
      !focusId &&
      !activeSection &&
      !activeCategory &&
      !activeYear &&
      allKindsSelected() &&
      searchEl.value.trim() === ""
    );
  }

  function updateHomeExtras() {
    const tl = $("#timeline");
    const sp = $("#spotlight");
    // Home-ish view, ignoring the kind filter: on the main list with no entry/section/
    // category/search open. Toggling a filter must NOT hide the home extras, so neither
    // the timeline nor the spotlight keys off allKindsSelected().
    const onList = !focusId && !activeSection && !activeCategory && searchEl.value.trim() === "";
    if (tl) {
      // The timeline *is* the kind filter's view, so it must stay up even when not all
      // buckets are selected. Also visible while a year is selected.
      const visible = onList || activeYear;
      if (visible) renderTimeline();      // keep segments/heights in sync with the filter
      tl.hidden = !visible;
      tl.querySelectorAll(".tl-bar").forEach((b) =>
        b.classList.toggle("active", b.dataset.year === activeYear)
      );
    }
    // Spotlight stays up across filter toggles and year selections - anything on the
    // main list. It hides only when the user drills into an entry/section/category/search.
    if (sp) sp.hidden = !onList;
    // The quiz/badge banner and the page's intro blurb (the text under the "They changed
    // it" title) are Home invitations - once someone is actively searching, they're just
    // noise above the results, so tuck both away while a query is present. Applies on every
    // device; the "They changed it" title and the filters stay put.
    const searching = searchEl.value.trim() !== "";
    const qb = $("#quiz-banner");
    if (qb) qb.hidden = searching;
    const sub = $(".page-sub");
    if (sub) sub.hidden = searching;
  }

  // A record's lifecycle as a flow key shared by the chain arrows' colors: a
  // deprecation is amber (slate when legacy), a superseded rename is orange, everything
  // live is green.
  function flowStatusOf(x) {
    if (kindOf(x) === "deprecation") return (statusValue(x) === "legacy") ? "legacy" : "deprecated";
    if (kindOf(x) === "rename" && (statusValue(x) || "current") === "renamed") return "renamed";
    return "active";
  }

  // One family member's card body: its status badge, description, dates, fact, note,
  // and the reference/action footer. The lineage names now live in the bookmark tabs
  // above (see rowHTML); the release pill is removed for now. Returns { spine, html }.
  function memberBody(d) {
    const kind = kindOf(d);
    // `fact` is an array of up to three { note, link }, rendered as a list with a 💡 marker on
    // each item (via CSS ::before); each item carries a 🔗 to its official source.
    const factItems = factList(d);
    const fact = factItems.length
      ? `<ul class="row-fact">${factItems
          .map(
            (f) =>
              `<li class="fact-item">${escapeHtml(f.note)}${
                f.link ? " " + srcLink("", f.link, "Fun fact - source") : ""
              }</li>`
          )
          .join("")}</ul>`
      : "";
    // `occasion` is now { date, link, note } - a dated milestone with its own confirmation.
    // We render its note text (linked to the source), still accepting a bare string.
    const occObj = d.occasion && typeof d.occasion === "object" ? d.occasion : null;
    const occText = occObj ? (occObj.note || "") : (d.occasion || "");
    const occasion = occText
      ? ` · ${srcLink(occText, occObj ? (occObj.link || "") : "", "")}`
      : "";
    let dateText = "", urgent = "", spine = "";
    if (kind === "feature") {
      spine = "is-feature";
      dateText = `Introduced ${dateLinkHTML(d.introducedAt || "?")}${occasion}`;
    } else if (kind === "deprecation") {
      const status = statusValue(d) || "deprecated";
      spine = status === "legacy" ? "is-legacy" : "is-deprecation";
      const verb = status === "legacy" ? "Legacy since" : "Deprecated";
      // Lead with when it was first available/introduced so a deprecation shows its full
      // span (e.g. "Available from 2016 · Deprecated 2024"); the origin date carries its
      // confirmation link like renames do. Falls back to introducedAt if there's no `from`.
      const origin = d.from != null ? d.from : d.introducedAt;
      const intro = dateOf(origin) ? `Available from ${dateLinkHTML(origin)} · ` : "";
      dateText = `${intro}${verb} ${dateLinkHTML(d.deprecatedAt || "?")}${occasion}`;
      if (dateOf(d.removedAt)) urgent = `<span class="meta-urgent">⚠ Access ended ${dateLinkHTML(d.removedAt)}</span>`;
    } else if ((statusValue(d) || "current") === "renamed") {
      spine = "is-former";
      const fromD = dateOf(d.from), toD = dateOf(d.to);
      const span = fromD && toD
        ? `${dateLinkHTML(d.from)} – ${dateLinkHTML(d.to)}`
        : toD ? `until ${dateLinkHTML(d.to)}` : dateLinkHTML(d.from || "?");
      dateText = `In use ${span}${occasion}`;
    } else {
      spine = "is-current";
      dateText = `Current since ${dateLinkHTML(d.from || "?")}${occasion}`;
    }

    // The copy/share actions now ride the card's top-right corner (see rowHTML), and sources
    // live inline, so the body no longer has a footer.
    // Each member's body carries its own date line: "Current since / In use / Introduced …"
    // for live / former / feature members, "Deprecated …" for deprecations. (The flow-chain
    // header omits the current name's year, so the body is where that date now lives.)
    const dateHTML = dateText ? `<span class="date">${dateText}</span>` : "";
    const meta = (dateHTML || urgent)
      ? `<div class="row-meta">${dateHTML}${urgent}</div>`
      : "";
    return {
      spine,
      html: `<p class="row-what">${escapeHtml(whatNote(d))}${whatLink(d) ? " " + srcLink("", whatLink(d), "What it is - official docs") : ""}</p>${meta}${fact}${limitationsHTML(d)}`,
    };
  }

  // `what` is a required { note, link } object: the one-line description plus the official
  // doc it's drawn from. (Older data stored a bare string; tolerate it so a half-migrated
  // file still renders.) These accessors are the only spots that need to know the shape.
  function whatNote(d) {
    const w = d && d.what;
    if (w && typeof w === "object") return w.note || "";
    return typeof w === "string" ? w : "";
  }
  function whatLink(d) {
    const w = d && d.what;
    return w && typeof w === "object" && w.link ? String(w.link) : "";
  }

  // `fact` is a required array of up to three { note, link } - sourced real-but-fun one-liners
  // about this card's thing. (Older data stored a bare string; tolerate it so a half-migrated
  // file still renders.) factNote(d) is the first fact's text, used for share/meta blurbs.
  function factList(d) {
    const f = d && d.fact;
    if (Array.isArray(f))
      return f
        .filter((x) => x && x.note)
        .map((x) => ({ note: String(x.note), link: x.link ? String(x.link) : "" }));
    if (typeof f === "string" && f.trim()) return [{ note: f, link: "" }];
    return [];
  }
  function factNote(d) {
    const l = factList(d);
    return l.length ? l[0].note : "";
  }

  // `status` is a required { value, link, date } object: the lifecycle value (the sole
  // discriminator), the official doc backing it, and the date it was confirmed. (Older data
  // stored a bare string; tolerate it so a half-migrated file still renders.) statusValue is
  // the only spot the rest of the app needs; statusLink/statusDate feed the badge tooltip.
  function statusValue(d) {
    const s = d && d.status;
    if (s && typeof s === "object") return s.value || "";
    return typeof s === "string" ? s : "";
  }
  function statusLink(d) {
    const s = d && d.status;
    return s && typeof s === "object" && s.link ? String(s.link) : "";
  }
  function statusDate(d) {
    const s = d && d.status;
    return s && typeof s === "object" && s.date ? String(s.date) : "";
  }

  // Documented limitations, sourced: a single { note, link, date } - a short summary of the
  // feature's caveats, the official page it came from, and the date it was fetched (shown in
  // the source link's tooltip). Entries with no documented limitations carry no field and
  // render nothing.
  function limitationsHTML(d) {
    const lim = d.limitations;
    if (!lim || typeof lim !== "object" || !lim.note) return "";
    const link = lim.link ? String(lim.link) : "";
    const when = lim.date ? `Limitations - official docs, checked ${lim.date}` : "Limitations - official docs";
    const src = link ? ` ${srcLink("", link, when)}` : "";
    return `<p class="row-limitations"><span class="lim-icon" aria-hidden="true">⚠</span> ` +
      `<span><span class="lim-label">Limitations:</span> ${escapeHtml(lim.note)}${src}</span></p>`;
  }

  // A whole lineage family collapsed into ONE card. Its names read as an inline flow chain
  // in a header strip - former names linking to their own cards, the active name as the
  // inverted "now" chip (see lineageChain) - above the active member's body. The active
  // member's release-maturity pill + status badge ride the right of that strip. `activeD`
  // is the member shown; clicking a former name in the chain deep-links to it, which
  // re-renders the card with that member active.
  function rowHTML(activeD) {
    const body = memberBody(activeD);
    // The status badge is a bookmark on the card's top-right edge (active/latest shows none);
    // the copy/share actions sit on the bottom-right edge, on the badge's line.
    const badge = statusBadge(activeD);
    const corner = badge ? `<span class="fam-badge">${badge}</span>` : "";
    const actions = `<div class="row-actions fam-actions">
            <button class="row-act" data-act="link" title="Copy a link to this entry" aria-label="Copy link to this entry">${ICON.link}</button>
            <button class="row-act" data-act="share" title="Share this entry on LinkedIn" aria-label="Share this entry on LinkedIn">${ICON.linkedin}</button>
          </div>`;
    // the maturity stepper rides just below the chain header's hairline, at the top of the body
    const stepper = flowStatusOf(activeD) === "active" ? releaseStepper(activeD) : "";
    const head = `<div class="fam-chainbar">${lineageChain(activeD)}</div>`;
    return `
      <article class="row family-card ${body.spine}" data-id="${escapeAttr(activeD.id)}">
        ${actions}
        ${head}
        ${stepper}
        <div class="fam-body ${body.spine}" data-mid="${escapeAttr(activeD.id)}">${body.html}</div>
        ${corner}
      </article>`;
  }

  // The card's lifecycle badge. The live state (stored as "active", shown elsewhere as
  // "latest") gets NO card badge - only the noteworthy states do. Each maps to a color
  // class: renamed the slate "former" look, etc. Release maturity rides beside it.
  const STATUS_BADGE_CLASS = {
    renamed: "badge-former",
    deprecated: "badge-deprecated",
    legacy: "badge-legacy",
    retired: "badge-retired",
  };
  // The live/"latest" state (stored as "active"). Recognized either way; it shows no badge.
  const LIVE_STATUSES = new Set(["latest", "active"]);
  function statusBadge(d) {
    const s = statusValue(d) || "latest";
    if (LIVE_STATUSES.has(s)) return "";
    const cls = STATUS_BADGE_CLASS[s] || "badge-current";
    const date = statusDate(d);
    const title = date ? ` title="Status confirmed ${escapeAttr(date)}"` : "";
    return `<span class="badge ${cls}"${title}>${escapeHtml(s)}</span>`;
  }

  // Release maturity is its own axis, orthogonal to the lifecycle badge above: a thing can
  // be active-but-Public-Preview or even legacy-but-Beta. `releases` is a stage timeline;
  // the pill shows the LAST stage. A stage is either reached (has a `date`) or merely
  // announced (`is_announced: true`, no date) - an announced stage renders "<Stage> soon"
  // with a dashed border. Only an entry with no `releases` (a superseded name, where
  // maturity is moot) shows no pill.
  const RELEASE_LABELS = {
    "private-preview": "Private Preview",
    "beta": "Beta",
    "public-preview": "Public Preview",
    "ga": "GA",
  };
  function releasePill(d) {
    const rels = d.releases;
    if (!Array.isArray(rels) || !rels.length) return ""; // no timeline -> no pill
    const cur = rels[rels.length - 1];                   // last stage = current maturity
    const label = RELEASE_LABELS[cur.type];
    if (!label) return "";
    const announced = cur.is_announced === true && cur.date == null;
    const text = announced ? label + " soon" : label;
    // full stage history in the tooltip (e.g. "Beta June 2025 -> Public Preview March 2026",
    // or an announced-but-unreached stage as "GA (announced)")
    const hist = rels.map((r) => `${RELEASE_LABELS[r.type] || r.type} ${r.date ? fmtDate(r.date) : "(announced)"}`).join(" -> ");
    // one cool hue per stage; `badge-rel-soon` dashes the border for an announced stage
    const cls = `badge-rel-${escapeAttr(cur.type)}${announced ? " badge-rel-soon" : ""}`;
    // Each release stage now carries a `link` confirming its date; the pill (which shows
    // the current stage) links out to that stage's confirmation when present. The full
    // stage history still rides in the hover tooltip.
    const url = cur.link ? String(cur.link) : "";
    const tip = url ? `${hist} · click for source` : hist;
    if (url) {
      return `<a class="badge ${cls} badge-release badge-release-link" href="${escapeAttr(url)}" ` +
        `target="_blank" rel="noopener" title="${escapeAttr(tip)}">${escapeHtml(text)}</a>`;
    }
    return `<span class="badge ${cls} badge-release" title="${escapeAttr(hist)}">${escapeHtml(text)}</span>`;
  }

  // The same four-stage maturity ramp as releasePill, drawn as a stepper instead of a single
  // pill: one segment per canonical stage (Private Preview -> Beta -> Public Preview -> GA),
  // so the whole journey - and any stage the thing skipped - reads at a glance under the chain
  // header. A reached stage fills with its ramp color; the last reached is the bold "· now";
  // a stage never hit reads hatched; an announced-but-unreached future stage reads dashed.
  const RELEASE_ORDER = ["private-preview", "beta", "public-preview", "ga"];
  const RELEASE_SHORT = {
    "private-preview": "Private",
    "beta": "Beta",
    "public-preview": "Public",
    "ga": "GA",
  };
  function releaseStepper(d) {
    const rels = d.releases;
    if (!Array.isArray(rels) || !rels.length) return ""; // no timeline -> no stepper
    const byType = {};
    rels.forEach((r) => { byType[r.type] = r; });
    // last stage that was actually reached (has a date) = current maturity
    let curType = null;
    rels.forEach((r) => { if (r.date != null) curType = r.type; });
    if (!curType) return ""; // only announced stages, nothing reached yet
    const bars = RELEASE_ORDER.map((type) => {
      const r = byType[type];
      const short = RELEASE_SHORT[type];
      const reached = r && r.date != null;
      const announced = r && r.date == null && r.is_announced === true;
      let segCls, tip;
      if (reached) {
        segCls = "is-on";
        tip = `${RELEASE_LABELS[type]} ${fmtDate(r.date)}`;
      } else if (announced) {
        segCls = "is-soon";
        tip = `${RELEASE_LABELS[type]} (announced)`;
      } else {
        segCls = "is-skip";
        tip = `${RELEASE_LABELS[type]} - not reached`;
      }
      // ramp color rides an inline custom prop; `type` is a trusted constant from RELEASE_ORDER
      const style = segCls === "is-skip" ? "" : ` style="--seg:var(--rel-${type})"`;
      const isNow = type === curType;
      return {
        seg: `<span class="rel-step-seg ${segCls}"${style} title="${escapeAttr(tip)}"></span>`,
        lab: `<span class="rel-step-lab${isNow ? " is-now" : ""}">${escapeHtml(isNow ? `${short} · now` : short)}</span>`,
      };
    });
    return `<div class="rel-stepper" role="img" aria-label="Release maturity: reached ${escapeAttr(RELEASE_LABELS[curType] || curType)}">` +
      `<div class="rel-step-bars">${bars.map((b) => b.seg).join("")}</div>` +
      `<div class="rel-step-labs">${bars.map((b) => b.lab).join("")}</div>` +
      `</div>`;
  }

  // Cross-card links. A card points forward via `successorId` (the name it became,
  // or the product that replaced it); predecessors are whatever points back here.
  // Both walk the full chain so a card shows its entire history in either direction.
  function successorsOf(d) {
    const out = [];
    const seen = new Set([d.id]);
    let cur = d;
    while (cur && cur.successorId && !seen.has(cur.successorId)) {
      const s = DATA.find((x) => x.id === cur.successorId);
      if (!s) break;
      seen.add(s.id);
      out.push(s);
      cur = s;
    }
    return out;
  }
  function predecessorsOf(d) {
    const out = [];
    const seen = new Set([d.id]);
    let frontier = DATA.filter((x) => x.successorId === d.id);
    while (frontier.length) {
      const next = [];
      for (const p of frontier) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
        next.push(...DATA.filter((x) => x.successorId === p.id));
      }
      frontier = next;
    }
    return out;
  }

  // The lineage as one scannable line: predecessors → this card → successors, oldest to
  // newest. Every name but this one links to its own card, so the row still navigates
  // the full history - without the mini-cards that repeated this card's description.
  function lineageChain(d) {
    const preds = predecessorsOf(d).slice().reverse(); // oldest-first
    const succs = successorsOf(d);
    // The "guess the sequel" gag rides the trailing slot of the chain - the made-up *next*
    // name after the live tip. It belongs to the family's tip (its newest name), not to the
    // member in focus, so it shows on every card in the lineage - not only when the current
    // name is the one being viewed. A tip that is deprecated / superseded gets no forecast.
    const tip = succs.length ? succs[succs.length - 1] : d;
    const guess = (kindOf(tip) !== "deprecation" && (statusValue(tip) || "current") !== "renamed")
      ? oddsBadge(tip) : "";
    // The chain always renders: the card's title now lives here as the "now" node
    // (styled as an inverted chip), so even a card with no predecessors, successors,
    // or forecast still shows its name.
    // A node is "former" - struck through - when its own record is a superseded rename
    // or a deprecation, whether it's the card's own name or a predecessor in the chain.
    const isFormer = (x) =>
      kindOf(x) === "deprecation" ||
      (kindOf(x) === "rename" && (statusValue(x) || "current") === "renamed");
    // Compact start-date token for a node: its `from` (or a feature's introducedAt), as
    // "2026-07" -> "07’26", a bare year -> "’26". Shows when each name began.
    const nodeDate = (x) => {
      const s = String(dateOf(x.from) || dateOf(x.introducedAt) || "");
      const yr = shortYear(s);
      if (!yr) return "";
      const mm = /^\d{4}-(\d{2})/.exec(s);
      return mm ? `${mm[1]}’${yr.slice(2)}` : `’${yr.slice(2)}`;
    };
    const node = (x, isNow) => {
      const nm = x.name || currentNameOf(x);
      const former = isFormer(x) ? " former" : "";
      const date = nodeDate(x);
      const dateHTML = date ? `<span class="chain-yr">${escapeHtml(date)}</span>` : "";
      if (isNow) {
        return `<span class="chain-node now${former}">${escapeHtml(nm)}${dateHTML}</span>`;
      }
      return `<a class="chain-node${former}" href="#${escapeAttr(encodeURIComponent(x.id))}" ` +
        `title="Open “${escapeAttr(nm)}”">${escapeHtml(nm)}${dateHTML}</a>`;
    };
    // Each arrow is colored by the change it represents, not the card being viewed:
    // the left-hand node is the thing that changed, so the arrow takes its status color
    // (amber for a deprecation hop, orange for a rename hop, green at the live tip).
    const flowClass = (x) => {
      if (!x) return "flow-active"; // forecast tail: colored by the live tip before it
      if (kindOf(x) === "deprecation") return (statusValue(x) === "legacy") ? "flow-legacy" : "flow-deprecated";
      if (kindOf(x) === "rename" && (statusValue(x) || "current") === "renamed") return "flow-renamed";
      return "flow-active";
    };
    const seq = [
      ...preds.map((p) => ({ el: node(p, false), src: p })),
      { el: node(d, true), src: d },
      ...succs.map((s) => ({ el: node(s, false), src: s })),
    ];
    if (guess) seq.push({ el: guess, src: null }); // forecast rides the last, future-name slot
    // Chronological order: the oldest name leads on the left and the flow runs
    // past -> present -> (forecast) rightward. Arrows point right - toward the newer
    // name - each colored by the older (left) node, the thing that changed.
    const inner = seq.map((item, i) =>
      (i ? `<span class="chain-flow ${flowClass(seq[i - 1].src)}" aria-hidden="true">→</span>` : "") + item.el
    ).join("");
    return `<div class="lineage-chain">${inner}</div>`;
  }

  // A relationship section: label + one linked mini-card per related entry, each
  // pulling its name, status, date, and description from that other record and
  // linking to it (click jumps to the card via the #id route). Retained for reference;
  // the card now shows lineage inline via lineageChain().
  function relSection(label, items) {
    if (!items.length) return "";
    const plural = items.length > 1 ? "s" : "";
    const rows = items.map((x) => {
      const nm = x.name || currentNameOf(x);
      const when = changedAt(x);
      return `<a class="rel-item" href="#${escapeAttr(encodeURIComponent(x.id))}" title="Open “${escapeAttr(nm)}”">` +
        `<span class="rel-head">` +
          `<span class="rel-name">${escapeHtml(nm)}</span>` +
          statusBadge(x) +
          (when ? `<span class="rel-when">${escapeHtml(shortYear(when))}</span>` : "") +
          `<span class="rel-arrow" aria-hidden="true">↗</span>` +
        `</span>` +
        (whatNote(x) ? `<span class="rel-what">${escapeHtml(whatNote(x))}</span>` : "") +
      `</a>`;
    }).join("");
    return `<div class="rel-group"><span class="rel-label">${escapeHtml(label)}${plural}</span><div class="rel-items">${rows}</div></div>`;
  }

  // The AI-guess button. No fake odds - just an invitation to have the "AI" make up
  // the next name. The button carries the whole made-up shortlist; the first click
  // reveals the seeded guess and each later click rolls a new one. Seed is
  // deterministic per entry so the first guess doesn't flicker between renders.
  function oddsBadge(d) {
    const preds = Array.isArray(d.prediction) ? d.prediction.filter(Boolean) : [];
    if (!preds.length) return "";
    const start = hashStr(d.id + "p") % preds.length;
    return `<button class="odds-btn" data-preds="${escapeAttr(JSON.stringify(preds))}" data-i="${start}" title="Our AI's best guess at the next rebrand" aria-label="Ask Genie">✨ Ask Genie</button>`;
  }

  // The AI-guess button reveals a made-up next name: a beat of "thinking", then the
  // button's own label becomes ✨ <the guess>, keeping the same styling and position.
  // Click it again to roll a new one - it cycles through the entry's shortlist.
  function revealPrediction(btn) {
    if (btn.classList.contains("thinking")) return; // ignore clicks mid-"thinking"
    let preds;
    try { preds = JSON.parse(btn.dataset.preds || "[]"); } catch (e) { preds = []; }
    if (!preds.length) return;
    let i = parseInt(btn.dataset.i, 10) || 0;
    // First reveal shows the seeded index; every click after that advances to a new one.
    if (btn.dataset.revealed === "1") i = (i + 1) % preds.length;
    btn.dataset.i = String(i);
    btn.classList.add("thinking");
    btn.textContent = "✨ thinking…";
    const finish = () => {
      btn.classList.remove("thinking");
      btn.classList.add("odds-guessed");
      btn.dataset.revealed = "1";
      btn.title = "Not a real forecast. We made this up. Click for another.";
      btn.textContent = `✨ ${preds[i]}`;
    };
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) finish();
    else setTimeout(finish, 650);
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
    const when = dateOf(d.introducedAt) ? escapeAttr(dateOf(d.introducedAt)) : "";
    return `<span class="current feature-name" data-name="${escapeAttr(d.name)}" data-feature="1" data-when="${when}" title="click to copy">${highlight(d.name, q)}</span>`;
  }

  // Each name in a product's history is its own card; the title is just this card's
  // name. Predecessors/successors are shown as their own linked cards below.
  // A former name carries its current name too, so clicking it copies a correction
  // that points forward - not one that mislabels the old name as the current one.
  function renameTrail(d, q) {
    const name = d.name || d.id;
    const renamed = (statusValue(d) || "current") === "renamed";
    const current = renamed ? currentNameOf(d) : "";
    // Only treat it as "former" for copy purposes when we actually know the name
    // it became; otherwise fall back to the plain current-name correction.
    const isFormer = renamed && current && current !== name && !current.startsWith("(");
    // The title reads the same across every card type - plain, not struck. The
    // "former" signal lives in the status pill and the struck node in the lineage
    // chain, so the title stays consistent (data-former still drives the copy text).
    const cls = "current";
    const abbr = d.abbr ? ` (${highlight(d.abbr, q)})` : "";
    const attrs = isFormer ? ` data-former="1" data-current="${escapeAttr(current)}"` : "";
    const tip = isFormer ? "click to copy the current name" : "click to copy a correction";
    return `<span class="${cls}" data-name="${escapeAttr(name)}"${attrs} title="${tip}">${highlight(name, q)}${abbr}</span>`;
  }

  // A deprecation's title is just the deprecated name; the successor (if any) is its
  // own linked card in the Successor section below. Clicking it copies a correction
  // that names the replacement rather than presenting the dead name as current.
  function depTrail(d, q) {
    const current = currentNameOf(d);
    const hasSuccessor = current && !current.startsWith("(");
    const attrs = ` data-dep="1" data-old="${escapeAttr(d.name)}"` +
      (hasSuccessor ? ` data-current="${escapeAttr(current)}"` : "");
    // Same plain title as every other card type; the removal year now lives in the
    // date strip, and the DEPRECATED pill carries the state.
    return `<span class="current dep-name" data-name="${escapeAttr(d.name)}"${attrs} title="click to copy a correction">${highlight(d.name, q)}</span>`;
  }

  function renderError() {
    resultsEl.innerHTML = `
      <div class="error">
        <p><strong>Couldn't load <code>databricks.features.json</code>.</strong></p>
        <p>If you opened this file directly, your browser blocked the fetch.<br>
        Serve it over http instead - from this folder run:</p>
        <p><code>python -m http.server</code></p>
        <p>then open <code>http://localhost:8000</code>. It's a static site; that's all it needs.</p>
      </div>`;
  }

  function renderChips() {
    // Category chips are hidden - the chips row renders empty.
    chipsEl.innerHTML = "";
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
      el.textContent = `Accurate as of ${latest} - the last time we checked. Given the subject, it may already be wrong.`;
    }
  }

  // ---- interactions ----
  function wireStaticControls() {
    let searchTrackTimer = null;
    let searchWasEmpty = searchEl.value.trim() === "";
    searchEl.addEventListener("input", () => {
      activeSection = null; // manual typing clears any rail-section filter
      focusId = null;
      activeYear = null;
      setActiveNav(null);
      writeURL();
      render();
      // On mobile you often type while scrolled deep into the list; the filtered
      // results then sit above the viewport, off-screen. When a search *begins*
      // (empty -> non-empty), bring the filters/results back into view. Only
      // upward - never yank the page down on someone already looking at the top.
      const isEmpty = searchEl.value.trim() === "";
      if (searchWasEmpty && !isEmpty) revealFiltersIfBelow();
      searchWasEmpty = isEmpty;
      // Track the settled query, not every keystroke. Terms are product names, not PII.
      clearTimeout(searchTrackTimer);
      searchTrackTimer = setTimeout(() => {
        const q = searchEl.value.trim().toLowerCase();
        if (q.length >= 2) track("search", { term: q });
      }, 800);
    });

    // The "/" badge in the search box: click it to clear the current query and
    // refocus, ready to type again. Dispatching a real input event reuses the
    // handler above (reset + re-render) so clearing behaves like typing to empty.
    const slashKey = $(".topsearch .slash");
    if (slashKey) {
      slashKey.addEventListener("click", () => {
        searchEl.value = "";
        searchEl.dispatchEvent(new Event("input", { bubbles: true }));
        searchEl.focus();
      });
    }

    // Back/forward and pasted-in-place links.
    window.addEventListener("hashchange", () => { applyRoute(); render(); });

    // Quiz overlay controls.
    const quizBanner = $("#quiz-banner");
    if (quizBanner) quizBanner.addEventListener("click", () => { track("quiz-open", { source: "home-banner" }); openQuiz(); });
    const quizClose = $("#quiz-close");
    if (quizClose) quizClose.addEventListener("click", closeQuiz);
    const quizEl = $("#quiz");
    if (quizEl) quizEl.addEventListener("click", (e) => { if (e.target === quizEl) closeQuiz(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && quizEl && !quizEl.hidden) closeQuiz();
    });
    // Keep Tab inside open dialogs (they're aria-modal).
    wireModalTrap(quizEl);

    // "New" overlay: no, you may not create a product. Pick one to rename.
    const newModal = $("#new-modal");
    wireModalTrap(newModal);
    const newClose = $("#new-close");
    if (newClose) newClose.addEventListener("click", closeNewModal);
    if (newModal) newModal.addEventListener("click", (e) => { if (e.target === newModal) closeNewModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && newModal && !newModal.hidden) closeNewModal();
    });

    const rouletteBtn = $("#roulette");
    if (rouletteBtn) rouletteBtn.addEventListener("click", () => { track("roulette"); roulette(); });

    // The brand logo is the other way home.
    const brand = $("#side-brand");
    if (brand) brand.addEventListener("click", () => {
      setActiveNav(document.querySelector(".nav-item[data-home]"));
      setSidebarOpen(false);
      goHome();
    });

    const sideNew = $("#side-new");
    if (sideNew) sideNew.addEventListener("click", () => { track("new-modal-open"); openNewModal(); });

    const themeToggle = $("#theme-toggle");
    if (themeToggle) themeToggle.addEventListener("click", () => {
      const root = document.documentElement;
      const cur = root.dataset.theme || "light";
      const next = cur === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("rebricked-theme", next); } catch (e) {}
      track("theme-toggle", { theme: next });
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

    // Dark by default; an explicit choice (saved) always wins. Mirrors the head script.
    try {
      const saved = localStorage.getItem("rebricked-theme");
      document.documentElement.dataset.theme = saved || "dark";
    } catch (e) {
      document.documentElement.dataset.theme = "dark";
    }

    // "/" focuses search, like every tool this audience already lives in.
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchEl) {
        e.preventDefault();
        searchEl.focus();
      }
    });
  }

  // Keep Tab cycling inside a modal while it's open.
  function wireModalTrap(modalEl) {
    if (!modalEl) return;
    modalEl.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(modalEl.querySelectorAll("button:not(:disabled)"))
        .filter((b) => !b.hidden && b.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // ---- "New" gag: nothing here is ever new, it's renamed ----
  let newReturnFocus = null;

  function predictionPool() {
    // Living products only - you can't rename what's already retired.
    return DATA.filter((d) => kindOf(d) !== "deprecation" && Array.isArray(d.prediction) && d.prediction.length);
  }

  function openNewModal() {
    const el = $("#new-modal");
    if (!el) return;
    el.hidden = false;
    document.body.classList.add("modal-open");
    newReturnFocus = document.activeElement;
    const closeBtn = $("#new-close");
    if (closeBtn) closeBtn.focus();
    renderNewNameForm();
  }

  function closeNewModal() {
    const el = $("#new-modal");
    if (!el) return;
    el.hidden = true;
    document.body.classList.remove("modal-open");
    if (newReturnFocus && document.body.contains(newReturnFocus)) newReturnFocus.focus();
    newReturnFocus = null;
  }

  function renderNewSuggestion() {
    const body = $("#new-body");
    if (!body) return;
    const pool = predictionPool();
    if (pool.length === 0) {
      body.innerHTML = `<p class="quiz-msg">No products left to rename. Someone check on the roadmap.</p>`;
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    body.innerHTML =
      `<p class="new-copy">Why would you need a <b>new</b> product? Around here we don't create products - we <b>rename</b> the ones we already have. It's cheaper, it ships faster, and it comes with a keynote slide.</p>` +
      `<p class="new-suggest">May we suggest: <b>${escapeHtml(currentNameOf(pick))}</b> <span class="arrow">→</span> <b>${escapeHtml(pick.prediction[Math.floor(Math.random() * pick.prediction.length)])}</b></p>` +
      `<p class="new-fine">Not a real roadmap. We made this up - but give it a year.</p>` +
      `<div class="quiz-actions">` +
      `<div class="new-links">` +
      `<button class="quiz-see" id="new-entry" data-id="${escapeAttr(pick.id)}">see the entry ↗</button>` +
      `<button class="quiz-see" id="new-yours">suggest yours</button>` +
      `</div>` +
      `<button class="quiz-next" id="new-again">Suggest another</button>` +
      `</div>`;
    const again = $("#new-again");
    if (again) again.addEventListener("click", renderNewSuggestion);
    const yours = $("#new-yours");
    if (yours) yours.addEventListener("click", renderNewNameForm);
    const see = $("#new-entry");
    if (see) see.addEventListener("click", () => { closeNewModal(); focusEntry(see.dataset.id); });
  }

  // The "truth" - deadpan realities about naming things at Databricks. Naming is
  // done to you, not by you.
  const TRUTHS = [
    "Here's the truth: you don't get to name it. Around here we don't create products - we rename the ones we already have. It's cheaper, ships faster, and comes with a keynote slide.",
    "The truth: whatever you call it, the Naming Committee renamed it before you finished typing. Every product name must legally contain “Lakeflow”, “Genie”, or “Unity”.",
    "The truth: it'll ship under that name for about a year, marinate through two summits and a leadership offsite, and come back with a “Mosaic AI” prefix nobody asked for.",
    "The truth: naming rights require a keynote slot, a rebrand budget, and at least one acquisition - none of which a new product currently has.",
    "The truth: your name is far too clear and memorable. It would never survive next year's rebrand.",
  ];
  let truthIdx = 0;

  // Step one: ask the user to name their new brand / product / feature.
  function renderNewNameForm() {
    const body = $("#new-body");
    if (!body) return;
    body.innerHTML =
      `<p class="new-copy">So you want to launch something new. What's the <b>brand, product, or feature</b> called?</p>` +
      `<input type="text" id="new-name-input" class="new-input" maxlength="60" autocomplete="off" ` +
      `placeholder="e.g. Lakeflow Genie Unity One" aria-label="Your new brand, product, or feature name" />` +
      `<div class="quiz-actions end">` +
      `<button class="quiz-next" id="new-submit">Tell me the truth</button>` +
      `</div>`;
    const input = $("#new-name-input");
    if (input) input.focus();
    const go = () => renderNewTruth(input ? input.value.trim() : "");
    const submit = $("#new-submit");
    if (submit) submit.addEventListener("click", go);
    if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  // Step two: the deadpan truth - now that they've committed to a name. Where we can,
  // we tell them what it'll *actually* get renamed to (a made-up next name from the pool).
  function renderNewTruth(name) {
    const body = $("#new-body");
    if (!body) return;
    const line = TRUTHS[truthIdx++ % TRUTHS.length];
    const lead = name
      ? `<p class="new-suggest">“${escapeHtml(name)}”? Bold choice.</p>`
      : `<p class="new-suggest">A nameless product. Even bolder.</p>`;
    // A plausible fake "next name" for their product, borrowed from the prediction pool.
    const pool = predictionPool();
    let renamed = "";
    if (name && pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const to = pick.prediction[Math.floor(Math.random() * pick.prediction.length)];
      renamed = `<p class="new-suggest">Give it a year and “${escapeHtml(name)}” ships as <b>${escapeHtml(to)}</b>.</p>`;
    }
    body.innerHTML =
      lead +
      `<p class="new-copy">${escapeHtml(line)}</p>` +
      renamed +
      `<p class="new-fine">Naming is done to you, not by you.</p>` +
      `<div class="quiz-actions">` +
      `<div class="new-links">` +
      `<button class="quiz-see" id="new-retry">try another name</button>` +
      `</div>` +
      `<button class="quiz-next" id="new-back">Fine, you pick</button>` +
      `</div>`;
    const retry = $("#new-retry");
    if (retry) retry.addEventListener("click", renderNewNameForm);
    const back = $("#new-back");
    if (back) back.addEventListener("click", renderNewSuggestion);
  }

  // Play the one-shot highlight, then drop the class so it never lingers on the element.
  // A lingering `flash` would keep the card in its animated state and (before this) pin
  // its spine to the accent color, so a swapped-back card never returned to its own hue.
  function flashOnce(el) {
    if (!el) return;
    void el.offsetWidth; // restart the animation even on a repeat trigger
    el.classList.add("flash");
    el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
  }

  // Wire one result card's controls. Scoped per-card so an in-place chain swap can re-wire
  // just the replaced card, without doubling listeners on every other card on the page.
  function wireCard(card) {
    // per-card actions: deep link + shareable blurb, targeting the active member.
    card.querySelectorAll(".row-act").forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = btn.closest(".fam-body");
        const d = DATA.find((x) => x.id === (body ? body.dataset.mid : card.dataset.id));
        if (!d) return;
        if (btn.dataset.act === "link") {
          const url = entryURL(d.id);
          track("copy-link", { id: d.id });
          copy(url).then((ok) =>
            toast(ok ? `Link copied - ${url}` : "Copy failed - select it manually.")
          );
        } else if (btn.dataset.act === "share") {
          track("share", { id: d.id });
          shareEntryLinkedIn(d);
        }
      });
    });

    // Lineage chain: clicking a name swaps THIS card to that member in place - its body,
    // chain, status cluster and spine all repaint while every other card on the page stays
    // put (no list filtering, no navigation). A modifier-click still falls through to the
    // #id link, so a name can be opened in a new tab or deep-linked.
    card.querySelectorAll("a.chain-node").forEach((a) => {
      a.addEventListener("click", (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const id = decodeURIComponent((a.getAttribute("href") || "").replace(/^#/, ""));
        const member = DATA.find((x) => x.id === id);
        if (!member) return; // unknown - let the browser follow the link
        e.preventDefault();
        const tmp = document.createElement("template");
        tmp.innerHTML = rowHTML(member).trim();
        const fresh = tmp.content.firstElementChild;
        if (!fresh) return;
        card.replaceWith(fresh);
        wireCard(fresh);
        flashOnce(fresh);
        track("lineage-open", { id });
      });
    });

    // the AI-prediction reveal
    card.querySelectorAll(".odds-btn").forEach((btn) => {
      btn.addEventListener("click", () => { track("guess-name"); revealPrediction(btn); });
    });

    // copy-as-you-were-wrong: clicking any card title copies a snappy correction.
    // A former/deprecated name copies the name it became - never itself as "current".
    card.querySelectorAll(".current, .dep-name").forEach((el) => {
      el.addEventListener("click", () => {
        const name = el.dataset.name;
        let text;
        if (el.dataset.feature) {
          const when = el.dataset.when ? ` (since ${el.dataset.when})` : "";
          text = `Yes, "${name}" is a real Databricks feature${when}.`;
        } else if (el.dataset.dep) {
          text = el.dataset.current
            ? `Actually, "${el.dataset.old}" is deprecated - use "${el.dataset.current}" now.`
            : `Actually, "${el.dataset.old}" is deprecated.`;
        } else if (el.dataset.former) {
          text = `Actually, "${name}" is the old name - it's "${el.dataset.current}" now.`;
        } else {
          text = `Actually, it's called "${name}" now.`;
        }
        copy(text).then((ok) =>
          toast(ok ? `Copied: ${text}` : "Copy failed - select it manually.")
        );
      });
    });
  }

  function wireRows() {
    resultsEl.querySelectorAll(".family-card").forEach(wireCard);
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
    resetKinds();
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    render();

    const rows = resultsEl.querySelectorAll(".row");
    if (rows.length === 0) return;

    // Pick the winner up front, at random, avoiding an immediate repeat.
    let target = Math.floor(Math.random() * rows.length);
    if (rows.length > 1) {
      while (rows[target].dataset.id === lastRouletteId) {
        target = Math.floor(Math.random() * rows.length);
      }
    }
    lastRouletteId = rows[target].dataset.id;

    // a short beat of fake suspense, then land on the pre-chosen target
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
        const winner = rows[target];
        winner.classList.add("flash");
        winner.scrollIntoView({ behavior: "smooth", block: "center" });
        // The roulette shows the full list, so the URL must reflect that state -
        // writing the entry hash here would reload into a different (focused) view.
        writeURL();
        brickConfetti();
      }
    };
    spin();
  }

  // ---- quiz: "guess the current name" ----
  const QUIZ_LEN = 5; // questions per round
  const QUIZ_KEYS = ["A", "B", "C", "D"]; // Millionaire-style answer labels
  // marks[] holds one true/false per answered question, driving the money-tree ladder.
  const quizState = { score: 0, total: 0, streak: 0, answered: false, asked: [], lastId: null, marks: [], recipient: null };
  let quizReturnFocus = null; // element to restore focus to when the dialog closes

  // Entries that pose a fair "what's it called now?" question: renames (old → current)
  // and deprecations with a named replacement.
  function quizPool() {
    return DATA.filter((d) => {
      const k = kindOf(d);
      // a former name whose current name is knowable, or a deprecation with a successor
      if (k === "rename") return (statusValue(d) === "renamed") && !currentNameOf(d).startsWith("(");
      if (k === "deprecation") return !currentNameOf(d).startsWith("(");
      return false;
    });
  }

  // The prompt is the old/deprecated name; the answer is its current name.
  function quizPrompt(d) {
    return d.name;
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
    quizState.marks = [];
    quizState.recipient = null;
    renderLadder();
    el.hidden = false;
    document.body.classList.add("modal-open");
    quizReturnFocus = document.activeElement;
    const closeBtn = $("#quiz-close");
    if (closeBtn) closeBtn.focus();
    nextQuestion();
  }

  // Directory of the current page, so links resolve at "/" and at "/rebricked/".
  function pageDir() {
    return location.pathname.replace(/[^/]*$/, "");
  }

  // The shared link is the badge page for this score (badges/<n>-of-5/) - a real page
  // with Open Graph tags, so the badge shows in the preview. Only reachable once the
  // round is complete, which is also the only time the share button is shown.
  function quizResultURL() {
    const url = new URL(location.origin + pageDir() + "badges/" + quizState.score + "-of-" + QUIZ_LEN + "/");
    if (quizState.recipient) {
      url.searchParams.set("name", quizState.recipient);
    }
    return url.toString();
  }

  function shareQuizLinkedIn() {
    const pct = quizState.total
      ? Math.round((quizState.score / quizState.total) * 100)
      : 0;
    const link = withUTM(quizResultURL(), {
      source: "linkedin", medium: "social", campaign: "quiz-share",
    });
    const text =
      `I scored ${quizState.score}/${quizState.total} (${pct}%) on REbricked - the quiz for ` +
      `whether you can keep up with everything Databricks has renamed. Think you can beat me? ${link}`;
    const shareUrl =
      "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link);
    copy(text).then((ok) => {
      toast(ok ? "Score copied - paste it into your LinkedIn post." : "Opening LinkedIn…");
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
      `<span class="ch-text">Someone scored <b>${score}/${total}</b> (${pct}%) on the quiz - think you can beat them?</span>` +
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
    // Sharing sends the named badge page, so only offer it once a name was entered.
    const share = $("#quiz-share");
    if (share) share.hidden = quizState.total < QUIZ_LEN;
  }

  // The money-tree ladder: one segment per question - answered ones show
  // correct/miss, the current (or next) one is lit in accent red.
  function renderLadder() {
    const el = $("#quiz-ladder");
    if (!el) return;
    let html = "";
    for (let n = 0; n < QUIZ_LEN; n++) {
      let cls = "quiz-rung";
      if (n < quizState.marks.length) cls += quizState.marks[n] ? " done" : " miss";
      else if (n === quizState.marks.length) cls += " now";
      html += `<div class="${cls}"></div>`;
    }
    el.innerHTML = html;
  }

  function nextQuestion() {
    const body = $("#quiz-body");
    const pool = quizPool();
    if (!body || pool.length < 4) {
      if (body) body.innerHTML = `<p class="quiz-msg">Not enough data to build a quiz yet.</p>`;
      return;
    }
    // A round is exactly QUIZ_LEN questions - after the last answer, show results.
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
    // Harder: seed distractors with THIS product's own plausible-but-fake future names
    // (the most tempting wrong answers), then fill from every other name and predicted
    // name across the dataset. A deprecation has no predictions of its own, so borrow
    // the replacement's - same successor, plausible next rebrands (e.g. "DBFS mounts" →
    // Unity Catalog volumes, decoyed by that product's "…Volumes" predictions).
    const ownPreds = Array.isArray(correct.prediction) ? correct.prediction : [];
    const repl = correct.successorId && DATA.find((d) => d.id === correct.successorId);
    const seedPreds = repl ? [...ownPreds, ...(repl.prediction || [])] : ownPreds;
    const own = shuffle(seedPreds.filter((n) => n && n !== answer));
    const others = shuffle(
      DATA.flatMap((d) => [currentNameOf(d), ...(d.prediction || [])])
        .filter((n) => n && n !== answer && !n.startsWith("("))
    );
    const seen = new Set([answer]);
    const options = [answer];
    for (const n of [...own.slice(0, 3), ...others]) {
      if (options.length >= 4) break;
      if (!seen.has(n)) { seen.add(n); options.push(n); }
    }
    const choices = shuffle(options);

    renderLadder();
    body.innerHTML =
      `<p class="quiz-progress">Question ${quizState.total + 1} of ${QUIZ_LEN}</p>` +
      `<p class="quiz-q">What is <span class="quiz-name">${escapeHtml(quizPrompt(correct))}</span> called now?</p>` +
      `<div class="quiz-opts">` +
      choices
        .map(
          (c, idx) =>
            `<button class="quiz-opt" data-name="${escapeAttr(c)}">` +
            `<span class="quiz-opt-in"><span class="quiz-key">${QUIZ_KEYS[idx]}</span>` +
            `<span class="quiz-val">${escapeHtml(c)}</span></span></button>`
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
    const opts = $("#quiz-body").querySelectorAll(".quiz-opt");
    const right = btn.dataset.name === answer;

    // Lock in the pick and hold - the "is that your final answer?" beat - then reveal.
    opts.forEach((o) => { o.disabled = true; });
    btn.classList.add("locked");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setTimeout(() => {
      btn.classList.remove("locked");
      quizState.total++;
      quizState.marks.push(right);
      if (right) { quizState.score++; quizState.streak++; }
      else { quizState.streak = 0; }

      opts.forEach((o) => {
        if (o.dataset.name === answer) o.classList.add("correct");
        else if (o === btn) o.classList.add("wrong");
      });
      updateQuizScore();
      renderLadder();

      const foot = $("#quiz-foot");
      if (foot) {
        const verdict = right
          ? `<span class="quiz-ok">Correct - you kept up.</span>`
          : `<span class="quiz-no">Nope - it moved on without you.</span>`;
        const done = quizState.total >= QUIZ_LEN;
        // The entry opens in a new tab so the quiz stays open behind it.
        foot.innerHTML =
          `<p class="quiz-chain">` +
          `<span class="old">${escapeHtml(quizPrompt(entry))}</span>` +
          `<span class="arw">→</span>` +
          `<span class="new">${escapeHtml(answer)}</span></p>` +
          `<p class="quiz-expl">${verdict} ${escapeHtml(whatNote(entry))}</p>` +
          `<div class="quiz-actions">` +
          `<a class="quiz-see" href="${escapeAttr(entryURL(entry.id))}" target="_blank" rel="noopener">see the entry ↗</a>` +
          `<button class="quiz-next">${done ? "See results" : "Next →"}</button>` +
          `</div>`;
        const next = foot.querySelector(".quiz-next");
        if (next) next.addEventListener("click", nextQuestion);
      }
    }, reduceMotion ? 0 : 1000);
  }

  function finishQuiz() {
    const body = $("#quiz-body");
    if (!body) return;
    const pct = Math.round((quizState.score / QUIZ_LEN) * 100);
    let verdict;
    if (pct === 100) verdict = "Flawless. You've been reading the release notes.";
    else if (pct >= 60) verdict = "Not bad - you mostly kept up with the renaming.";
    else if (pct >= 20) verdict = "Rough. In fairness, so is keeping track of this.";
    else verdict = "It's fine. Everything got renamed since you last looked anyway.";

    body.innerHTML =
      `<div class="quiz-result">` +
      `<p class="quiz-final">You scored <b>${quizState.score} / ${QUIZ_LEN}</b> <span class="quiz-pct">(${pct}%)</span></p>` +
      `<p class="quiz-verdict">${escapeHtml(verdict)}</p>` +
      `<form class="quiz-recipient" id="quiz-recipient">` +
      `<p class="quiz-recipient-title">Put your name on the badge <span class="quiz-recipient-optional">(optional)</span></p>` +
      `<div class="quiz-recipient-fields">` +
      `<label>Name<input class="new-input" id="quiz-name" name="name" autocomplete="name" maxlength="60"></label>` +
      `</div>` +
      `<p class="quiz-recipient-note">Leave it blank for an unnamed badge. Your name is encoded in the badge link; no account is needed.</p>` +
      `<div class="quiz-recipient-actions">` +
      `<button class="quiz-next" type="submit">Show my badge ↗</button>` +
      `<button class="quiz-share" id="quiz-share" type="button" title="Share your badge on LinkedIn">` +
      `<svg viewBox="0 0 24 24" width="14" height="14" class="li-ic" aria-hidden="true">` +
      `<path d="M4.98 3.5A2.5 2.5 0 1 1 2.5 6 2.5 2.5 0 0 1 4.98 3.5zM3 8.98h4V21H3zM9.5 8.98h3.83v1.64h.05a4.2 4.2 0 0 1 3.78-2.08c4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.34c0-1.27-.02-2.9-1.77-2.9s-2.04 1.38-2.04 2.81V21h-4z" />` +
      `</svg><span>Share on LinkedIn</span></button>` +
      `</div>` +
      `</form>` +
      `</div>`;
    // A perfect round gets the same celebratory brick shower as a roulette landing.
    if (quizState.score === QUIZ_LEN) brickConfetti();
    const recipientForm = $("#quiz-recipient");
    // The name is optional: an empty field just yields an unnamed badge.
    function saveQuizRecipient() {
      if (!recipientForm || !recipientForm.reportValidity()) return false;
      const nameInput = $("#quiz-name");
      const name = nameInput ? nameInput.value.trim().replace(/\s+/g, " ") : "";
      quizState.recipient = name || null;
      updateQuizScore();
      return true;
    }
    if (recipientForm) recipientForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!saveQuizRecipient()) return;
      track("quiz-badge-created", { score: quizState.score });
      window.open(quizResultURL(), "_blank", "noopener");
    });
    const share = $("#quiz-share");
    if (share) share.addEventListener("click", () => {
      if (!saveQuizRecipient()) return;
      shareQuizLinkedIn();
    });
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
    // No (valid) hash - make sure we're not stuck focused on a stale entry.
    focusId = null;
    const params = new URLSearchParams(location.search);
    // ?id=<id> is the crawler-safe deep link: LinkedIn (and most link previews) drop
    // the #fragment, so shared entry links carry the id in the query string instead.
    const idParam = (params.get("id") || "").trim();
    if (idParam && DATA.some((d) => d.id === idParam)) {
      focusEntry(idParam, { push: false });
      return;
    }
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
    if (kind !== null) {
      // Comma-separated list of selected kinds; an empty value means none selected.
      activeKinds = new Set(kind.split(",").filter((k) => KIND_KEYS.includes(k)));
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
    resetKinds();
    searchEl.value = "";
    setActiveNav(null);
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    syncFilterButtons();
    if (push) writeURL();
    render();
    // Land on the entry inside the full list: scroll to its card and flash it, instead
    // of collapsing the page to that single card. Deferred a frame so the freshly
    // rendered cards exist before we measure and scroll.
    requestAnimationFrame(() => revealEntry(id));
  }

  // Bring an entry's card into view within the full list. Its lineage family renders as
  // one card keyed on the first-sorted member, so the target may currently show a
  // sibling: find that family card, swap it in place to the requested member (the same
  // in-place swap a lineage-node click performs), then scroll to it and flash.
  function revealEntry(id) {
    const target = DATA.find((d) => d.id === id);
    if (!target) { scrollToFilters(); return; }
    let card = rowEl(id);
    if (!card) {
      const familyIds = new Set(lineageFamily(target).map((x) => x.id));
      card = [...resultsEl.querySelectorAll(".family-card")].find((c) =>
        familyIds.has(c.dataset.id)
      );
    }
    if (!card) { scrollToFilters(); return; }
    if (card.dataset.id !== id) {
      const tmp = document.createElement("template");
      tmp.innerHTML = rowHTML(target).trim();
      const fresh = tmp.content.firstElementChild;
      if (fresh) {
        card.replaceWith(fresh);
        wireCard(fresh);
        card = fresh;
      }
    }
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    flashOnce(card);
  }

  // Resolve a card element by its entry id, quoting the value so ids with odd
  // characters still select cleanly.
  function rowEl(id) {
    return resultsEl.querySelector(`.row[data-id="${cssAttr(id)}"]`);
  }

  function cssAttr(v) {
    return String(v).replace(/["\\]/g, "\\$&");
  }

  // Scroll a card into view. By default it lands just below the sticky top bar
  // (matching scrollToFilters' offset), so it isn't tucked under the header. Pass
  // anchorViewportY to instead place the card's top at that viewport height - used by
  // lineage hops to keep the card near where the user clicked - clamped so it never
  // hides under the top bar.
  function scrollRowIntoView(el, anchorViewportY) {
    const topbar = $(".topbar");
    const offset = (topbar ? topbar.offsetHeight : 0) + 12;
    const desiredViewportY =
      anchorViewportY == null ? offset : Math.max(offset, anchorViewportY);
    const y = el.getBoundingClientRect().top + window.scrollY - desiredViewportY;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  // Drilling into a section or a single entry should reveal the filters + results, not
  // the page title and quiz banner above them. Land on the filters block, just below the
  // sticky top bar, instead of scrolling to the very top (which on mobile leaves the
  // matches off-screen).
  function scrollToFilters() {
    const anchor = $("#filters");
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const topbar = $(".topbar");
    const offset = (topbar ? topbar.offsetHeight : 0) + 12;
    const y = anchor.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  // Like scrollToFilters, but only scrolls *up* - a no-op when the filters are
  // already at or above the sticky top bar. Used when a search begins so results
  // aren't stranded off-screen, without tugging the page for someone at the top.
  function revealFiltersIfBelow() {
    const anchor = $("#filters");
    if (!anchor) return;
    const topbar = $(".topbar");
    const offset = (topbar ? topbar.offsetHeight : 0) + 12;
    const y = anchor.getBoundingClientRect().top + window.scrollY - offset;
    if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
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
      if (!allKindsSelected()) params.set("kind", [...activeKinds].join(","));
      if (activeYear) params.set("year", activeYear);
      const qs = params.toString();
      if (qs) url += "?" + qs;
    }
    try { history.replaceState(null, "", url); } catch (e) {}
  }

  function entryURL(id) {
    return location.origin + location.pathname + "#" + encodeURIComponent(id);
  }

  // Crawler-safe deep link for sharing. Link previews (LinkedIn, Slack, etc.) strip the
  // #fragment, so the entry id rides in the query string; applyRoute() honors ?id=.
  function entryShareURL(id) {
    return location.origin + location.pathname + "?id=" + encodeURIComponent(id);
  }

  // Append UTM params to a URL's query string - kept before any #fragment so analytics
  // can read them (a fragment query is invisible to the server/tracker). Falsy values
  // are dropped. See https://docs.umami.is/docs/utm
  function withUTM(url, params) {
    const hashAt = url.indexOf("#");
    const base = hashAt === -1 ? url : url.slice(0, hashAt);
    const hash = hashAt === -1 ? "" : url.slice(hashAt);
    const qs = Object.keys(params)
      .filter((k) => params[k])
      .map((k) => "utm_" + k + "=" + encodeURIComponent(params[k]))
      .join("&");
    if (!qs) return url;
    return base + (base.indexOf("?") === -1 ? "?" : "&") + qs + hash;
  }

  // Walk the successor chain to the end - the card that nothing supersedes.
  function headOf(d) {
    const seen = new Set([d.id]);
    let cur = d;
    while (cur && cur.successorId && !seen.has(cur.successorId)) {
      const s = DATA.find((x) => x.id === cur.successorId);
      if (!s) break;
      seen.add(s.id);
      cur = s;
    }
    return cur;
  }

  function currentNameOf(d) {
    const head = headOf(d);
    if (head && head !== d) return head.name;
    if (kindOf(d) === "deprecation") return d.replacement || "(retired - no successor)";
    return d.name || d.id;
  }

  // The name a rename left behind. A superseded record (status "renamed") already
  // carries the old name as its own `name`; a surviving record keeps prior names in
  // `aliases`, newest-first, so aliases[0] is the immediately-previous name.
  function formerNameOf(d) {
    if (kindOf(d) !== "rename") return "";
    if ((statusValue(d) || "current") === "renamed") return d.name || "";
    return (d.aliases && d.aliases[0]) || "";
  }

  // A tidy multi-line blurb for sharing (LinkedIn post text, Slack, chat).
  function cardBlurb(d, shareLink) {
    const kind = kindOf(d);
    const link = shareLink || entryURL(d.id);
    const fn = factNote(d);
    const factLine = fn ? `\n💡 ${fn}` : "";
    if (kind === "feature") {
      return `🧱 "${d.name}" - new in Databricks (${dateOf(d.introducedAt) || "?"}).\n${whatNote(d)}${factLine}\n${link}`;
    }
    if (kind === "deprecation") {
      const now = currentNameOf(d);
      const successor = now.startsWith("(") ? "retired, no direct replacement" : `use "${now}" now`;
      return `🧱 "${d.name}" is deprecated - ${successor}.\n${whatNote(d)}${factLine}\n${link}`;
    }
    // rename card
    if ((statusValue(d) || "current") === "renamed") {
      return `🧱 It's not called "${d.name}" anymore - it's "${currentNameOf(d)}" now.\n${whatNote(d)}${factLine}\n${link}`;
    }
    return `🧱 "${d.name}" - the current Databricks name (since ${dateOf(d.from) || "?"}).\n${whatNote(d)}${factLine}\n${link}`;
  }

  // Share a single entry on LinkedIn. Mirrors the quiz share: copy the blurb to the
  // clipboard (LinkedIn's share dialog no longer accepts prefilled text) and open the
  // share-offsite dialog pointed at the entry's deep link.
  function shareEntryLinkedIn(d) {
    const link = withUTM(entryShareURL(d.id), {
      source: "linkedin", medium: "social", campaign: "card-share", content: d.id,
    });
    const blurb = cardBlurb(d, link);
    const shareUrl =
      "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link);
    copy(blurb).then((ok) => {
      toast(ok ? "Blurb copied - paste it into your LinkedIn post." : "Opening LinkedIn…");
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    });
  }

  // ---- year timeline (Home) ----
  // Filter buckets in stacking order (top → bottom of each bar); the class suffix
  // colors the segment and its legend swatch, mirroring the status badges.
  const TL_BUCKETS = [
    { key: "current", label: "Latest" },
    { key: "renamed", label: "Renamed" },
    { key: "deprecation", label: "Legacy" },
  ];
  // Per-year counts split by bucket. Computed once - the data is fixed after load;
  // only which buckets are shown changes as the filter toggles.
  let TL_DATA = null;
  let tlRenderedKey = null; // buckets last drawn, so an unrelated re-render doesn't re-animate
  function timelineData() {
    if (TL_DATA) return TL_DATA;
    const byYear = {};
    DATA.forEach((d) => {
      const y = shortYear(changedAt(d));
      if (!y) return;
      const slot = byYear[y] || (byYear[y] = { current: 0, renamed: 0, deprecation: 0 });
      slot[bucketOf(d)]++;
    });
    TL_DATA = { years: Object.keys(byYear).sort(), byYear };
    return TL_DATA;
  }

  // Current release stage, tallied per stage - but only for entries that are LIVE now
  // (the same `current` bucket the "Latest" filter uses). Maturity is meaningless for the
  // other two lifecycles and would lie if counted: a superseded former name freezes at
  // whatever stage it last recorded (e.g. Databricks Delta reads "Private Preview" from
  // 2018), and a deprecated/legacy thing is being retired, not sitting "at GA". The
  // "current" stage of a live entry is the last one actually reached (has a date); entries
  // with no `releases` - or only announced-but-unreached stages - are skipped too, so
  // `total` is the count of live features that carry a real maturity. Computed once.
  let STAGE_DATA = null;
  function stageData() {
    if (STAGE_DATA) return STAGE_DATA;
    const counts = {};
    RELEASE_ORDER.forEach((t) => (counts[t] = 0));
    let total = 0;
    DATA.forEach((d) => {
      if (bucketOf(d) !== "current") return; // renamed + deprecated: maturity is moot
      const rels = d.releases;
      if (!Array.isArray(rels) || !rels.length) return;
      let cur = null;
      rels.forEach((r) => { if (r.date != null) cur = r.type; });
      if (cur && counts[cur] != null) { counts[cur]++; total++; }
    });
    STAGE_DATA = { counts, total };
    return STAGE_DATA;
  }

  // The chart's view switch, shared by both lenses. Selecting a tab only reskins the
  // chart - it never touches the active filter, year, or search.
  function tlTabsHTML() {
    const tab = (v, label) =>
      `<button class="tl-tab" type="button" data-view="${v}" role="tab" aria-selected="${tlView === v}">${escapeHtml(label)}</button>`;
    return `<span class="tl-tabs" role="tablist" aria-label="Chart view">${tab("year", "By year")}${tab("stage", "By stage")}</span>`;
  }
  function wireTlTabs(el) {
    el.querySelectorAll(".tl-tab").forEach((t) => {
      t.addEventListener("click", () => {
        const v = t.dataset.view;
        if (v === tlView) return;
        tlView = v;
        tlRenderedKey = null; // force a rebuild (+ re-animate) on the next render
        track("timeline-view", { view: v });
        renderTimeline();
      });
    });
  }

  function renderTimeline() {
    const el = $("#timeline");
    if (!el) return;
    const { years, byYear } = timelineData();
    if (years.length === 0) { el.hidden = true; return; }

    if (tlView === "stage") { renderStageTimeline(el); return; }

    // Only the buckets the filter currently shows - this is what makes the plot react.
    // Heights rescale to the tallest *visible* year, so hiding a bucket redraws rather
    // than blanks the graph.
    const active = TL_BUCKETS.filter((b) => activeKinds.has(b.key));
    const key = active.map((b) => b.key).join(",") || "none";
    // Same buckets already on screen? Skip the rebuild (and its animation); the
    // selected-year highlight is refreshed separately in updateHomeExtras.
    if (key === tlRenderedKey && el.querySelector(".tl-bar")) return;
    tlRenderedKey = key;

    const totals = years.map((y) => active.reduce((s, b) => s + byYear[y][b.key], 0));
    const max = Math.max(1, ...totals);
    const filtered = active.length < TL_BUCKETS.length;

    const bars = years.map((y, i) => {
      const total = totals[i];
      const h = Math.round((total / max) * 100);
      // One stacked slice per active bucket; flex-grow carries its share of the bar.
      const segs = active.map((b) => {
        const n = byYear[y][b.key];
        if (!n) return "";
        return `<span class="tl-seg tl-seg-${b.key}" style="flex-grow:${n}" title="${n} ${escapeHtml(b.label)}"></span>`;
      }).join("");
      const label = `${total} change${total === 1 ? "" : "s"} in ${escapeHtml(y)}${filtered ? " (filtered)" : ""}`;
      return `<button class="tl-bar" data-year="${escapeAttr(y)}" style="--h:${h}%;--i:${i}" title="${label}" aria-label="${label}"><span class="tl-n">${total}</span><span class="tl-h">${segs}</span></button>`;
    }).join("");

    const axis = years
      .map((y) => `<span class="tl-y" data-year="${escapeAttr(y)}">'${escapeHtml(y.slice(2))}</span>`)
      .join("");
    const legend = active
      .map((b) => `<span class="tl-key"><i class="tl-dot tl-seg-${b.key}"></i>${escapeHtml(b.label)}</span>`)
      .join("");

    el.setAttribute("aria-label", "Changes per year");
    el.innerHTML =
      `<div class="tl-title">${tlTabsHTML()}<span class="tl-hint">- click a bar to filter</span>` +
      `<span class="tl-legend">${legend}</span></div>` +
      `<div class="tl-plot">${bars}</div>` +
      `<div class="tl-axis">${axis}</div>`;
    wireTlTabs(el);

    el.querySelectorAll(".tl-bar").forEach((b) => {
      b.addEventListener("click", () => {
        const y = b.dataset.year;
        // toggle off if the same year is clicked again
        activeYear = activeYear === y ? null : y;
        if (activeYear) track("timeline-year", { year: activeYear });
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
    // Re-apply the selected-year highlight after a rebuild.
    el.querySelectorAll(".tl-bar").forEach((b) =>
      b.classList.toggle("active", b.dataset.year === activeYear)
    );
  }

  // "By stage" lens: the current release maturity of every staged entry, as ordered
  // horizontal bars (Private Preview -> Beta -> Public Preview -> GA). The ramp is an
  // ordered journey and the split is heavily GA-weighted, so bars - not a pie - keep the
  // order legible and the small stages readable. Each bar is directly labeled, so identity
  // never rests on the cool-hue ramp alone (the previews are close in hue). Display-only:
  // it reads the whole dataset and doesn't react to the status filter or feed the list.
  function renderStageTimeline(el) {
    // Already on screen? Skip the rebuild (and its grow animation). A tab switch resets
    // tlRenderedKey to null, so the deliberate switch into this lens still re-animates.
    if (tlRenderedKey === "stage" && el.querySelector(".tl-stage")) return;
    const { counts, total } = stageData();
    // Only the stages actually populated - an empty ramp rung (e.g. nothing in Private
    // Preview right now) would read as a broken bar, so drop it; it returns the moment
    // something lands there.
    const stages = RELEASE_ORDER.filter((t) => counts[t] > 0);
    const max = Math.max(1, ...stages.map((t) => counts[t]));
    const rows = stages.map((t, i) => {
      const n = counts[t];
      const w = Math.round((n / max) * 100);
      const share = total ? Math.round((n / total) * 100) : 0;
      const label = RELEASE_LABELS[t] || t;        // full name - tooltip + aria
      const short = RELEASE_SHORT[t] || label;      // compact axis label (Private / Public / …)
      const tip = `${label} - ${n} of ${total} (${share}%)`;
      // `t` is a trusted constant from RELEASE_ORDER, safe to interpolate into the var name.
      return `<div class="tl-srow" style="--i:${i}" title="${escapeAttr(tip)}">` +
        `<span class="tl-slabel"><i class="tl-dot" style="background:var(--rel-${t})"></i>${escapeHtml(short)}</span>` +
        `<span class="tl-strack"><span class="tl-sfill" style="width:${w}%;background:var(--rel-${t});--i:${i}"></span></span>` +
        `<span class="tl-sval">${n}</span></div>`;
    }).join("");
    const summary = stages.map((t) => `${RELEASE_LABELS[t] || t} ${counts[t]}`).join(", ");
    el.setAttribute("aria-label", `Live features by current release stage: ${summary}`);
    el.innerHTML =
      `<div class="tl-title">${tlTabsHTML()}<span class="tl-hint">- current release stage</span></div>` +
      `<div class="tl-stage" role="img" aria-label="${escapeAttr(summary)}">${rows}</div>` +
      `<div class="tl-stage-foot">${total} live features by their current stage. Renamed and deprecated names are excluded - maturity is moot for them.</div>`;
    wireTlTabs(el);
    tlRenderedKey = "stage";
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
    // A rename's subject is the name that *went away* ("Genie Spaces was renamed"),
    // not where it landed. Features/deprecations just name the thing itself.
    const former = kind === "rename" ? formerNameOf(pick) : "";
    const subject = former || currentNameOf(pick);
    el.innerHTML =
      `<span class="sp-tag">On this month</span>` +
      `<span class="sp-text"><b>${escapeHtml(subject)}</b> was ${verb} <b>${ago}</b> (${escapeHtml(fmtDate(when))}). ` +
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
      d.name,           // every card's own name
      d.abbr,           // rename cards
      d.replacement,    // deprecations without a successor card
      d.category,
      whatNote(d),
      ...(d.aliases || []),
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();
  }

  // A card's "when": a rename card's is when that name took effect (`from`); a
  // deprecation's is when it was removed, else deprecated; a feature's is introduced.
  // When the change this entry represents actually happened - so the timeline files
  // each event under the year it occurred, not when the name first existed.
  //   feature     -> introduced
  //   deprecation -> deprecated (fall back to removed if that's all we have)
  //   rename      -> a superseded name's change is when the new name took over (to);
  //                  the surviving current name's change is when it took effect (from).
  function changedAt(d) {
    const k = kindOf(d);
    if (k === "feature") return dateOf(d.introducedAt) || "";
    if (k === "deprecation") return dateOf(d.deprecatedAt) || dateOf(d.removedAt) || "";
    return (statusValue(d) || "current") === "renamed"
      ? (dateOf(d.to) || dateOf(d.from) || "")
      : (dateOf(d.from) || dateOf(d.to) || "");
  }

  // The logical family an entry belongs to. `status` is the sole stored discriminator, but
  // it does NOT distinguish a standalone feature from the current tip of a rename chain -
  // both are "active". That split is calculated, not stored: a feature carries its own
  // `introducedAt`; a rename tip carries `from`. deprecated/legacy/retired => deprecation;
  // renamed => rename; active => feature if it has introducedAt, else a rename (current tip).
  function kindOf(d) {
    const s = statusValue(d);
    if (s === "deprecated" || s === "legacy" || s === "retired") return "deprecation";
    if (s === "renamed") return "rename";
    return d.introducedAt ? "feature" : "rename";
  }

  // Which status filter bucket an entry falls in - aligned with the badge the card
  // shows, NOT with kindOf. A newly shipped feature and the current-name side of a
  // rename both read as "current"; only a superseded former name is "renamed". This is
  // what the top-of-results filter toggles, so unchecking "Current" hides everything
  // currently in use, whether it got here by launch or by rename.
  function bucketOf(d) {
    const k = kindOf(d);
    if (k === "deprecation") return "deprecation";
    if (k === "feature") return "current";
    return (statusValue(d) || "current") === "renamed" ? "renamed" : "current";
  }

  // Mixed-precision dates ("2025" vs "2025-06") don't compare lexicographically -
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

  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Display a raw date token: "2026-07" -> "July 2026", "2021" -> "2021".
  // Anything that isn't YYYY or YYYY-MM (incl. "?") is returned unchanged.
  function fmtDate(dateStr) {
    const s = String(dateStr ?? "").trim();
    const m = /^(\d{4})-(\d{1,2})$/.exec(s);
    if (!m) return s;
    const month = MONTHS[Number(m[2]) - 1];
    return month ? `${month} ${m[1]}` : s;
  }

  // `from` and `to` are now { date, link } objects - the date plus a URL confirming it
  // (link may be null, and a bare string is still accepted for resilience). `dateOf`
  // pulls the raw date token; `linkOf` pulls the confirmation URL.
  function dateOf(v) {
    return v && typeof v === "object" ? String(v.date ?? "") : String(v ?? "");
  }
  function linkOf(v) {
    return v && typeof v === "object" && v.link ? String(v.link) : "";
  }

  // Render `text` as plain escaped text, followed by a bare 🔗 that is the ONLY link when
  // a URL is given - the date/text itself is never wrapped in the anchor. Shared by the
  // date chips and the occasion note. With no URL, just the plain escaped text.
  function srcLink(text, url, title) {
    const label = escapeHtml(text);
    if (!url) return label;
    const aria = title || `Source for ${text}`;
    const tip = title ? ` title="${escapeAttr(title)}"` : "";
    return `${label}<a class="date-src" href="${escapeAttr(url)}" target="_blank" rel="noopener"${tip} ` +
      `aria-label="${escapeAttr(aria)}"><span class="date-src-mark" aria-hidden="true">🔗</span></a>`;
  }

  // A date token rendered with its confirmation link, when one exists: the formatted
  // date becomes a source-linked chip carrying a small 🔗 mark; otherwise it's plain
  // escaped text. Returns HTML (the date line is inserted unescaped).
  function dateLinkHTML(v) {
    const txt = fmtDate(dateOf(v)) || "?";
    return srcLink(txt, linkOf(v), `Source confirming ${txt}`);
  }

  // Takes RAW text, matches on it, and escapes each piece separately - matching on
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

  // Build the contact mailto link at runtime from split data attributes, so the full
  // address never appears in the served HTML (basic protection against email scrapers).
  (function setupContactEmail() {
    const host = $("#contact-email");
    if (!host) return;
    const user = host.dataset.user;
    const domain = host.dataset.domain;
    if (!user || !domain) return;
    const addr = user + "@" + domain;
    const a = document.createElement("a");
    a.href = "mailto:" + addr;
    a.textContent = addr;
    a.rel = "nofollow";
    host.replaceChildren(a);
  })();

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
