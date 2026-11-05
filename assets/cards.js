import { loadRegistry, labelFor } from "./registry-data.js?v=20261001";

const DASHBOARD_TIMEOUT_MS = 8000;

const SUMMARY_PILL = {
  ok: { text: "Operational", tone: "ok" },
  attention: { text: "Needs attention", tone: "warn" },
  degraded: { text: "Degraded", tone: "bad" },
  unknown: { text: "Unknown", tone: "" },
};

// Blocks javascript: and data: URLs from registry entries and API payloads.
function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pill(text, tone) {
  return el("span", tone ? `pill ${tone}` : "pill", text);
}

function linkButton(label, href) {
  const url = safeUrl(href);
  if (!url) {
    const disabled = el("span", "card-link disabled", label);
    disabled.title = "Not available";
    return disabled;
  }
  const link = el("a", "card-link", label);
  link.href = url;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  return link;
}

function dashboardPageUrl(apiUrl) {
  return apiUrl ? apiUrl.replace(/\/api\/dashboard$/, "/dashboard") : null;
}

function formatDate(value) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isBlock(value) {
  return value && typeof value === "object" && value.status !== "unavailable" && value.status !== "not_applicable";
}

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 10) / 10}%` : null;
}

// Rows are [label, value]; rows without a value are skipped, so missing API blocks never show guesses.
function metricRows(data) {
  const rows = [];
  const summary = data.tests?.summary;
  if (isBlock(data.tests) && summary && Number.isFinite(summary.total) && Number.isFinite(summary.passed)) {
    rows.push(["Tests", `${summary.passed} of ${summary.total} passing`]);
  }
  if (isBlock(data.issues) && Number.isFinite(data.issues.open)) {
    rows.push(["Open issues", String(data.issues.open)]);
  }
  if (isBlock(data.dependencies) && Number.isFinite(data.dependencies.totalAlerts)) {
    rows.push(["Dependency alerts", String(data.dependencies.totalAlerts)]);
  }
  const uptime = percent(data.operations?.uptime?.["24h"]?.percent);
  if (isBlock(data.operations) && uptime) rows.push(["Uptime (24h)", uptime]);

  const deployed = formatDate(data.summary?.lastDeployedAt ?? data.deployment?.builtAt);
  if (deployed) rows.push(["Last deployed", deployed]);
  if (isBlock(data.deployment) && typeof data.deployment.environment === "string") {
    rows.push(["Environment", data.deployment.environment]);
  }
  if (typeof data.app?.version === "string" && data.app.version) rows.push(["Version", data.app.version]);
  return rows;
}

function renderMetrics(container, data) {
  container.replaceChildren();
  const rows = metricRows(data);
  if (rows.length === 0) {
    container.append(el("p", "empty", "The dashboard returned no summary values."));
    return;
  }
  const list = el("dl", "card-metrics");
  for (const [label, value] of rows) {
    const row = el("div");
    row.append(el("dt", "", label), el("dd", "", value));
    list.append(row);
  }
  container.append(list);
}

function applyStatus(statusPill, data) {
  const healthStatus = data.health?.status;
  const key = data.summary?.status ?? (healthStatus === "ok" || healthStatus === "degraded" ? healthStatus : "unknown");
  const state = SUMMARY_PILL[key] ?? SUMMARY_PILL.unknown;
  statusPill.textContent = state.text;
  statusPill.className = state.tone ? `pill ${state.tone}` : "pill";
}

function loadDashboard(apiUrl, statusPill, metrics) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);
  fetch(apiUrl, { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (data.schemaVersion !== 1) throw new Error("Unsupported schema");
      applyStatus(statusPill, data);
      renderMetrics(metrics, data);
    })
    .catch(() => {
      statusPill.textContent = "Unavailable";
      statusPill.className = "pill bad";
      metrics.replaceChildren(el("p", "empty", "Could not read this app's dashboard API."));
    })
    .finally(() => clearTimeout(timer));
}

function buildCard(app) {
  const card = el("article", "card app-card");

  const head = el("div", "app-card-head");
  head.append(el("h2", "", String(app.name ?? app.id ?? "Unnamed application")));
  const statusPill = pill("Not registered", "");
  head.append(statusPill);
  card.append(head);

  const tags = [
    app.appType ? labelFor("appType", app.appType) : null,
    app.language ? labelFor("language", app.language) : null,
    app.deploymentType ? labelFor("deployment", app.deploymentType) : null,
    app.status ? labelFor("status", app.status) : null,
  ].filter(Boolean);
  card.append(el("p", "hint", tags.join(" · ")));
  if (app.description) card.append(el("p", "app-card-desc", String(app.description)));

  const metrics = el("div", "app-card-body");
  card.append(metrics);

  const apiUrl = safeUrl(app.dashboardApiUrl);
  const validApi = apiUrl && /\/api\/dashboard$/.test(apiUrl) ? apiUrl : null;
  if (validApi) {
    statusPill.textContent = "Loading…";
    metrics.append(el("p", "empty", "Loading dashboard…"));
    loadDashboard(validApi, statusPill, metrics);
  } else {
    metrics.append(el("p", "empty", "No dashboard API is registered for this app."));
  }

  const links = el("div", "app-card-links");
  links.append(
    linkButton("GitHub", app.repository),
    linkButton("App", app.url),
    linkButton("Dashboard", dashboardPageUrl(validApi)),
  );
  card.append(links);
  return card;
}

async function render() {
  const container = document.getElementById("cards");
  const errorBox = document.getElementById("error");
  try {
    const { apps } = await loadRegistry();
    if (apps.length === 0) {
      container.append(el("p", "empty", "No applications are registered."));
      return;
    }
    for (const app of apps) container.append(buildCard(app));
  } catch (cause) {
    errorBox.textContent = `Could not load the registry. ${cause.message}`;
    errorBox.hidden = false;
  }
}

render();
