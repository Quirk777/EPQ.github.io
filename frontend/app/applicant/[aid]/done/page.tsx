import Link from "next/link";

type PageProps = {
  params: { aid: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function DonePage({ params, searchParams }: PageProps) {
  const raw =
    (searchParams?.candidate_id as string | undefined) ??
    (searchParams?.candidateId as string | undefined) ??
    (searchParams?.cid as string | undefined);

  const candidate_id = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 30, marginBottom: 10 }}>Thank you! ✅</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6 }}>
        Your assessment was submitted. The employer will contact you soon.
      </p>

      {candidate_id ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Candidate ID</div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14 }}>
            {candidate_id}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
        Assessment:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {params.aid}
        </span>
      </div>

      <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", textDecoration: "none" }}>
          Back to homepage
        </Link>
      </div>
    </main>
  );
}