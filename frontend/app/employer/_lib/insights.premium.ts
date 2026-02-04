export type Submission = Record<string, any>;
type NumRec = Record<string, number>;

function isNum(x: any) { return typeof x === "number" && Number.isFinite(x); }
function mean(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}
function zscore(x: number, m: number, s: number) { return s === 0 ? 0 : (x - m) / s; }

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
      if (!isNum(v) && typeof v === "object" && v && isNum((v as any).avg)) out[k] = (v as any).avg;
    }
  }
  return out;
}

export function computeSignal(s: Submission): number {
  const overall = pick(s, ["overall_average", "overallAvg", "average", "avg_score", "overall"]);
  if (isNum(overall)) return overall;
  const constructs = extractConstructs(s);
  const vals = Object.values(constructs);
  return vals.length ? mean(vals) : 0;
}

function dayKey(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}

export function computePremiumInsights(submissions: Submission[]) {
  const now = Date.now();
  const dayMs = 24*60*60*1000;

  const points = submissions
    .map(s => {
      const created =
        safeDate(pick(s, ["created_at","createdAt","submitted_at","submittedAt","timestamp"])) ?? null;
      const duration =
        pick(s, ["duration_seconds","durationSeconds","time_seconds","timeSeconds"]) ?? null;
      return { s, created, signal: computeSignal(s), constructs: extractConstructs(s), duration };
    })
    .filter(p => p.created) as { s: Submission; created: Date; signal: number; constructs: NumRec; duration: any }[];

  const total = submissions.length;
  const last7 = points.filter(p => now - p.created.getTime() <= 7*dayMs);
  const prev7 = points.filter(p => {
    const dt = now - p.created.getTime();
    return dt > 7*dayMs && dt <= 14*dayMs;
  });

  const last30 = points.filter(p => now - p.created.getTime() <= 30*dayMs);

  const signalsAll = points.map(p => p.signal).filter(isNum) as number[];
  const avgSignal = Number(mean(signalsAll).toFixed(2));
  const spread = Number(std(signalsAll).toFixed(2));

  // Momentum: compare last 7 days count vs previous 7 days
  const momentum = prev7.length === 0 ? (last7.length > 0 ? 1 : 0) : (last7.length - prev7.length) / prev7.length;
  const momentumPct = Math.round(momentum * 100);

  // Daily activity (last 14 days)
  const countsByDay = new Map<string, number>();
  for (let i=13; i>=0; i--) {
    const d = new Date(now - i*dayMs);
    countsByDay.set(dayKey(d), 0);
  }
  for (const p of points) {
    const k = dayKey(p.created);
    if (countsByDay.has(k)) countsByDay.set(k, (countsByDay.get(k) || 0) + 1);
  }
  const dailySeries = Array.from(countsByDay.entries()).map(([k,v]) => ({ day: k.slice(5), count: v }));

  // Anomaly detection: z-score on daily counts (last 14)
  const dailyCounts = dailySeries.map(x => x.count);
  const m = mean(dailyCounts);
  const s = std(dailyCounts);
  const anomalies = dailySeries
    .map(x => ({ ...x, z: Number(zscore(x.count, m, s).toFixed(2)) }))
    .filter(x => Math.abs(x.z) >= 1.5)
    .sort((a,b)=>Math.abs(b.z)-Math.abs(a.z))
    .slice(0,5);

  // Construct drift: compare last 30 days vs previous 30 days
  const last30Points = points.filter(p => now - p.created.getTime() <= 30*dayMs);
  const prev30Points = points.filter(p => {
    const dt = now - p.created.getTime();
    return dt > 30*dayMs && dt <= 60*dayMs;
  });

  const keySet = new Set<string>();
  for (const p of points) for (const k of Object.keys(p.constructs)) keySet.add(k);

  const drift = Array.from(keySet).map(k => {
    const a = last30Points.map(p => p.constructs[k]).filter(isNum) as number[];
    const b = prev30Points.map(p => p.constructs[k]).filter(isNum) as number[];
    const ma = a.length ? mean(a) : 0;
    const mb = b.length ? mean(b) : 0;
    const delta = Number((ma - mb).toFixed(2));
    return { construct: k, delta, last30Mean: Number(ma.toFixed(2)), prev30Mean: Number(mb.toFixed(2)), n: a.length };
  }).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta)).slice(0,8);

  // Time-to-complete (if present)
  const durations = points.map(p => (typeof p.duration === "number" ? p.duration : null)).filter(isNum) as number[];
  const avgDuration = durations.length ? Math.round(mean(durations)) : null;

  // "Top applicants" (by signal) - for demo premium feel
  const topApplicants = points
    .slice()
    .sort((a,b)=>b.signal-a.signal)
    .slice(0,5)
    .map(p => {
      const name = pick(p.s, ["name","applicant_name","candidate_name"], "Applicant");
      const email = pick(p.s, ["email","applicant_email"], "");
      const cid = pick(p.s, ["candidate_id","candidateId","id"], "");
      return { name: String(name), email: String(email), candidate_id: String(cid), signal: Number(p.signal.toFixed(2)) };
    });

  return {
    totals: {
      total,
      last7: last7.length,
      last30: last30.length,
      avgSignal,
      spreadStd: spread,
      momentumPct,
      avgDurationSec: avgDuration
    },
    dailySeries,
    anomalies,
    drift,
    topApplicants,
  };
}
