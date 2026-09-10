import { loadRegistry, filterApps, labelFor, DIMENSIONS } from "./registry-data.js";

const COLUMNS = [
  { key: "name", label: "Application" },
  { key: "owner", label: "Owner" },
  { key: "ownerOffice", label: "Office" },
  { key: "deploymentType", label: "Deployment", format: (app) => labelFor("deployment", app.deploymentType) },
  { key: "status", label: "Status", format: (app) => labelFor("status", app.status) },
  { key: "health", label: "Health" },
  { key: "dataSensitivity", label: "Data" },
  { key: "repository", label: "Repository" },
];

const HEALTH_PILL = {
  ok: { text: "Responding", tone: "ok" },
  degraded: { text: "Degraded", tone: "warn" },
  unreachable: { text: "Not responding", tone: "bad" },
  none: { text: "No health check", tone: "" },
};

// Blocks javascript: and data: URLs from registry entries.
function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function pill(text, tone) {
  const span = document.createElement("span");
  span.className = tone ? `pill ${tone}` : "pill";
  span.textContent = text;
  return span;
}

function healthCell(app) {
  const hasCheck = typeof app.healthCheckUrl === "string" && app.healthCheckUrl.trim() !== "";
  const state = HEALTH_PILL[hasCheck ? (app.healthStatus ?? "unreachable") : "none"] ?? HEALTH_PILL.none;

  const cell = document.createDocumentFragment();
  cell.append(pill(state.text, state.tone));

  const href = safeUrl(app.healthCheckUrl);
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = "check";
    link.rel = "noopener noreferrer";
    link.style.marginLeft = "8px";
    link.style.fontSize = "12px";
    cell.append(link);
  }
  return cell;
}

function cellFor(app, column) {
  if (column.key === "health") return healthCell(app);

  if (column.key === "name") {
    const href = safeUrl(app.url);
    if (!href) return document.createTextNode(String(app.name ?? "—"));
    const link = document.createElement("a");
    link.href = href;
    link.rel = "noopener noreferrer";
    link.textContent = String(app.name ?? href);
    link.title = `Open ${href}`;
    return link;
  }

  if (column.key === "repository") {
    const href = safeUrl(app.repository);
    if (!href) {
      return document.createTextNode(app.repository ? String(app.repository) : "—");
    }
    const link = document.createElement("a");
    link.href = href;
    link.rel = "noopener noreferrer";
    link.textContent = href.replace(/^https:\/\/github\.com\//, "");
    return link;
  }

  const raw = column.format ? column.format(app) : app[column.key];
  return document.createTextNode(raw === undefined || raw === null || raw === "" ? "—" : String(raw));
}

function buildTable(apps) {
  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of COLUMNS) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = column.label;
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const app of apps) {
    const row = document.createElement("tr");
    for (const column of COLUMNS) {
      const td = document.createElement("td");
      td.append(cellFor(app, column));
      row.append(td);
    }
    tbody.append(row);
  }

  table.append(thead, tbody);
  return table;
}

async function render() {
  const params = new URLSearchParams(location.search);
  const by = params.get("by");
  const value = params.get("value");

  const heading = document.getElementById("heading");
  const subheading = document.getElementById("subheading");
  const container = document.getElementById("table");
  const errorBox = document.getElementById("error");

  try {
    const { apps } = await loadRegistry();

    let shown = apps;
    if (by && DIMENSIONS[by] && value) {
      shown = filterApps(apps, by, value);
      heading.textContent = labelFor(by, value);
      subheading.textContent = `${DIMENSIONS[by].title} — ${shown.length} of ${apps.length} applications`;
      document.title = `${heading.textContent} — NCI Application Registry`;
    } else {
      heading.textContent = "All applications";
      subheading.textContent = `${apps.length} registered`;
    }

    if (shown.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No applications match this selection.";
      container.append(empty);
      return;
    }

    container.append(buildTable(shown));
  } catch (cause) {
    errorBox.textContent = `Could not load the registry. ${cause.message}`;
    errorBox.hidden = false;
  }
}

render();
