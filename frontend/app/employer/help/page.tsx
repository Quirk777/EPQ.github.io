export default function HelpPage() {
  const card: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 34px rgba(0,0,0,0.10)",
    padding: 16,
  };

  const h2: React.CSSProperties = { margin: "0 0 10px", fontSize: 18, fontWeight: 950 };

  return (
    <div style={{
      maxWidth: 980,
      margin: "0 auto",
      padding: 22,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#0b1220"
    }}>
      <h1 style={{ margin: "0 0 10px", fontSize: 30, letterSpacing: -0.3 }}>Help & Support</h1>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
        If anything goes wrong, use the contact info below. (Placeholders until you choose a real support channel.)
      </p>

      <div id="contact" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
        <div style={card}>
          <div style={h2}>Contact</div>
          <div style={{ color: "#334155", lineHeight: 1.9, fontSize: 14 }}>
            <div><b>Phone:</b> (555) 123-4567</div>
            <div><b>Email:</b> support@envirofit.example</div>
            <div><b>Hours:</b> Mon–Fri, 9am–5pm</div>
          </div>
        </div>

        <div style={card}>
          <div style={h2}>What to include</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.9, fontSize: 14 }}>
            <li>Candidate ID (if PDF issue)</li>
            <li>Assessment ID (if applicant link issue)</li>
            <li>Screenshot of the error</li>
            <li>Approx. time it occurred</li>
          </ul>
        </div>
      </div>

      <div id="status" style={{ ...card, marginTop: 14 }}>
        <div style={h2}>Troubleshooting</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.9, fontSize: 14 }}>
          <li><b>401 Unauthorized:</b> employer session expired. Re-login.</li>
          <li><b>PDF missing:</b> confirm reports folder path + candidate_id mapping.</li>
          <li><b>Applicant submit 409:</b> duplicate submission blocked (expected).</li>
          <li><b>Dashboard empty:</b> verify backend is running + Next proxy routes.</li>
        </ul>
      </div>
    </div>
  );
}