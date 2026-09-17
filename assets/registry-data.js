// Loads the GitHub registry and derives the three dashboard dimensions.

const REGISTRY_URL = "https://raw.githubusercontent.com/CBIIT/NCI-Skills-Registry/main/registry.json";

export const DEPLOYMENT_TYPES = [
  { value: "local", label: "Local only" },
  { value: "cloud-one", label: "Cloud One" },
  { value: "cloud-two", label: "Cloud Two" },
  { value: "servicenow", label: "ServiceNow" },
  { value: "nidap", label: "NIDAP" },
  { value: "power-platform", label: "Power Platform" },
  { value: "unknown", label: "Not recorded" },
];

export const STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "in-development", label: "In development" },
  { value: "deployed-lower", label: "Deployed to lower tier" },
  { value: "deployed-stage", label: "Deployed to stage" },
  { value: "deployed-production", label: "Deployed to production" },
];

export const HEALTH_STATES = [
  { value: "responding", label: "Health check responding" },
  { value: "not-responding", label: "Health check not responding" },
  { value: "none", label: "No health check" },
];

export const DIMENSIONS = {
  deployment: { title: "Deployment type", buckets: DEPLOYMENT_TYPES, of: bucketDeployment },
  health: { title: "Health", buckets: HEALTH_STATES, of: bucketHealth },
  status: { title: "Status", buckets: STATUSES, of: bucketStatus },
};

function bucketDeployment(app) {
  const value = String(app.deploymentType ?? "unknown");
  return DEPLOYMENT_TYPES.some((entry) => entry.value === value) ? value : "unknown";
}

function bucketStatus(app) {
  const value = String(app.status ?? "");
  return STATUSES.some((entry) => entry.value === value) ? value : "planning";
}

// An app counts as monitored only if it declares a health check URL.
function bucketHealth(app) {
  const hasCheck = typeof app.healthCheckUrl === "string" && app.healthCheckUrl.trim() !== "";
  if (!hasCheck) return "none";
  return app.healthStatus === "ok" ? "responding" : "not-responding";
}

export function labelFor(dimension, value) {
  const match = DIMENSIONS[dimension]?.buckets.find((entry) => entry.value === value);
  return match ? match.label : value;
}

export async function loadRegistry() {
  const response = await fetch(`${REGISTRY_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load registry.json (HTTP ${response.status})`);
  }
  const data = await response.json();
  const apps = Array.isArray(data.apps) ? data.apps : [];
  return { updated: data.updated ?? null, apps };
}

export function tally(apps, dimension) {
  const { buckets, of } = DIMENSIONS[dimension];
  const counts = new Map(buckets.map((entry) => [entry.value, 0]));
  for (const app of apps) {
    const key = of(app);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets
    .map((entry) => ({ ...entry, count: counts.get(entry.value) ?? 0 }))
    .filter((entry) => entry.count > 0);
}

export function filterApps(apps, dimension, value) {
  const { of } = DIMENSIONS[dimension];
  return apps.filter((app) => of(app) === value);
}
