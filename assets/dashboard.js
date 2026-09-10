import { loadRegistry, tally, DIMENSIONS } from "./registry-data.js";
import { donutChart, legend } from "./donut.js";

const CHARTS = [
  {
    dimension: "deployment",
    title: "Deployment type",
    hint: "Where each application runs.",
    centreLabel: "apps registered",
  },
  {
    dimension: "health",
    title: "Health",
    hint: "Whether each application reports that it is working.",
    centreLabel: "apps total",
  },
  {
    dimension: "status",
    title: "Status",
    hint: "How far along each application is.",
    centreLabel: "apps total",
  },
];

function card({ dimension, title, hint, centreLabel }, apps) {
  const segments = tally(apps, dimension);

  const section = document.createElement("section");
  section.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const description = document.createElement("p");
  description.className = "hint";
  description.textContent = hint;

  section.append(heading, description);

  if (apps.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No applications registered yet.";
    section.append(empty);
    return section;
  }

  const hrefFor = (value) =>
    `apps.html?by=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}`;

  section.append(
    donutChart({ segments, total: apps.length, centreLabel, hrefFor }),
    legend({ segments, hrefFor }),
  );

  return section;
}

async function render() {
  const container = document.getElementById("charts");
  const errorBox = document.getElementById("error");
  const notice = document.getElementById("notice");

  try {
    const { apps, updated } = await loadRegistry();

    const sampleCount = apps.filter((app) => String(app.id ?? "").startsWith("sample-")).length;
    if (sampleCount > 0) {
      const realCount = apps.length - sampleCount;
      notice.textContent =
        `${realCount} of these ${apps.length} entries are real. The remaining ${sampleCount} are sample data ` +
        "for demonstration only and should be removed before this is used for anything.";
      notice.hidden = false;
    }

    for (const chart of CHARTS) {
      container.append(card(chart, apps));
    }

    if (updated) {
      const footer = document.createElement("p");
      footer.className = "empty";
      footer.textContent = `Registry last updated ${updated}.`;
      container.after(footer);
    }
  } catch (cause) {
    errorBox.textContent = `Could not load the registry. ${cause.message}`;
    errorBox.hidden = false;
  }
}

// Guards against a dimension being renamed in one file but not the other.
for (const chart of CHARTS) {
  if (!DIMENSIONS[chart.dimension]) {
    throw new Error(`Unknown dimension: ${chart.dimension}`);
  }
}

render();
