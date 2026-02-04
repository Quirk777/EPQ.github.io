export type Submission = Record<string, any>;

type NumRec = Record<string, number>;
type CorCell = { a: string; b: string; r: number };

function isNum(x: any) {
  return typeof x === "number" && Number.isFinite(x);
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return 0;
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function safeDate(s: any): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pick(obj: any, keys: string[], fallback: any = undefined) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
}

// Try to extract construct averages from any common shape.
// Supports: submission.result.constructs, submission.constructs, submission.scores.constructs, etc.
export function extractConstructs(s: Submission): NumRec {
  const c =
    pick(s, ["constructs"]) ??
    pick(s, ["result"])?.constructs ??
    pick(s, ["scores"])?.constructs ??
    pick(s, ["applicant_result"])?.constructs ??
    pick(s, ["summary"])?.constructs;

  const out: NumRec = {};
  if (c && typeof c === "object") {
    for (const [k, v] of Object.entries(c)) {
      if (isNum(v)) out[k] = v as number;
      // Sometimes nested: { avg: 3.2 }
      if (!isNum(v) && typeof v === "object" && v && isNum((v as any).avg)) out[k] = (v as any).avg;
    }
  }
  return out;
}

// A "signal" score we can trend without knowing your exact schema:
// - if you have overall_average, use it
// - else mean(construct averages)
// - else 0
export function computeSignal(s: Submission): number {
  const overall = pick(s, ["overall_average", "overallAvg", "average", "avg_score"]);
  if (isNum(overall)) return overall;
  const constructs = extractConstructs(s);
  const vals = Object.values(constructs);
  return vals.length ? mean(vals) : 0;
}

export function computeInsights(submissions: Submission[]) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const points = submissions
    .map(s => {
      const created =
        safeDate(pick(s, ["created_at", "createdAt", "submitted_at", "submittedAt", "timestamp"])) ??
        null;
      return { s, created, signal: computeSignal(s), constructs: extractConstructs(s) };
    })
    .filter(p => p.created);

  // Activity buckets
  const last7 = points.filter(p => now - (p.created as Date).getTime() <= 7 * dayMs);
  const last30 = points.filter(p => now - (p.created as Date).getTime() <= 30 * dayMs);

  // Trend: average signal by week (last 8 weeks)
  const weeks: { label: string; count: number; avgSignal: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = now - (w + 1) * 7 * dayMs;
    const end = now - w * 7 * dayMs;
    const bucket = points.filter(p => {
      const t = (p.created as Date).getTime();
      return t >= start && t < end;
    });
    const avgSignal = bucket.length ? mean(bucket.map(b => b.signal).filter(isNum)) : 0;
    const d = new Date(start);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    weeks.push({ label, count: bucket.length, avgSignal: Number(avgSignal.toFixed(2)) });
  }

  // Construct leaderboard (most common constructs + mean)
  const constructKeys = new Set<string>();
  for (const p of points) for (const k of Object.keys(p.constructs)) constructKeys.add(k);

  const constructsSummary = Array.from(constructKeys).map(k => {
    const vals = points.map(p => p.constructs[k]).filter(isNum) as number[];
    return {
      construct: k,
      count: vals.length,
      mean: Number(mean(vals).toFixed(2)),
      std: Number(std(vals).toFixed(2)),
    };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  // Correlations between top constructs (pairwise Pearson)
  const topKeys = constructsSummary.map(x => x.construct).slice(0, 6);
  const cors: CorCell[] = [];
  for (let i = 0; i < topKeys.length; i++) {
    for (let j = i + 1; j < topKeys.length; j++) {
      const a = topKeys[i], b = topKeys[j];
      const pairs = points
        .map(p => [p.constructs[a], p.constructs[b]] as const)
        .filter(([x, y]) => isNum(x) && isNum(y));
      const xs = pairs.map(p => p[0]) as number[];
      const ys = pairs.map(p => p[1]) as number[];
      const r = pearson(xs, ys);
      cors.push({ a, b, r: Number(r.toFixed(2)) });
    }
  }
  cors.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const topCors = cors.slice(0, 8);

  // "Consistency" metric: how spread out applicants are (std of signal)
  const signalsAll = points.map(p => p.signal).filter(isNum) as number[];
  const consistency = signalsAll.length ? Number(std(signalsAll).toFixed(2)) : 0;

  return {
    totals: {
      total: submissions.length,
      last7: last7.length,
      last30: last30.length,
      avgSignal: Number(mean(signalsAll).toFixed(2)),
      consistencyStd: consistency,
    },
    weeklyTrend: weeks,
    constructsSummary,
    topCorrelations: topCors,
  };
}
