# report_generator.py
import os
import sys
import subprocess
import datetime
import base64
from io import BytesIO
import re
import shutil
from pathlib import Path

# CRITICAL: Set wkhtmltopdf path at module import time
# This ensures background tasks have access to it
if not os.environ.get("WKHTMLTOPDF_PATH"):
    # Default paths to check
    default_paths = [
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        "/usr/local/bin/wkhtmltopdf",
        "/usr/bin/wkhtmltopdf",
    ]
    for p in default_paths:
        if os.path.isfile(p):
            os.environ["WKHTMLTOPDF_PATH"] = p
            print(f"[report_generator] Auto-detected wkhtmltopdf at: {p}")
            break

import matplotlib
matplotlib.use("Agg")  # safe for servers/headless environments
import matplotlib.pyplot as plt

try:
    import pdfkit
    PDFKIT_AVAILABLE = True
except ImportError:
    PDFKIT_AVAILABLE = False

EPQ_FEEDBACK = {}


def find_wkhtmltopdf(verbose: bool = False):
    possible_paths = [
        os.environ.get("WKHTMLTOPDF_PATH"),
        os.environ.get("WKHTMLTOPDF_BINARY"),
        os.environ.get("WKHTMLTOPDF"),
        shutil.which("wkhtmltopdf"),
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        "/usr/local/bin/wkhtmltopdf",
        "/usr/bin/wkhtmltopdf",
    ]

    checked = []
    for p in possible_paths:
        if not p:
            continue
        checked.append(p)
        if os.path.isfile(p):
            if verbose:
                print("[wkhtmltopdf] Found:", p)
            return p

    if verbose:
        print("[wkhtmltopdf] Not found. Checked:")
        for c in checked:
            print("  -", c)

    return None


def _fix_mojibake(s: str) -> str:
    """
    Fix common UTF-8 -> cp1252 mojibake like Youâ€™re / didnâ€™t / itâ€™s.
    Safe: if already clean, returns unchanged.
    """
    if not isinstance(s, str):
        s = str(s)
    try:
        if "â" in s or "Ã" in s:
            return s.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        pass
    return s


def generate_pdf_report(
    applicant_result,
    employer_environment="Standard",
    candidate_id="A-1042",
    output_dir=".",
    auto_open=False,
):
    """
    Generate a polished two-page PDF focused on environmental fit.
    Uses pdfkit + wkhtmltopdf.
    Returns PDF path string on success, None on failure.
    """
    print("\n" + "="*80)
    print(f"[report_generator] Starting PDF generation for {candidate_id}")
    print(f"[report_generator] PDFKIT_AVAILABLE = {PDFKIT_AVAILABLE}")
    print(f"[report_generator] WKHTMLTOPDF_PATH env = {os.environ.get('WKHTMLTOPDF_PATH')}")
    print(f"[report_generator] output_dir = {output_dir}")
    print(f"[report_generator] employer_environment = {employer_environment}")
    print("="*80 + "\n")

    try:
        output_dir = str(Path(output_dir).expanduser().resolve())
    except Exception:
        output_dir = str(Path(".").resolve())

    if not PDFKIT_AVAILABLE:
        print("[report_generator] PDF generation skipped: pdfkit not installed.")
        return None

    wk_path = find_wkhtmltopdf(verbose=True)
    print(f"[report_generator] wkhtmltopdf path found: {wk_path}")
    
    if not wk_path:
        error_msg = "wkhtmltopdf binary not found"
        print(f"[report_generator] ERROR: {error_msg}")
        print('[report_generator] Fix: install wkhtmltopdf and set WKHTMLTOPDF_PATH to the full exe path.')
        print(r'[report_generator] Example (Windows): setx WKHTMLTOPDF_PATH "C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"')
        return None

    try:
        out = subprocess.check_output([wk_path, "--version"], stderr=subprocess.STDOUT, text=True)
        print("[wkhtmltopdf]", out.strip())
    except Exception as e:
        print("[wkhtmltopdf] Found binary but version check failed:", e)

    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # ---------- helpers ----------
    def humanize(key: str) -> str:
        return re.sub(r"[_\-]+", " ", str(key)).strip().title()

    def get_abbrev(key: str) -> str:
        k = str(key).strip()
        if k.isupper() and len(k) <= 6:
            return k
        words = re.findall(r"[A-Za-z]+", k)
        if words and len(words) > 1:
            initials = "".join(w[0] for w in words).upper()
            if len(initials) <= 6:
                return initials
        if words:
            return words[0][:3].upper()
        return k[:3].upper()

    # ---------- canonical construct map ----------
    canonical_map = {
        "structural clarity load": ("SCL", "Structural Clarity Load", "Preference for clear processes, rules, and predictable expectations."),
        "cognitive compression demand": ("CCD", "Cognitive Compression Demand", "How much cognitive consolidation is required when handling dense information."),
        "complexity integration load": ("CIL", "Complexity Integration Load", "Demand for integrating multiple complex factors into decisions."),
        "change volatility load": ("CVL", "Change Volatility Load", "Exposure to frequent or unpredictable change in priorities or scope."),
        "emotional regulation load": ("ERL", "Emotional Regulation Load", "Emotional control required to manage social or stressful interactions."),
        "motivational sustainment demand": ("MSD", "Motivational Sustainment Demand", "Effort needed to stay motivated on repetitive or long-duration tasks."),
        "interpersonal coordination intensity": ("ICI", "Interpersonal Coordination Intensity", "Amount of real-time interaction and coordination required with others."),
        "autonomy & judgment load": ("AJL", "Autonomy & Judgment Load", "Degree of independent decision-making and judgment required."),
    }

    # ---------- normalize scoring output (supports old + new scorer shapes) ----------
    constructs = {}

    overall_avg_from_result = None
    overall_band_from_result = None

    if isinstance(applicant_result, dict):
        # NEW: {"construct_scores": {"SCL": 2.6, ...}}
        cs = applicant_result.get("construct_scores")
        if isinstance(cs, dict) and cs:
            for k, v in cs.items():
                try:
                    constructs[str(k)] = {"average": float(v)}
                except Exception:
                    pass

        # OLD: {"aggregates": {"SCL": {"average": 2.6}, ...}}
        if not constructs:
            ag = applicant_result.get("aggregates")
            if isinstance(ag, dict) and ag:
                constructs = ag

        oa = applicant_result.get("overall_average")
        ob = applicant_result.get("overall_band")
        if isinstance(oa, (int, float)):
            overall_avg_from_result = float(oa)
        if isinstance(ob, str) and ob.strip():
            overall_band_from_result = ob.strip()

    ordered_keys = sorted(constructs.keys())

    def _get_avg(k: str) -> float:
        v = constructs.get(k)
        if isinstance(v, dict):
            try:
                return float(v.get("average", 0) or 0)
            except Exception:
                return 0.0
        try:
            return float(v or 0)
        except Exception:
            return 0.0

    labels = [humanize(k) for k in ordered_keys]
    sizes = [_get_avg(k) for k in ordered_keys]

    no_scores = (not sizes) or (sum(sizes) == 0)

    if no_scores:
        print("[report_generator] No construct scores available (empty/zero). Generating placeholder PDF so pipeline completes.")
        ordered_keys = ["no_scores_available"]
        labels = ["No Scored Constructs"]
        sizes = [1.0]

    # ---------- horizontal bar chart ----------
    fig, ax = plt.subplots(figsize=(9, 5.2))

    palette = plt.get_cmap("tab20").colors
    bar_colors = [palette[i % len(palette)] for i in range(len(labels))]

    # Reverse so first item appears at top
    labels_rev = list(reversed(labels))
    sizes_rev = list(reversed(sizes))
    colors_rev = list(reversed(bar_colors))

    ax.barh(labels_rev, sizes_rev, color=colors_rev)

    # add numeric value labels at end of bars
    for y, v in enumerate(sizes_rev):
        ax.text(v + 0.03, y, f"{v:.2f}", va="center", fontsize=9)

    ax.set_title("Construct Averages" if not no_scores else "Construct Averages (No Data)", fontsize=16)
    ax.set_xlabel("Average Score")

    maxv = max(sizes_rev) if sizes_rev else 1.0
    ax.set_xlim(0, max(1.0, maxv * 1.25))

    fig.tight_layout()

    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    plt.close(fig)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    # ---------- generate table rows ----------
    table_rows_html = ""
    key_strengths = []
    development_opportunities = []
    interview_prompts = []

    if no_scores:
        table_rows_html = (
            "<tr>"
            "<td><strong style='font-size:14px'>N/A</strong><div style='font-size:11px;color:#555'>No scored constructs</div></td>"
            "<td class='avg'>-</td>"
            "<td>Responses were received, but scored construct aggregates were not available for this run.</td>"
            "<td>Candidate engagement suggests follow-through and willingness to complete structured steps.</td>"
            "<td>Mitigation: confirm scoring pipeline inputs and rerun scoring; consider re-sending assessment link if needed.</td>"
            "</tr>\n"
        )
        key_strengths = ["Completed the assessment flow successfully; shows baseline follow-through and responsiveness."]
        development_opportunities = ["Verify scoring configuration so construct averages are computed for every submission."]
        interview_prompts = ["Walk me through how you approach a new questionnaire or unfamiliar process. What helps you be accurate?"]
    else:
        for k in ordered_keys:
            full_name = humanize(k)
            lookup = full_name.lower()

            if lookup in canonical_map:
                abbr, canonical_full, _short_meaning = canonical_map[lookup]
            else:
                abbr = get_abbrev(k)
                canonical_full = full_name

            avg = _get_avg(k)

            if avg >= 2.7:
                band = "High"
            elif avg >= 2.0:
                band = "Moderate"
            else:
                band = "Low"

            env_key = str(employer_environment).capitalize()
            feedback_text = ""
            if isinstance(EPQ_FEEDBACK, dict):
                feedback_text = (
                    EPQ_FEEDBACK.get(k, {}).get(env_key, {}).get(band, "")
                    or EPQ_FEEDBACK.get(k, {}).get("Standard", {}).get(band, "")
                    or ""
                )

            if not feedback_text:
                if band == "High":
                    feedback_text = abbr + " indicates higher tolerance or preference for this environmental demand."
                elif band == "Moderate":
                    feedback_text = abbr + " indicates flexibility and reasonable tolerance across environments."
                else:
                    feedback_text = abbr + " indicates preference for lower environmental load in this domain."

            if band == "High":
                positive = "Likely to perform strongly where " + canonical_full.lower() + " is expected."
                setback = "Low risk in most employer environments."
                mitigation = "Leverage this strength in role design and responsibilities."
                key_strengths.append(abbr + ": comfortable with higher " + canonical_full.lower() + ".")
            elif band == "Moderate":
                positive = "Performs well with clear expectations; adapts when demands shift."
                setback = "May prefer short checkpoints during spikes in demand."
                mitigation = "Provide brief SOPs and regular check-ins during onboarding."
                development_opportunities.append(abbr + ": benefits from concise process cues.")
            else:
                positive = "Performs best with structured supports in this domain."
                setback = "Possible friction where high " + canonical_full.lower() + " is demanded from day one."
                mitigation = "Use checklists, paired mentoring, and short focused training."
                development_opportunities.append(abbr + ": provide structured onboarding and checklists.")

            interview_prompts.append("Describe a time when " + canonical_full.lower() + " mattered and how you handled it.")

            table_rows_html += (
                "<tr>"
                "<td><strong style='font-size:14px'>" + abbr + "</strong><div style='font-size:11px;color:#555'>" + canonical_full + "</div></td>"
                "<td class='avg'>" + format(avg, ".2f") + "</td>"
                "<td>" + _fix_mojibake(feedback_text) + "</td>"
                "<td>" + _fix_mojibake(positive) + "</td>"
                "<td>" + _fix_mojibake(setback) + "<br><em>Mitigation:</em> " + _fix_mojibake(mitigation) + "</td>"
                "</tr>\n"
            )

        key_strengths = sorted(set(key_strengths)) or ["Adaptive, collaborative, dependable."]
        development_opportunities = sorted(set(development_opportunities)) or ["Provide clear initial expectations and mentoring."]

    generic_prompts = [
        "Describe a time you adapted when project priorities shifted unexpectedly. What actions did you take?",
        "How do you prefer to receive feedback during a fast-moving project?",
        "Tell me about a process you improved. What was the result?",
        "How do you prioritize tasks when everything has a tight deadline?",
        "When you receive an ambiguous assignment, what are your first three steps?",
        "Which aspects of onboarding help you ramp up fastest?",
    ]
    combined_prompts = (interview_prompts[:4] + generic_prompts)[:8]

    plan_html = (
        "<strong>0-30 days:</strong> Orientation, mentor pairing, 1 small deliverable, and clear checkpoints.<br>"
        "<strong>31-60 days:</strong> Independent ownership of core tasks, midpoint feedback, continued learning.<br>"
        "<strong>61-90 days:</strong> Full responsibility and a short process improvement presentation."
    )

    training_html = (
        "<ul>"
        "<li>Half-day role tools and systems workshop.</li>"
        "<li>Weekly 30-minute mentor check-ins for the first 6 weeks.</li>"
        "<li>Short targeted training modules to address specific low-average constructs.</li>"
        "</ul>"
    )

    risk_flags_html = (
        "If the role demands extreme procedural precision from day one, provide checklists and SOPs during onboarding. "
        "Monitor workload and check for signs of stress or disengagement in areas flagged with Low averages."
    )

    glossary_html = ""
    if not no_scores:
        for k in sorted(constructs.keys()):
            full_name = humanize(k)
            lookup = full_name.lower()
            if lookup in canonical_map:
                abbr, canonical_full, short_meaning = canonical_map[lookup]
            else:
                abbr = get_abbrev(k)
                canonical_full = full_name
                short_meaning = canonical_full + ": a workplace demand related to environmental fit."
            glossary_html += "<tr><td><strong>" + abbr + "</strong></td><td>" + canonical_full + "</td><td>" + short_meaning + "</td></tr>\n"
    else:
        glossary_html = "<tr><td><strong>N/A</strong></td><td>No scored constructs</td><td>Scored construct aggregates were not available for this run.</td></tr>\n"

    bands_table_html = (
        "<table style='margin-top:8px;'>"
        "<tr><th style='width:200px'>Band</th><th>Average Score</th><th>Role Range (questions)</th></tr>"
        "<tr><td><strong>Core Preference</strong></td><td>&lt;= 2.0</td><td>Questions 1-25</td></tr>"
        "<tr><td><strong>Standard Preference</strong></td><td>2.1-2.9</td><td>Questions 1-32</td></tr>"
        "<tr><td><strong>Advanced Preference</strong></td><td>&gt;= 3.0</td><td>Questions 1-50</td></tr>"
        "</table>"
    )

    computed_overall_avg = (sum(sizes) / max(len(sizes), 1)) if not no_scores else 0.0
    overall_avg = overall_avg_from_result if overall_avg_from_result is not None else computed_overall_avg

    if overall_band_from_result:
        overall_band = overall_band_from_result
    else:
        if overall_avg >= 3.0:
            overall_band = "High"
        elif overall_avg >= 2.0:
            overall_band = "Moderate"
        else:
            overall_band = "Low"

    no_scores_banner = ""
    if no_scores:
        no_scores_banner = (
            "<div style='padding:10px;border:1px solid #e0c080;background:#fff7e6;margin-top:12px;'>"
            "<strong>Notice:</strong> This submission did not produce scored construct aggregates. "
            "A PDF was still generated to confirm successful completion of the workflow. "
            "Next step: verify scoring inputs and aggregate mapping in epq_core.</div>"
        )

    app_name = ""
    try:
        app_name = (applicant_result or {}).get("applicant_name","")
    except Exception:
        pass

    html = f"""
    <html>
    <head>
      <meta charset="utf-8">
      <title>EPQ Applicant Report - {candidate_id}</title>
      <style>
        body {{ font-family: Arial, sans-serif; margin: 28px; color: #222; font-size: 15px; line-height:1.55; }}
        h1 {{ font-size: 26px; margin-bottom:6px; }}
        h2 {{ font-size: 20px; margin-top:18px; }}
        table {{ border-collapse: collapse; width: 100%; margin-top:10px; }}
        th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; font-size: 15px; }}
        th {{ background-color: #f7f7f7; font-weight:600; }}
        td.avg {{ font-weight:700; width:70px; text-align:center; }}
        img {{ max-width: 100%; height: auto; display: block; margin: 12px auto; }}
        p, ul, ol {{ font-size: 17px; }}
      </style>
    </head>
    <body>
      <h1>EPQ Applicant Report</h1>
      <div><strong>Applicant:</strong> {app_name or "—"} &nbsp;&nbsp; <strong>Candidate ID:</strong> {candidate_id} &nbsp;&nbsp; <strong>Date:</strong> {timestamp}</div>


      <h2>Environmental Fit Summary ({str(employer_environment).capitalize()} environment)</h2>
      <p>This report focuses on environmental fit: how the applicant's construct averages align with the employer's role-defined demands.</p>

      {no_scores_banner}

      <h2>Construct Averages and Employer Implications</h2>
      <table>
        <tr>
          <th>Construct (ABBR)</th>
          <th>Avg</th>
          <th>Employer Interpretation</th>
          <th>Positive Implications</th>
          <th>Potential Setbacks and Mitigations</th>
        </tr>
        {table_rows_html}
      </table>

      <h2>Visual Overview</h2>
      <img src="data:image/png;base64,{img_base64}" alt="Construct Averages Bar Chart" />

      <div style="page-break-after:always;"></div>

      <h2>Executive Summary</h2>
      <p>
        The candidate produces an overall construct average of <strong>{overall_avg:.2f}</strong>
        (<strong>{overall_band}</strong> fit band). Recommended for roles requiring initiative, teamwork, and flexibility.
      </p>

      <h2>Key Strengths</h2>
      <ul>{"".join(f"<li>{_fix_mojibake(s)}</li>" for s in key_strengths)}</ul>

      <h2>Development Opportunities (positive framing)</h2>
      <ul>{"".join(f"<li>{_fix_mojibake(s)}</li>" for s in development_opportunities)}</ul>

      <h2>Role Fit and Recommendations</h2>
      <p>Best fits: Project coordinator, operations support, or associate roles in dynamic teams. Place on cross-functional projects to leverage adaptability.</p>

      <h2>Actionable Interview Prompts</h2>
      <ol>{"".join(f"<li>{_fix_mojibake(p)}</li>" for p in combined_prompts)}</ol>

      <h2>30-60-90 Day Onboarding Plan</h2>
      <p>{plan_html}</p>

      <h2>Training and Growth Suggestions</h2>
      {training_html}

      <h2>Risk Flags and Mitigation</h2>
      <p>{risk_flags_html}</p>

      <h2>Employer Interpretation Guide</h2>
      <p>See glossary below for construct explanations and interpretation bands.</p>

      {bands_table_html}

      <table>
        <tr><th>ABBR</th><th>Full Name</th><th>Short Meaning</th></tr>
        {glossary_html}
      </table>
    </body>
    </html>
    """

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = out_dir / f"applicant_report_{candidate_id}.pdf"

    try:
        config = pdfkit.configuration(wkhtmltopdf=wk_path)
        options = {
            "margin-top": "15mm",
            "margin-bottom": "15mm",
            "margin-left": "15mm",
            "margin-right": "15mm",
            "page-size": "A4",
            "encoding": "UTF-8",
            "enable-local-file-access": None,
            "images": None,
            "quiet": "",
        }

        pdfkit.from_string(html, str(pdf_path), configuration=config, options=options)

        if not pdf_path.exists():
            print("[report_generator] PDF generation completed but file not found:", pdf_path)
            return None

        try:
            if pdf_path.stat().st_size < 1024:
                print("[report_generator] PDF file too small; treating as failed:", pdf_path, pdf_path.stat().st_size, "bytes")
                return None
        except Exception:
            pass

        print("[report_generator] PDF report generated:", pdf_path)

        if auto_open:
            try:
                if sys.platform == "win32":
                    os.startfile(pdf_path)  # noqa: S606
                elif sys.platform == "darwin":
                    subprocess.run(["open", str(pdf_path)], check=False)
                else:
                    subprocess.run(["xdg-open", str(pdf_path)], check=False)
            except Exception as e:
                print("[report_generator] PDF generated but could not auto-open:", e)

        return str(pdf_path)

    except Exception as e:
        print("[report_generator] PDF generation failed:", e)
        return None
