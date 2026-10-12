// Small shared helpers: a seeded random generator and time formatting.
// Times are minutes from Thursday 00:00 of the storm week.

export function rng(seed) {
  // mulberry32: tiny, fast and identical in every JavaScript engine.
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    exp: (mean) => -mean * Math.log(1 - next()),
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmt(t) {
  const m = Math.round(t);
  const day = DAY_NAMES[(((Math.floor(m / 1440) + 4) % 7) + 7) % 7]; // minute 0 is Thursday 00:00
  const inDay = ((m % 1440) + 1440) % 1440;
  const hh = String(Math.floor(inDay / 60)).padStart(2, "0");
  const mm = String(inDay % 60).padStart(2, "0");
  return `${day} ${hh}:${mm}`;
}

export const hours = (minutes) => minutes / 60;

export function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

// Records which assumption keys a run reads, so the tests can prove that every
// documented assumption is used and nothing undocumented is.
export function trackedParams(values, seen = new Set()) {
  const proxy = new Proxy(values, {
    get(target, key) {
      if (typeof key === "string") {
        if (!(key in target)) throw new Error(`Undocumented assumption read: ${key}`);
        seen.add(key);
      }
      return target[key];
    },
  });
  return { params: proxy, seen };
}

export function paramsFrom(assumptionsDoc, overrides = {}) {
  const values = {};
  for (const a of assumptionsDoc.assumptions) values[a.key] = a.value;
  return { ...values, ...overrides };
}
