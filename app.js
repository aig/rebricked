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
  // loaded — tracking must never affect the app, so every call is guarded.
  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) {}
  }

  let DATA = [];
  let activeCategory = null;
  let activeSection = null; // {label, ids} when a rail section is selected
  // Multi-select status filter, keyed on the badge a card shows (see bucketOf), not on
  // kindOf. "All" is derived: it's active exactly when all three buckets are selected.
  // Toggling any bucket off deselects "All" too.
  const KIND_KEYS = ["current", "renamed", "deprecation"];
  let activeKinds = new Set(KIND_KEYS);
  const allKindsSelected = () => KIND_KEYS.every((k) => activeKinds.has(k));
  const filterOn = (key) => (key === "all" ? allKindsSelected() : activeKinds.has(key));
  const resetKinds = () => { activeKinds = new Set(KIND_KEYS); };
  let activeYear = null;    // "2025" etc. when a timeline bar is selected
  let focusId = null;       // a single deep-linked entry (#id), overrides everything
  let lastRouletteId = null; // last randomizer winner, to avoid picking it twice running

  // Rotated on each empty render so the deadpan doesn't get stale.
  const EMPTY_LINES = [
    "Either it was never renamed,<br>or it was renamed to something you haven't heard yet.",
    "Nothing here. Check back after the next summit keynote.",
    "No matches. It may have been renamed to a synonym of the word you typed.",
    "Zero results — which, for Databricks, is statistically surprising.",
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
    { key: "current", label: "Active", hint: "In use now — new, preview and current names" },
    { key: "renamed", label: "Renamed", hint: "Superseded former names" },
    { key: "deprecation", label: "Legacy", hint: "Deprecated or retired" },
  ];

  // ---- sidebar config: mirrors the Databricks console rail ----
  // Every item is clickable. `ids` lists the databricks.json entries that changed under
  // that section; those items get a dot. Sections with no renames show an empty state.
  // Home clears the filter and shows everything.
  const NAV = [
    { label: "", items: [
      { label: "Home", icon: "home", home: true },
      { label: "Learn", icon: "learn" },
      { label: "Workspace", icon: "workspace", ids: ["repos", "databricks-repos", "legacy-cli", "databricks-cli", "serverless-workspaces", "pat", "oauth-token-federation", "databricks-connect-legacy", "databricks-connect"] },
      { label: "Recents", icon: "recents" },
      { label: "Catalog", icon: "catalog", ids: ["catalog-explorer", "data-explorer", "unity-catalog", "uc-volumes", "dbfs-mounts", "lakehouse-federation", "delta-sharing", "delta-sharing-former", "delta-lake", "databricks-delta", "liquid-clustering", "hive-metastore", "abac", "uc-managed-iceberg", "clean-rooms"] },
      { label: "Jobs & Pipelines", icon: "jobs", ids: ["dlt", "delta-live-tables", "workflows", "workflows-former", "bundles", "databricks-asset-bundles", "dbx", "pipelines-editor", "multi-file-editor"] },
      { label: "Compute", icon: "compute", ids: ["lakebase", "access-modes", "shared-single-user-access-modes", "no-isolation-shared", "dbfs-init-scripts"] },
      { label: "Discover", icon: "discover" },
      { label: "Marketplace", icon: "marketplace" },
    ]},
    { label: "SQL", items: [
      { label: "SQL Editor", icon: "sqlEditor", ids: ["databricks-sql", "sql-analytics", "legacy-sql-editor", "new-sql-editor"] },
      { label: "Queries", icon: "queries" },
      { label: "Dashboards", icon: "dashboards", ids: ["dashboards", "lakeview-dashboards", "legacy-dashboards"] },
      { label: "Genie Agents", icon: "genie", ids: ["genie-spaces", "genie-spaces-former", "databricks-one", "databricks-one-former", "genie-code", "databricks-assistant"] },
      { label: "Alerts", icon: "alerts", ids: ["legacy-sql-alerts", "sql-alerts-new"] },
      { label: "Query History", icon: "history" },
      { label: "SQL Warehouses", icon: "warehouse", ids: ["sql-endpoint", "sql-endpoint-former", "odbc-driver", "simba-spark-odbc-driver", "lakehouse-rt"] },
    ]},
    { label: "Data Engineering", items: [
      { label: "Runs", icon: "runs" },
      { label: "Data Ingestion", icon: "ingestion" },
      { label: "Visual Data Prep", icon: "dataprep", ids: ["lakeflow-designer"] },
    ]},
    { label: "AI/ML", items: [
      { label: "Playground", icon: "playground" },
      { label: "Agents", icon: "agents", ids: ["vector-search", "databricks-vector-search", "mosaic-ai-vector-search", "supervisor-agent", "agent-bricks-multi-agent-supervisor"] },
      { label: "AI Gateway", icon: "gateway" },
      { label: "Experiments", icon: "experiments" },
      { label: "Features", icon: "features", ids: ["workspace-feature-store", "feature-engineering-uc"] },
      { label: "Models", icon: "models", ids: ["workspace-model-registry", "models-in-uc"] },
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
        setSidebarOpen(false); // on mobile the rail overlays the content — close it after a pick
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    // The kind-filter counts must track this same scope, so update them now.
    updateFilterCounts();

    const q = searchEl.value.trim().toLowerCase();
    let rows = contextRows();

    // The status filter is orthogonal — it narrows whatever's showing.
    if (!allKindsSelected()) {
      rows = rows.filter((d) => activeKinds.has(bucketOf(d)));
    }

    // The timeline year filter is likewise orthogonal.
    if (activeYear) {
      rows = rows.filter((d) => shortYear(changedAt(d)) === activeYear);
    }

    // Most recently changed first — the freshest confusion on top.
    rows.sort((a, b) => dateKey(changedAt(b)).localeCompare(dateKey(changedAt(a))));

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
        ? `<div class="empty">Nothing${kindNote}${yearNote} under <b>${escapeHtml(activeSection.label)}</b> — yet.<br>Either it kept its name, or Databricks hasn't gotten to it.</div>`
        : `<p class="empty">No results${kindNote}${yearNote}. ${line}</p>`;
      return;
    }

    resultsEl.innerHTML = groupedByPeriod(rows, activeSection ? "" : q);
    wireRows();
  }

  // Group key + label for the chronological dividers: the year of the change.
  function periodOf(d) {
    const y = shortYear(changedAt(d));
    return { key: y || "—", label: y || "undated" };
  }

  // The list is already sorted newest-change-first, so walking it top-to-bottom and
  // emitting a divider each time the year flips groups the cards into a chronological
  // path — one dated section per year, newest at the top.
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
      `<div class="year-sep" role="separator" aria-label="Changed in ${escapeAttr(label)} — ${escapeAttr(count)}">` +
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
    // Spotlight stays up across filter toggles and year selections — anything on the
    // main list. It hides only when the user drills into an entry/section/category/search.
    if (sp) sp.hidden = !onList;
  }

  function rowHTML(d, q) {
    const kind = kindOf(d);

    const note = d.note ? `<p class="row-note">${escapeHtml(d.note)}</p>` : "";
    // A real-but-fun fact about the feature — genuinely true, grounded in each
    // entry's history; the tone is ours.
    const fact = d.fact
      ? `<p class="row-fact"><span class="fact-icon" aria-hidden="true">💡</span> ${escapeHtml(d.fact)}</p>`
      : "";
    const occasion = d.occasion ? ` · ${escapeHtml(d.occasion)}` : "";

    const badge = statusBadge(d);
    let trail, dateText, urgent = "", rowCls = "";
    if (kind === "feature") {
      rowCls = " is-feature";
      trail = featureTrail(d, q);
      dateText = `Introduced ${escapeHtml(fmtDate(d.introducedAt || "?"))}${occasion}`;
    } else if (kind === "deprecation") {
      const status = d.status || "deprecated";
      // legacy (no formal end date) gets its own quiet slate spine; a dated
      // deprecation/retirement keeps the amber one.
      rowCls = status === "legacy" ? " is-legacy" : " is-deprecation";
      trail = depTrail(d, q);
      const verb = status === "legacy" ? "Legacy since" : "Deprecated";
      dateText = `${verb} ${escapeHtml(fmtDate(d.deprecatedAt || "?"))}${occasion}`;
      // The concrete access cut-off, flagged on its own — the one lifecycle date a
      // reader actually needs to act on, rather than buried mid-sentence.
      if (d.removedAt) urgent = `<span class="meta-urgent">⚠ Access ended ${escapeHtml(fmtDate(d.removedAt))}</span>`;
    } else {
      trail = renameTrail(d, q);
      if ((d.status || "current") === "renamed") {
        rowCls = " is-former";
        const span = d.from && d.to
          ? `${escapeHtml(fmtDate(d.from))} – ${escapeHtml(fmtDate(d.to))}`
          : d.to ? `until ${escapeHtml(fmtDate(d.to))}` : escapeHtml(fmtDate(d.from || "?"));
        dateText = `In use ${span}${occasion}`;
      } else {
        rowCls = " is-current"; // current-name side of a rename — same Latest/green bucket
        dateText = `Current since ${escapeHtml(fmtDate(d.from || "?"))}${occasion}`;
      }
    }

    // The rename history as one scannable line: predecessors → this card → successors,
    // each other name linking to its own card. Replaces the successor/predecessor
    // mini-cards, which repeated this card's description verbatim.
    const chain = lineageChain(d);

    // Classified reference links so every claim is checkable.
    const refs = refsSection(d);

    // Footer: references on the left; the utility actions (copy link, share) on the
    // right. The "guess the next name" gag moved into the lineage chain as its
    // trailing, future-name node (see lineageChain).
    const actions = `<div class="row-actions">
            <button class="row-act" data-act="link" title="Copy a link to this entry" aria-label="Copy link to this entry">${ICON.link}</button>
            <button class="row-act" data-act="share" title="Share this entry on LinkedIn" aria-label="Share this entry on LinkedIn">${ICON.linkedin}</button>
          </div>`;
    const foot = `<div class="row-foot">${refs || "<span></span>"}<div class="row-foot-actions">${actions}</div></div>`;

    // Top strip: category on the left, the status badge on the right.
    const catHTML = d.category ? `<span class="cat">${escapeHtml(d.category)}</span>` : "";
    const meta = (dateText || urgent)
      ? `<div class="row-meta"><span class="date">${dateText}</span>${urgent}</div>`
      : "";

    return `
      <article class="row${rowCls}" data-id="${escapeAttr(d.id)}">
        <div class="row-eyebrow">
          ${catHTML}
          ${badge}
        </div>
        <div class="row-main">
          <div class="lineage">${trail}</div>
        </div>
        ${chain}
        <p class="row-what">${escapeHtml(d.what || "")}</p>
        ${meta}
        ${fact}
        ${note}
        ${foot}
      </article>`;
  }

  // The card's "current status" badge — one per kind.
  function statusBadge(d) {
    const kind = kindOf(d);
    if (kind === "deprecation") {
      const status = d.status || "deprecated";
      return `<span class="badge badge-${escapeAttr(status)}">${escapeHtml(status)}</span>`;
    }
    if (kind === "feature") {
      const status = d.status || "ga";
      const label = status === "preview" ? "preview" : "new";
      return `<span class="badge badge-${escapeAttr(status)}">${escapeHtml(label)}</span>`;
    }
    // rename card: the name in use now vs. a superseded one
    if ((d.status || "current") === "renamed") {
      return `<span class="badge badge-former">renamed</span>`;
    }
    return `<span class="badge badge-current">latest</span>`;
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
  // the full history — without the mini-cards that repeated this card's description.
  function lineageChain(d) {
    const preds = predecessorsOf(d).slice().reverse(); // oldest-first
    const succs = successorsOf(d);
    // The "guess the sequel" gag now lives as the trailing node of the chain — the
    // made-up *next* name, sitting right after the live tip. Only on a card that is
    // itself the current tip (renames' former sides and deprecations don't forecast).
    const guess = kindOf(d) !== "deprecation" && (d.status || "current") !== "renamed"
      ? oddsBadge(d) : "";
    if (!preds.length && !succs.length && !guess) return "";
    // A node is "former" — struck through — when its own record is a superseded rename
    // or a deprecation, whether it's the card's own name or a predecessor in the chain.
    const isFormer = (x) =>
      kindOf(x) === "deprecation" ||
      (kindOf(x) === "rename" && (x.status || "current") === "renamed");
    const node = (x, isNow) => {
      const nm = x.name || currentNameOf(x);
      const former = isFormer(x) ? " former" : "";
      if (isNow) {
        // No year on the current node — the eyebrow above already carries this card's
        // date, and repeating it can read as backwards next to a successor that shipped
        // in an earlier year (e.g. a 2025 replacement for a 2026 deprecation).
        return `<span class="chain-node now${former}">${escapeHtml(nm)}</span>`;
      }
      const yr = shortYear(changedAt(x));
      const yrHTML = yr ? ` <span class="chain-yr">’${escapeHtml(yr.slice(2))}</span>` : "";
      return `<a class="chain-node${former}" href="#${escapeAttr(encodeURIComponent(x.id))}" ` +
        `title="Open “${escapeAttr(nm)}”">${escapeHtml(nm)}${yrHTML}</a>`;
    };
    const parts = [
      ...preds.map((p) => node(p, false)),
      node(d, true),
      ...succs.map((s) => node(s, false)),
    ];
    if (guess) parts.push(guess); // the forecast pill rides in the last, future-name slot
    return `<div class="lineage-chain">` +
      parts.join(`<span class="chain-flow" aria-hidden="true">→</span>`) +
      `</div>`;
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
        (x.what ? `<span class="rel-what">${escapeHtml(x.what)}</span>` : "") +
      `</a>`;
    }).join("");
    return `<div class="rel-group"><span class="rel-label">${escapeHtml(label)}${plural}</span><div class="rel-items">${rows}</div></div>`;
  }

  // Classified reference links. The canonical `source` is the official link; the
  // optional `links` array adds more, each tagged official / community / internet.
  const REF_ORDER = { official: 0, community: 1, internet: 2 };
  const REF_KINDS = { official: "Official", community: "Community", internet: "Internet" };
  function refLinks(d) {
    const out = [];
    if (d.source) out.push({ url: d.source, kind: "official", label: "" });
    if (Array.isArray(d.links)) {
      for (const l of d.links) {
        if (l && typeof l.url === "string" && REF_KINDS[l.kind]) {
          out.push({ url: l.url, kind: l.kind, label: typeof l.label === "string" ? l.label : "" });
        }
      }
    }
    return out;
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function refsSection(d) {
    const links = refLinks(d);
    if (!links.length) return "";
    links.sort((a, b) => (REF_ORDER[a.kind] ?? 9) - (REF_ORDER[b.kind] ?? 9));
    const chips = links.map((l) => {
      // The link text is just its kind now; the source (label or domain) rides in a
      // styled tooltip on hover/focus, so the chips stay compact.
      const src = l.label || hostOf(l.url) || REF_KINDS[l.kind];
      return `<a class="ref-chip ref-${escapeAttr(l.kind)}" href="${escapeAttr(l.url)}" target="_blank" rel="noopener" ` +
        `data-tip="${escapeAttr(src)}" aria-label="${escapeAttr(REF_KINDS[l.kind])} — ${escapeAttr(src)}">` +
        `<span class="ref-dot" aria-hidden="true"></span>` +
        `<span class="ref-kind">${escapeHtml(REF_KINDS[l.kind])}</span></a>`;
    }).join("");
    return `<div class="row-refs"><div class="ref-chips">${chips}</div></div>`;
  }

  // The AI-guess button. No fake odds — just an invitation to have the "AI" make up
  // the next name. The button carries the whole made-up shortlist; the first click
  // reveals the seeded guess and each later click rolls a new one. Seed is
  // deterministic per entry so the first guess doesn't flicker between renders.
  function oddsBadge(d) {
    const preds = Array.isArray(d.prediction) ? d.prediction.filter(Boolean) : [];
    if (!preds.length) return "";
    const start = hashStr(d.id + "p") % preds.length;
    return `<button class="odds-btn" data-preds="${escapeAttr(JSON.stringify(preds))}" data-i="${start}" title="Our AI's best guess at the next rebrand">✨ Ask Genie</button>`;
  }

  // The AI-guess button reveals a made-up next name: a beat of "thinking", then the
  // button's own label becomes ✨ <the guess>, keeping the same styling and position.
  // Click it again to roll a new one — it cycles through the entry's shortlist.
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
    const when = d.introducedAt ? escapeAttr(d.introducedAt) : "";
    return `<span class="current feature-name" data-name="${escapeAttr(d.name)}" data-feature="1" data-when="${when}" title="click to copy">${highlight(d.name, q)}</span>`;
  }

  // Each name in a product's history is its own card; the title is just this card's
  // name. Predecessors/successors are shown as their own linked cards below.
  // A former name carries its current name too, so clicking it copies a correction
  // that points forward — not one that mislabels the old name as the current one.
  function renameTrail(d, q) {
    const name = d.name || d.id;
    const renamed = (d.status || "current") === "renamed";
    const current = renamed ? currentNameOf(d) : "";
    // Only treat it as "former" for copy purposes when we actually know the name
    // it became; otherwise fall back to the plain current-name correction.
    const isFormer = renamed && current && current !== name && !current.startsWith("(");
    // The title reads the same across every card type — plain, not struck. The
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
        <p><strong>Couldn't load <code>databricks.json</code>.</strong></p>
        <p>If you opened this file directly, your browser blocked the fetch.<br>
        Serve it over http instead — from this folder run:</p>
        <p><code>python -m http.server</code></p>
        <p>then open <code>http://localhost:8000</code>. It's a static site; that's all it needs.</p>
      </div>`;
  }

  function renderChips() {
    // Category chips are hidden — the chips row renders empty.
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
      el.textContent = `Accurate as of ${latest} — the last time we checked. Given the subject, it may already be wrong.`;
    }
  }

  // ---- interactions ----
  function wireStaticControls() {
    let searchTrackTimer = null;
    searchEl.addEventListener("input", () => {
      activeSection = null; // manual typing clears any rail-section filter
      focusId = null;
      activeYear = null;
      setActiveNav(null);
      writeURL();
      render();
      // Track the settled query, not every keystroke. Terms are product names, not PII.
      clearTimeout(searchTrackTimer);
      searchTrackTimer = setTimeout(() => {
        const q = searchEl.value.trim().toLowerCase();
        if (q.length >= 2) track("search", { term: q });
      }, 800);
    });

    // Back/forward and pasted-in-place links.
    window.addEventListener("hashchange", () => { applyRoute(); render(); });

    // Quiz overlay controls.
    const quizOpen = $("#quiz-open");
    if (quizOpen) quizOpen.addEventListener("click", () => { track("quiz-open"); openQuiz(); });
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
    // Living products only — you can't rename what's already retired.
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
      `<p class="new-copy">Why would you need a <b>new</b> product? Around here we don't create products — we <b>rename</b> the ones we already have. It's cheaper, it ships faster, and it comes with a keynote slide.</p>` +
      `<p class="new-suggest">May we suggest: <b>${escapeHtml(currentNameOf(pick))}</b> <span class="arrow">→</span> <b>${escapeHtml(pick.prediction[Math.floor(Math.random() * pick.prediction.length)])}</b></p>` +
      `<p class="new-fine">Not a real roadmap. We made this up — but give it a year.</p>` +
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

  // The "truth" — deadpan realities about naming things at Databricks. Naming is
  // done to you, not by you.
  const TRUTHS = [
    "Here's the truth: you don't get to name it. Around here we don't create products — we rename the ones we already have. It's cheaper, ships faster, and comes with a keynote slide.",
    "The truth: whatever you call it, the Naming Committee renamed it before you finished typing. Every product name must legally contain “Lakeflow”, “Genie”, or “Unity”.",
    "The truth: it'll ship under that name for about a year, marinate through two summits and a leadership offsite, and come back with a “Mosaic AI” prefix nobody asked for.",
    "The truth: naming rights require a keynote slot, a rebrand budget, and at least one acquisition — none of which a new product currently has.",
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

  // Step two: the deadpan truth — now that they've committed to a name. Where we can,
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

  function wireRows() {
    // per-card actions: deep link + shareable blurb
    resultsEl.querySelectorAll(".row-act").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".row");
        const d = DATA.find((x) => x.id === row.dataset.id);
        if (!d) return;
        if (btn.dataset.act === "link") {
          const url = entryURL(d.id);
          track("copy-link", { id: d.id });
          copy(url).then((ok) =>
            toast(ok ? `Link copied — ${url}` : "Copy failed — select it manually.")
          );
        } else if (btn.dataset.act === "share") {
          track("share", { id: d.id });
          shareEntryLinkedIn(d);
        }
      });
    });

    // the AI-prediction reveal
    resultsEl.querySelectorAll(".odds-btn").forEach((btn) => {
      btn.addEventListener("click", () => { track("guess-name"); revealPrediction(btn); });
    });

    // copy-as-you-were-wrong: clicking any card title copies a snappy correction.
    // A former/deprecated name copies the name it became — never itself as "current".
    resultsEl.querySelectorAll(".current, .dep-name").forEach((el) => {
      el.addEventListener("click", () => {
        const name = el.dataset.name;
        let text;
        if (el.dataset.feature) {
          const when = el.dataset.when ? ` (since ${el.dataset.when})` : "";
          text = `Yes, "${name}" is a real Databricks feature${when}.`;
        } else if (el.dataset.dep) {
          text = el.dataset.current
            ? `Actually, "${el.dataset.old}" is deprecated — use "${el.dataset.current}" now.`
            : `Actually, "${el.dataset.old}" is deprecated.`;
        } else if (el.dataset.former) {
          text = `Actually, "${name}" is the old name — it's "${el.dataset.current}" now.`;
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
  const QUIZ_KEYS = ["A", "B", "C", "D"]; // Millionaire-style answer labels
  // marks[] holds one true/false per answered question, driving the money-tree ladder.
  const quizState = { score: 0, total: 0, streak: 0, answered: false, asked: [], lastId: null, marks: [] };
  let quizReturnFocus = null; // element to restore focus to when the dialog closes

  // Entries that pose a fair "what's it called now?" question: renames (old → current)
  // and deprecations with a named replacement.
  function quizPool() {
    return DATA.filter((d) => {
      const k = kindOf(d);
      // a former name whose current name is knowable, or a deprecation with a successor
      if (k === "rename") return (d.status === "renamed") && !currentNameOf(d).startsWith("(");
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
    renderLadder();
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

  // Directory of the current page, so links resolve at "/" and at "/rebricked/".
  function pageDir() {
    return location.pathname.replace(/[^/]*$/, "");
  }

  // The shared link is the badge page for this score (badges/<n>-of-5/) — a real page
  // with Open Graph tags, so the badge shows in the preview. Only reachable once the
  // round is complete, which is also the only time the share button is shown.
  function quizResultURL() {
    return location.origin + pageDir() + "badges/" + quizState.score + "-of-" + QUIZ_LEN + "/";
  }

  function shareQuizLinkedIn() {
    const pct = quizState.total
      ? Math.round((quizState.score / quizState.total) * 100)
      : 0;
    const link = withUTM(quizResultURL(), {
      source: "linkedin", medium: "social", campaign: "quiz-share",
    });
    const text =
      `I scored ${quizState.score}/${quizState.total} (${pct}%) on REbricked — the quiz for ` +
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
    // Sharing sends the badge page for the finished round, so only offer it once the
    // round is complete — a mid-round score has no badge page to link to.
    const share = $("#quiz-share");
    if (share) share.hidden = quizState.total < QUIZ_LEN;
  }

  // The money-tree ladder: one segment per question — answered ones show
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
    // Harder: seed distractors with THIS product's own plausible-but-fake future names
    // (the most tempting wrong answers), then fill from every other name and predicted
    // name across the dataset. A deprecation has no predictions of its own, so borrow
    // the replacement's — same successor, plausible next rebrands (e.g. "DBFS mounts" →
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

    // Lock in the pick and hold — the "is that your final answer?" beat — then reveal.
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
          ? `<span class="quiz-ok">Correct — you kept up.</span>`
          : `<span class="quiz-no">Nope — it moved on without you.</span>`;
        const done = quizState.total >= QUIZ_LEN;
        // The entry opens in a new tab so the quiz stays open behind it.
        foot.innerHTML =
          `<p class="quiz-chain">` +
          `<span class="old">${escapeHtml(quizPrompt(entry))}</span>` +
          `<span class="arw">→</span>` +
          `<span class="new">${escapeHtml(answer)}</span></p>` +
          `<p class="quiz-expl">${verdict} ${escapeHtml(entry.what || "")}</p>` +
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
    else if (pct >= 60) verdict = "Not bad — you mostly kept up with the renaming.";
    else if (pct >= 20) verdict = "Rough. In fairness, so is keeping track of this.";
    else verdict = "It's fine. Everything got renamed since you last looked anyway.";

    body.innerHTML =
      `<div class="quiz-result">` +
      `<p class="quiz-final">You scored <b>${quizState.score} / ${QUIZ_LEN}</b> <span class="quiz-pct">(${pct}%)</span></p>` +
      `<p class="quiz-verdict">${escapeHtml(verdict)}</p>` +
      `<div class="quiz-actions">` +
      `<a class="quiz-see" id="quiz-badge" href="${escapeAttr(quizResultURL())}" target="_blank" rel="noopener">See your badge ↗</a>` +
      `<div class="new-links">` +
      `<button class="quiz-see" id="quiz-again">Play again</button>` +
      `<button class="quiz-next" id="quiz-done">Done</button>` +
      `</div>` +
      `</div>` +
      `</div>`;
    const again = $("#quiz-again");
    if (again) again.addEventListener("click", () => {
      quizState.score = 0;
      quizState.total = 0;
      quizState.streak = 0;
      quizState.asked = [];
      quizState.lastId = null;
      quizState.marks = [];
      renderLadder();
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

  // Append UTM params to a URL's query string — kept before any #fragment so analytics
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

  // Walk the successor chain to the end — the card that nothing supersedes.
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
    if (kindOf(d) === "deprecation") return d.replacement || "(retired — no successor)";
    return d.name || d.id;
  }

  // A tidy multi-line blurb for sharing (LinkedIn post text, Slack, chat).
  function cardBlurb(d, shareLink) {
    const kind = kindOf(d);
    const link = shareLink || entryURL(d.id);
    const factLine = d.fact ? `\n💡 ${d.fact}` : "";
    if (kind === "feature") {
      return `🧱 "${d.name}" — new in Databricks (${d.introducedAt || "?"}).\n${d.what || ""}${factLine}\n${link}`;
    }
    if (kind === "deprecation") {
      const now = currentNameOf(d);
      const successor = now.startsWith("(") ? "retired, no direct replacement" : `use "${now}" now`;
      return `🧱 "${d.name}" is deprecated — ${successor}.\n${d.what || ""}${factLine}\n${link}`;
    }
    // rename card
    if ((d.status || "current") === "renamed") {
      return `🧱 It's not called "${d.name}" anymore — it's "${currentNameOf(d)}" now.\n${d.what || ""}${factLine}\n${link}`;
    }
    return `🧱 "${d.name}" — the current Databricks name (since ${d.from || "?"}).\n${d.what || ""}${factLine}\n${link}`;
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
      toast(ok ? "Blurb copied — paste it into your LinkedIn post." : "Opening LinkedIn…");
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    });
  }

  // ---- year timeline (Home) ----
  // Filter buckets in stacking order (top → bottom of each bar); the class suffix
  // colors the segment and its legend swatch, mirroring the status badges.
  const TL_BUCKETS = [
    { key: "current", label: "Active" },
    { key: "renamed", label: "Renamed" },
    { key: "deprecation", label: "Legacy" },
  ];
  // Per-year counts split by bucket. Computed once — the data is fixed after load;
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

  function renderTimeline() {
    const el = $("#timeline");
    if (!el) return;
    const { years, byYear } = timelineData();
    if (years.length === 0) { el.hidden = true; return; }

    // Only the buckets the filter currently shows — this is what makes the plot react.
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

    el.innerHTML =
      `<div class="tl-title">Changes by year <span class="tl-hint">— click a bar to filter</span>` +
      `<span class="tl-legend">${legend}</span></div>` +
      `<div class="tl-plot">${bars}</div>` +
      `<div class="tl-axis">${axis}</div>`;

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
      d.name,           // every card's own name
      d.abbr,           // rename cards
      d.replacement,    // deprecations without a successor card
      d.category,
      d.what,
      ...(d.aliases || []),
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();
  }

  // A card's "when": a rename card's is when that name took effect (`from`); a
  // deprecation's is when it was removed, else deprecated; a feature's is introduced.
  function changedAt(d) {
    return d.from || d.removedAt || d.deprecatedAt || d.introducedAt || "";
  }

  // Normalize an entry to one of the three underlying kinds. Absent kind => rename.
  function kindOf(d) {
    return d.kind === "deprecation" || d.kind === "feature" ? d.kind : "rename";
  }

  // Which status filter bucket an entry falls in — aligned with the badge the card
  // shows, NOT with kindOf. A newly shipped feature and the current-name side of a
  // rename both read as "current"; only a superseded former name is "renamed". This is
  // what the top-of-results filter toggles, so unchecking "Current" hides everything
  // currently in use, whether it got here by launch or by rename.
  function bucketOf(d) {
    const k = kindOf(d);
    if (k === "deprecation") return "deprecation";
    if (k === "feature") return "current";
    return (d.status || "current") === "renamed" ? "renamed" : "current";
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
