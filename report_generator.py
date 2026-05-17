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
from html import escape as html_escape

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

    bar_colors = ["#4f6f93", "#6f8f7a", "#8e7d9f", "#9f8f68", "#7f8fa6", "#8a6f76", "#5f7f83", "#8f785f"]

    # Reverse so first item appears at top
    labels_rev = list(reversed(labels))
    sizes_rev = list(reversed(sizes))
    colors_rev = list(reversed(bar_colors))

    ax.barh(labels_rev, sizes_rev, color=colors_rev)

    # add numeric value labels at end of bars
    for y, v in enumerate(sizes_rev):
        ax.text(v + 0.03, y, f"{v:.2f}", va="center", fontsize=9)

    ax.set_title("EPQ Work Environment Profile" if not no_scores else "EPQ Work Environment Profile (No Scored Data)", fontsize=16)
    ax.set_xlabel("Average response score (1-4)")
    ax.grid(axis="x", alpha=0.18)
    ax.spines[["top", "right", "left"]].set_visible(False)

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

    def band_label(avg: float) -> tuple[str, str]:
        if avg >= 2.7:
            return ("Higher", "Higher tolerance or preference for this workplace demand.")
        if avg >= 2.0:
            return ("Balanced", "Flexible range; likely to adapt with normal manager context.")
        return ("Lower", "Preference for clearer supports or lower load in this area.")

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

            band, band_meaning = band_label(avg)

            env_key = str(employer_environment).capitalize()
            feedback_text = ""
            if isinstance(EPQ_FEEDBACK, dict):
                feedback_text = (
                    EPQ_FEEDBACK.get(k, {}).get(env_key, {}).get(band, "")
                    or EPQ_FEEDBACK.get(k, {}).get("Standard", {}).get(band, "")
                    or ""
                )

            if not feedback_text:
                if band == "Higher":
                    feedback_text = abbr + " suggests comfort with higher demand in this work-environment area."
                elif band == "Balanced":
                    feedback_text = abbr + " suggests a flexible, moderate preference that can adapt to reasonable variation."
                else:
                    feedback_text = abbr + " suggests the candidate may work best with clearer structure or lighter demand in this area."

            if band == "Higher":
                positive = "Useful signal for roles where " + canonical_full.lower() + " is a regular part of the work."
                setback = "Avoid assuming this is universally better; very high demand can still create fatigue without prioritization."
                mitigation = "Use this as a role-design strength and confirm examples during interview."
                key_strengths.append(abbr + ": comfortable with higher " + canonical_full.lower() + ".")
            elif band == "Balanced":
                positive = "Likely to adapt when expectations are clear and workload is managed."
                setback = "May benefit from brief check-ins if this demand spikes quickly."
                mitigation = "Provide concise expectations and review cadence during onboarding."
                development_opportunities.append(abbr + ": use concise expectations and normal manager check-ins.")
            else:
                positive = "Can perform well when role expectations and supports are explicit."
                setback = "Possible friction if high " + canonical_full.lower() + " is required immediately without support."
                mitigation = "Use checklists, paired mentoring, examples of good work, and short focused training."
                development_opportunities.append(abbr + ": provide structured onboarding, examples, and checklists.")

            interview_prompts.append("Describe a time when " + canonical_full.lower() + " mattered and how you handled it.")

            table_rows_html += (
                "<tr>"
                "<td><strong style='font-size:14px'>" + abbr + "</strong><div style='font-size:11px;color:#555'>" + canonical_full + "</div></td>"
                "<td class='avg'>" + format(avg, ".2f") + "<div class='band'>" + html_escape(band) + "</div></td>"
                "<td><strong>" + html_escape(band_meaning) + "</strong><br>" + html_escape(_fix_mojibake(feedback_text)) + "</td>"
                "<td>" + html_escape(_fix_mojibake(positive)) + "</td>"
                "<td>" + html_escape(_fix_mojibake(setback)) + "<br><em>Suggested support:</em> " + html_escape(_fix_mojibake(mitigation)) + "</td>"
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
        "<strong>0-30 days:</strong> Confirm role expectations, pair with a mentor, define one measurable early deliverable, and schedule short checkpoints.<br>"
        "<strong>31-60 days:</strong> Expand ownership of core tasks, review workload fit, and adjust support based on observed friction points.<br>"
        "<strong>61-90 days:</strong> Move toward fuller responsibility and ask the candidate to present one process improvement or learning insight."
    )

    training_html = (
        "<ul>"
        "<li>Role tools and systems walkthrough focused on the first two weeks of work.</li>"
        "<li>Weekly 30-minute mentor check-ins for the first six weeks.</li>"
        "<li>Targeted training or examples for any lower-scoring environmental demand that is critical to the role.</li>"
        "</ul>"
    )

    risk_flags_html = (
        "Use lower or higher scores as prompts for role-fit discussion, not as automatic risks. "
        "If the role requires immediate high load in a lower-preference area, provide checklists, examples, and manager check-ins during onboarding. "
        "Watch for workload friction, unclear expectations, or avoidable stress in the first 30 days."
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
        "<tr><th style='width:180px'>Band</th><th>Average Score</th><th>How to read it</th></tr>"
        "<tr><td><strong>Lower</strong></td><td>&lt; 2.0</td><td>Likely preference for lower load, clearer structure, or additional support in this area.</td></tr>"
        "<tr><td><strong>Balanced</strong></td><td>2.0-2.69</td><td>Flexible range; usually workable with clear expectations and normal manager context.</td></tr>"
        "<tr><td><strong>Higher</strong></td><td>&gt;= 2.7</td><td>Likely comfort with higher demand in this area; still validate with examples.</td></tr>"
        "</table>"
    )

    computed_overall_avg = (sum(sizes) / max(len(sizes), 1)) if not no_scores else 0.0
    overall_avg = overall_avg_from_result if overall_avg_from_result is not None else computed_overall_avg

    if overall_band_from_result:
        overall_band = overall_band_from_result
    else:
        if overall_avg >= 3.0:
            overall_band = "Higher"
        elif overall_avg >= 2.0:
            overall_band = "Balanced"
        else:
            overall_band = "Lower"

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

    safe_app_name = html_escape(str(app_name or ""))

    html = f"""
    <html>
    <head>
      <meta charset="utf-8">
      <title>EPQ Applicant Report - {candidate_id}</title>
      <style>
        * {{ box-sizing: border-box; }}
        body {{ font-family: Arial, sans-serif; margin: 18px 22px; color: #1f2933; font-size: 12px; line-height:1.38; }}
        h1 {{ font-size: 24px; margin: 0 0 4px; color: #12131a; letter-spacing: -0.2px; }}
        h2 {{ font-size: 15px; margin: 16px 0 7px; color: #12131a; }}
        h3 {{ font-size: 13px; margin: 12px 0 6px; color: #293241; }}
        p {{ margin: 0 0 8px; }}
        ul, ol {{ margin-top: 8px; padding-left: 20px; }}
        li {{ margin-bottom: 4px; }}
        table {{ border-collapse: collapse; width: 100%; margin-top:8px; page-break-inside: auto; }}
        th, td {{ border: 1px solid #d9dee7; padding: 7px 8px; text-align: left; vertical-align: top; font-size: 11px; }}
        th {{ background-color: #f4f6f8; font-weight:700; color: #293241; }}
        td.avg {{ font-weight:700; width:82px; text-align:center; }}
        .band {{ margin-top: 4px; font-size: 10px; color: #5d6b7a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
        img {{ max-width: 92%; height: auto; display: block; margin: 8px auto; }}
        .meta {{ color:#5d6b7a; font-size:11px; margin-bottom: 10px; }}
        .summary {{ border: 1px solid #d9dee7; background:#f7f9fb; border-radius: 8px; padding: 11px; margin: 10px 0; }}
        .summary-grid {{ display: table; width: 100%; table-layout: fixed; margin-top: 8px; }}
        .summary-cell {{ display: table-cell; padding: 8px; border-right: 1px solid #d9dee7; }}
        .summary-cell:last-child {{ border-right: 0; }}
        .summary-label {{ font-size:10px; text-transform: uppercase; letter-spacing:0.08em; color:#6b7684; font-weight:700; }}
        .summary-value {{ font-size:18px; color:#12131a; font-weight:800; margin-top:3px; }}
        .note {{ border-left: 4px solid #6f8f7a; background:#f4f8f5; padding: 8px 10px; margin: 10px 0; color:#304438; }}
        .disclaimer {{ border: 1px solid #d9dee7; background:#fbfbfc; padding: 9px 10px; margin-top: 12px; font-size: 10px; color:#4d5967; }}
        .section-grid {{ display: table; width: 100%; table-layout: fixed; border-spacing: 10px 0; margin-top: 6px; }}
        .section-cell {{ display: table-cell; width: 50%; vertical-align: top; border: 1px solid #d9dee7; border-radius: 8px; background: #ffffff; padding: 10px 12px; }}
        .action-box {{ border: 1px solid #d9dee7; background: #f7f9fb; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }}
        .compact-heading {{ margin-top: 0; }}
      </style>
    </head>
    <body>
      <h1>EPQ Applicant Report</h1>
      <div class="meta"><strong>Applicant:</strong> {safe_app_name or "—"} &nbsp;&nbsp; <strong>Candidate ID:</strong> {html_escape(str(candidate_id))} &nbsp;&nbsp; <strong>Generated:</strong> {html_escape(str(timestamp))}</div>

      <div class="summary">
        <h2 style="margin-top:0">Executive Snapshot</h2>
        <p>
          EPQ summarizes how this applicant appears to prefer or tolerate different work-environment demands.
          It is designed to support structured employer conversations, onboarding planning, and role-fit review.
        </p>
        <div class="summary-grid">
          <div class="summary-cell">
            <div class="summary-label">Overall average</div>
            <div class="summary-value">{overall_avg:.2f}</div>
          </div>
          <div class="summary-cell">
            <div class="summary-label">Profile band</div>
            <div class="summary-value">{html_escape(str(overall_band))}</div>
          </div>
          <div class="summary-cell">
            <div class="summary-label">Role environment</div>
            <div class="summary-value" style="font-size:17px">{html_escape(str(employer_environment).capitalize())}</div>
          </div>
        </div>
      </div>

      <div class="note">
        <strong>How to use this report:</strong> Treat the scores as work-environment preference signals.
        They are not pass/fail results, clinical findings, medical assessments, or a substitute for structured interviewing.
      </div>

      {no_scores_banner}

      <h2>Construct Scores and Employer Interpretation</h2>
      <table>
        <tr>
          <th>Construct</th>
          <th>Score</th>
          <th>Interpretation</th>
          <th>Employer Use</th>
          <th>Support Plan</th>
        </tr>
        {table_rows_html}
      </table>

      <h2>Visual Overview</h2>
      <img src="data:image/png;base64,{img_base64}" alt="Construct Averages Bar Chart" />

      <div style="page-break-after:always;"></div>

      <div class="section-grid">
        <div class="section-cell">
          <h2 class="compact-heading">Likely Strengths to Explore</h2>
          <ul>{"".join(f"<li>{html_escape(_fix_mojibake(s))}</li>" for s in key_strengths[:5])}</ul>
        </div>
        <div class="section-cell">
          <h2 class="compact-heading">Onboarding Supports to Consider</h2>
          <ul>{"".join(f"<li>{html_escape(_fix_mojibake(s))}</li>" for s in development_opportunities[:5])}</ul>
        </div>
      </div>

      <h2>Employer Interpretation</h2>
      <p>
        A higher score is not automatically better, and a lower score is not automatically worse.
        The useful question is whether the role's daily environment matches the candidate's preferred level of structure,
        ambiguity, collaboration, autonomy, change, and emotional load. Use this report to shape interview questions,
        clarify role expectations, and design a fair onboarding plan.
      </p>

      <h2>Actionable Interview Prompts</h2>
      <ol>{"".join(f"<li>{html_escape(_fix_mojibake(p))}</li>" for p in combined_prompts)}</ol>

      <div class="action-box">
        <h2 class="compact-heading">30-60-90 Day Onboarding Plan</h2>
        <p>{plan_html}</p>
      </div>

      <h2>Training and Growth Suggestions</h2>
      {training_html}

      <h2>Risk Flags and Mitigation</h2>
      <p>{risk_flags_html}</p>

      <h2>Score Guide</h2>
      <p>Use bands as conversation prompts and onboarding inputs. Validate important signals with examples from the candidate's experience.</p>

      {bands_table_html}

      <h2>Construct Glossary</h2>
      <table>
        <tr><th>ABBR</th><th>Full Name</th><th>Short Meaning</th></tr>
        {glossary_html}
      </table>

      <div class="disclaimer">
        <strong>Important:</strong> EPQ is an employment decision-support tool focused on work-environment preferences and demands.
        It should be used alongside structured interviews, job-relevant evidence, and consistent hiring criteria.
        Do not use this report as a medical, psychological, disability, or clinical diagnosis, and do not treat it as a pass/fail hiring decision.
      </div>
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
            "images": None,
            "quiet": "",
        }

        # Security: do NOT allow local file access by default.
        # If you truly need it (e.g., you embed local assets), opt-in explicitly.
        if (os.environ.get("WKHTMLTOPDF_ENABLE_LOCAL_FILE_ACCESS", "false") or "false").lower() == "true":
            options["enable-local-file-access"] = None

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
