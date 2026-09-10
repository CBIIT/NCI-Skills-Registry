// Renders a clickable SVG donut chart. No dependencies.

const SVG_NS = "http://www.w3.org/2000/svg";
const RADIUS = 60;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function svgEl(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

/**
 * @param {object} options
 * @param {Array<{value:string,label:string,count:number}>} options.segments
 * @param {number} options.total          Number shown in the middle
 * @param {string} options.centreLabel    Caption under that number
 * @param {(value:string)=>string} options.hrefFor
 */
export function donutChart({ segments, total, centreLabel, hrefFor }) {
  const figure = document.createElement("div");
  figure.className = "donut";

  const svg = svgEl("svg", {
    viewBox: "0 0 160 160",
    role: "img",
    "aria-label": `${total} ${centreLabel}`,
  });

  svg.append(
    svgEl("circle", {
      cx: 80,
      cy: 80,
      r: RADIUS,
      fill: "none",
      stroke: "var(--track)",
      "stroke-width": STROKE,
    }),
  );

  const counted = segments.reduce((sum, segment) => sum + segment.count, 0);
  let offset = 0;

  segments.forEach((segment, index) => {
    const length = counted === 0 ? 0 : (segment.count / counted) * CIRCUMFERENCE;

    const arc = svgEl("circle", {
      cx: 80,
      cy: 80,
      r: RADIUS,
      fill: "none",
      stroke: `var(--c${index % 6})`,
      "stroke-width": STROKE,
      "stroke-dasharray": `${length} ${CIRCUMFERENCE - length}`,
      "stroke-dashoffset": -offset,
      transform: "rotate(-90 80 80)",
    });
    arc.classList.add("segment");

    const link = svgEl("a", { href: hrefFor(segment.value) });
    const tooltip = svgEl("title");
    tooltip.textContent = `${segment.label}: ${segment.count}`;
    link.append(arc, tooltip);
    svg.append(link);

    offset += length;
  });

  const centre = document.createElement("div");
  centre.className = "donut-centre";
  const figure_total = document.createElement("strong");
  figure_total.textContent = String(total);
  const caption = document.createElement("span");
  caption.textContent = centreLabel;
  centre.append(figure_total, caption);

  figure.append(svg, centre);
  return figure;
}

export function legend({ segments, hrefFor }) {
  const list = document.createElement("ul");
  list.className = "legend";

  segments.forEach((segment, index) => {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.href = hrefFor(segment.value);

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = `var(--c${index % 6})`;

    const label = document.createElement("span");
    label.className = "legend-label";
    label.textContent = segment.label;

    const count = document.createElement("span");
    count.className = "legend-count";
    count.textContent = String(segment.count);

    link.append(swatch, label, count);
    item.append(link);
    list.append(item);
  });

  return list;
}
