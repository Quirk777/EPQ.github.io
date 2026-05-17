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
        "structural clarity load": ("SCL", "Structural Clarity Load", "How strongly the applicant appears to rely on clear rules, role boundaries, decision rights, and predictable expectations."),
        "cognitive compression demand": ("CCD", "Cognitive Compression Demand", "How the applicant appears to manage dense information, competing details, and the need to turn complexity into workable priorities."),
        "complexity integration load": ("CIL", "Complexity Integration Load", "How comfortable the applicant appears when synthesizing multiple variables, trade-offs, and ambiguous inputs into decisions."),
        "change volatility load": ("CVL", "Change Volatility Load", "How the applicant appears to respond when priorities, processes, timelines, or business conditions shift quickly."),
        "emotional regulation load": ("ERL", "Emotional Regulation Load", "How the applicant appears to handle emotionally demanding interactions, pressure, conflict, or high-stakes interpersonal moments."),
        "motivational sustainment demand": ("MSD", "Motivational Sustainment Demand", "How the applicant appears to sustain effort across repetitive, delayed-reward, or long-cycle work."),
        "interpersonal coordination intensity": ("ICI", "Interpersonal Coordination Intensity", "How the applicant appears to experience frequent coordination, stakeholder alignment, collaboration, and real-time communication."),
        "autonomy & judgment load": ("AJL", "Autonomy & Judgment Load", "How the applicant appears to handle independent judgment, self-direction, ownership, and decisions without constant managerial guidance."),
    }
    canonical_by_abbr = {abbr: (abbr, full, meaning) for abbr, full, meaning in canonical_map.values()}

    construct_profiles = {
        "SCL": {
            "plain": "structure and role clarity",
            "employer_value": "Use this signal to calibrate how explicit expectations, success criteria, and operating rules should be during ramp-up.",
            "higher": ("May be comfortable operating from defined expectations and translating structure into dependable execution.", "Too much ambiguity or shifting accountability may reduce confidence if the role is advertised as more structured than it is.", "Share decision rights, examples of successful work, and a short written definition of what good performance looks like."),
            "balanced": ("Likely to work with a reasonable mix of guidance and independence when expectations are introduced early.", "May need clarification when ownership boundaries or approval paths are unclear.", "Confirm priorities in writing during the first month, then reduce scaffolding as confidence grows."),
            "lower": ("May tolerate looser environments and learn through exploration rather than heavy procedural detail.", "Highly regulated or rule-bound work may feel constraining unless the purpose behind the process is clear.", "Explain which procedures are mandatory, where discretion is welcome, and how exceptions should be escalated."),
        },
        "CCD": {
            "plain": "dense information and mental load",
            "employer_value": "Use this to discuss how the applicant processes information, prioritizes, and avoids overload in detail-heavy work.",
            "higher": ("May be comfortable compressing complex inputs into priorities, summaries, or next steps.", "Sustained information density can still create fatigue if everything is urgent or poorly organized.", "Provide context, decision deadlines, and templates for recurring analysis so high cognitive effort is directed well."),
            "balanced": ("Likely to manage ordinary information load when priorities and source materials are organized.", "Rapid context switching or unclear data ownership may slow momentum.", "Group related information, define the immediate decision, and separate must-know details from background material."),
            "lower": ("May do best when information is sequenced, concrete, and connected to the task at hand.", "Dense documentation, simultaneous requests, or unclear prioritization may create friction.", "Use staged onboarding, examples, checklists, and brief summaries before asking for independent synthesis."),
        },
        "CIL": {
            "plain": "multi-factor problem solving",
            "employer_value": "Use this to understand how the applicant approaches ambiguity, trade-offs, and decisions that do not have one obvious answer.",
            "higher": ("May be energized by problems that require judgment across competing variables.", "Can over-invest in analysis if decision speed and constraints are not explicit.", "Agree on decision thresholds, time boxes, and what level of evidence is enough to move forward."),
            "balanced": ("Likely to integrate complexity when the problem is framed clearly and stakeholders agree on the goal.", "May need help when variables conflict or success criteria are moving.", "Use structured decision briefs and review trade-offs together on early assignments."),
            "lower": ("May contribute strongest when complex problems are broken into concrete choices or smaller workstreams.", "Highly ambiguous work may feel less effective without a clear frame.", "Break complex work into staged questions, provide examples, and make the decision model visible."),
        },
        "CVL": {
            "plain": "change and volatility",
            "employer_value": "Use this to explore how the applicant responds to shifting priorities, imperfect information, and changing operating conditions.",
            "higher": ("May adapt quickly when plans change and may tolerate fluid work better than highly static routines.", "Frequent change still requires prioritization; otherwise adaptability can become reactive work.", "Name what changed, what stayed stable, and which priorities should be protected."),
            "balanced": ("Likely to handle normal business change when updates are explained and trade-offs are visible.", "Abrupt shifts without context may create avoidable uncertainty.", "Use short change briefings: what changed, why it matters, and what decision is needed now."),
            "lower": ("May perform best where change is paced, explained, and connected to a stable operating rhythm.", "Constant pivots may reduce focus or confidence if the work lacks anchors.", "Provide advance notice where possible, preserve core routines, and clarify what not to worry about yet."),
        },
        "ERL": {
            "plain": "emotional pressure and regulation",
            "employer_value": "Use this to discuss the emotional demands of the role, including conflict, customer pressure, feedback, or high-stakes conversations.",
            "higher": ("May remain effective during pressure, interpersonal tension, or emotionally charged interactions.", "High emotional load should not be normalized as unlimited capacity; recovery and escalation paths still matter.", "Define escalation channels, debrief difficult moments, and avoid using resilience as a substitute for support."),
            "balanced": ("Likely to handle ordinary interpersonal pressure when expectations and support norms are clear.", "Repeated emotional strain may accumulate if it is not acknowledged.", "Set norms for feedback, conflict resolution, and when to involve a manager."),
            "lower": ("May do best when emotionally intense work is bounded, predictable, and supported.", "Roles with frequent conflict or distressed stakeholders may require more deliberate support.", "Use scripts, shadowing, debriefs, and clear escalation rules for high-pressure interactions."),
        },
        "MSD": {
            "plain": "sustained motivation over time",
            "employer_value": "Use this to explore what keeps the applicant engaged when work is repetitive, delayed in reward, or requires persistence.",
            "higher": ("May sustain effort through longer cycles, repeated tasks, or delayed outcomes.", "Persistence can still decline when progress is invisible or effort feels disconnected from impact.", "Make progress visible, connect recurring tasks to business outcomes, and rotate stretch work where appropriate."),
            "balanced": ("Likely to sustain motivation when milestones, feedback, and workload variety are balanced.", "Long stretches without feedback or visible progress may reduce energy.", "Use milestone check-ins, visible wins, and a balanced mix of routine and learning tasks."),
            "lower": ("May engage best when work has shorter feedback loops, variety, and visible purpose.", "Highly repetitive or slow-cycle work may require more intentional pacing.", "Create near-term milestones, explain why routine tasks matter, and add variety after baseline competence is established."),
        },
        "ICI": {
            "plain": "collaboration and coordination intensity",
            "employer_value": "Use this to calibrate meeting load, stakeholder interaction, handoffs, and real-time collaboration expectations.",
            "higher": ("May be comfortable coordinating across people, dependencies, and live discussion.", "Heavy collaboration can become fragmented without decision discipline and ownership clarity.", "Clarify meeting purpose, ownership after discussion, and which channels are for urgent versus async work."),
            "balanced": ("Likely to collaborate well when interaction has a clear purpose and does not crowd out focused work.", "Too many meetings or unclear handoffs may create friction.", "Set communication norms, define handoff expectations, and protect focus time during ramp-up."),
            "lower": ("May be strongest when collaboration is purposeful, prepared, and balanced with independent focus.", "Highly interruptive or meeting-heavy roles may reduce effectiveness.", "Use agendas, written context, async updates, and clear expectations for when live coordination is required."),
        },
        "AJL": {
            "plain": "autonomy and independent judgment",
            "employer_value": "Use this to understand how much direction, ownership, and decision latitude the applicant may need during ramp-up.",
            "higher": ("May be comfortable making decisions, owning outcomes, and moving forward without constant approval.", "Autonomy works best when boundaries and escalation triggers are clear.", "Define decision rights, risk limits, and when to seek alignment before acting."),
            "balanced": ("Likely to take ownership when goals are clear and support is available for unfamiliar decisions.", "May pause when authority is unclear or when decisions carry visible risk.", "Use progressive autonomy: start with shared decisions, then expand ownership as evidence builds."),
            "lower": ("May do best with closer guidance at first, especially when decisions are new, ambiguous, or high impact.", "Too much early independence may create uncertainty or slow execution.", "Provide examples, approval paths, and manager availability before widening decision latitude."),
        },
    }

    def construct_meta(key: str) -> tuple[str, str, str]:
        direct = str(key).strip().upper()
        if direct in canonical_by_abbr:
            return canonical_by_abbr[direct]
        full_name = humanize(key)
        lookup = full_name.lower()
        if lookup in canonical_map:
            return canonical_map[lookup]
        abbr = get_abbrev(key)
        return (abbr, full_name, f"{full_name} is a job-relevant work-environment demand used to discuss fit and onboarding.")

    def construct_profile(abbr: str, full_name: str) -> dict:
        return construct_profiles.get(
            abbr,
            {
                "plain": full_name.lower(),
                "employer_value": "Use this signal to guide role-fit conversation, expectations, and onboarding support.",
                "higher": (
                    f"May be comfortable with higher demand related to {full_name.lower()}.",
                    "Confirm examples rather than assuming the score generalizes to every context.",
                    "Clarify expectations, decision rules, and early success measures.",
                ),
                "balanced": (
                    f"Likely to adapt to moderate {full_name.lower()} when context is clear.",
                    "May need support if the demand increases quickly or becomes poorly defined.",
                    "Use normal manager context, early feedback, and practical examples.",
                ),
                "lower": (
                    f"May work best when {full_name.lower()} is introduced with more structure.",
                    "High immediate demand may create friction if support is limited.",
                    "Use staged onboarding, examples, and focused check-ins.",
                ),
            },
        )

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

    labels = [construct_meta(k)[0] for k in ordered_keys]
    sizes = [_get_avg(k) for k in ordered_keys]

    no_scores = (not sizes) or (sum(sizes) == 0)

    if no_scores:
        print("[report_generator] No construct scores available (empty/zero). Generating placeholder PDF so pipeline completes.")
        ordered_keys = ["no_scores_available"]
        labels = ["No Scored Constructs"]
        sizes = [1.0]

    # ---------- horizontal bar chart ----------
    fig, ax = plt.subplots(figsize=(8.6, 4.2))

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
    construct_reference_html = ""
    key_strengths = []
    development_opportunities = []
    interview_prompts = []
    scored_items = []

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
            abbr, canonical_full, short_meaning = construct_meta(k)
            profile = construct_profile(abbr, canonical_full)

            avg = _get_avg(k)

            band, band_meaning = band_label(avg)
            strength, consideration, support = profile[band.lower()]
            feedback_text = f"{band_meaning} In employer terms, this is a signal about {profile['plain']}, not a fixed trait."

            if band == "Higher":
                key_strengths.append(f"Explore how the applicant uses {profile['plain']} productively when the work is demanding.")
            elif band == "Balanced":
                development_opportunities.append(f"Confirm what level of guidance helps the applicant stay effective with {profile['plain']}.")
            else:
                development_opportunities.append(f"Plan early support around {profile['plain']} if the role requires it from day one.")

            scored_items.append({
                "key": k,
                "abbr": abbr,
                "full": canonical_full,
                "meaning": short_meaning,
                "plain": profile["plain"],
                "avg": avg,
                "band": band,
            })

            table_rows_html += (
                "<tr>"
                "<td><strong style='font-size:13px'>" + html_escape(abbr) + "</strong><div class='construct-name'>" + html_escape(canonical_full) + "</div></td>"
                "<td class='avg'>" + format(avg, ".2f") + "<div class='band'>" + html_escape(band) + "</div></td>"
                "<td><strong>" + html_escape(band_meaning) + "</strong><br>" + html_escape(_fix_mojibake(feedback_text)) + "</td>"
                "<td>" + html_escape(_fix_mojibake(strength)) + "</td>"
                "<td>" + html_escape(_fix_mojibake(consideration)) + "<br><em>Onboarding move:</em> " + html_escape(_fix_mojibake(support)) + "</td>"
                "</tr>\n"
            )

        key_strengths = sorted(set(key_strengths)) or ["Adaptive, collaborative, dependable."]
        development_opportunities = sorted(set(development_opportunities)) or ["Provide clear initial expectations and mentoring."]

        for item in sorted(scored_items, key=lambda x: x["abbr"]):
            construct_reference_html += (
                "<tr>"
                "<td><strong>" + html_escape(item["abbr"]) + "</strong></td>"
                "<td><strong>" + html_escape(item["full"]) + "</strong><div class='muted'>Score: " + format(item["avg"], ".2f") + " · " + html_escape(item["band"]) + "</div></td>"
                "<td>" + html_escape(_fix_mojibake(item["meaning"])) + "</td>"
                "<td>" + html_escape(_fix_mojibake(construct_profile(item["abbr"], item["full"])["employer_value"])) + "</td>"
                "</tr>\n"
            )

    prompt_bank = {
        "SCL": {
            "Higher": "Tell me about a time clear expectations or operating rules helped you do your best work. What made the structure useful rather than restrictive?",
            "Balanced": "When you start a new role or project, what information helps you understand what good performance looks like?",
            "Lower": "Tell me about a time you had to make progress without much structure. How did you decide what mattered first?",
        },
        "CCD": {
            "Higher": "Tell me about a time you had to absorb a lot of information quickly and turn it into a practical next step.",
            "Balanced": "How do you organize information when several people are giving you input at the same time?",
            "Lower": "When a project has a lot of details, what helps you avoid feeling overloaded and stay accurate?",
        },
        "CIL": {
            "Higher": "Tell me about a decision where you had to balance several competing factors. How did you decide what trade-off was acceptable?",
            "Balanced": "When a problem has several possible answers, how do you usually narrow the options?",
            "Lower": "Tell me about a time a complex task became easier because someone helped frame the problem clearly.",
        },
        "CVL": {
            "Higher": "Tell me about a time priorities changed suddenly. How did you reset your plan and keep momentum?",
            "Balanced": "How do you prefer managers communicate changes in direction so you can adjust effectively?",
            "Lower": "Tell me about a time change was difficult at work. What helped you regain focus and confidence?",
        },
        "ERL": {
            "Higher": "Tell me about a time you stayed effective during a tense conversation or high-pressure situation.",
            "Balanced": "What helps you receive difficult feedback or handle conflict constructively?",
            "Lower": "When work becomes emotionally intense, what kind of support or preparation helps you perform at your best?",
        },
        "MSD": {
            "Higher": "Tell me about work that required persistence over a long period. How did you keep yourself engaged?",
            "Balanced": "What kinds of milestones or feedback help you stay motivated when results take time?",
            "Lower": "When work becomes repetitive, what helps you reconnect it to purpose or make steady progress?",
        },
        "ICI": {
            "Higher": "Tell me about a time you coordinated across several people or teams. How did you keep communication clear?",
            "Balanced": "How do you balance collaboration with focused individual work?",
            "Lower": "What helps you contribute well in a collaborative setting without losing the focus time you need?",
        },
        "AJL": {
            "Higher": "Tell me about a time you had to make an independent decision without waiting for detailed direction.",
            "Balanced": "When taking ownership of a new responsibility, what guidance helps you move confidently?",
            "Lower": "Tell me about a time close coaching or a clear decision path helped you succeed in unfamiliar work.",
        },
    }

    if not no_scores:
        high_items = sorted(scored_items, key=lambda x: x["avg"], reverse=True)[:3]
        low_items = sorted(scored_items, key=lambda x: x["avg"])[:3]
        selected_items = []
        seen = set()
        for item in high_items + low_items:
            if item["abbr"] not in seen:
                selected_items.append(item)
                seen.add(item["abbr"])
        for item in selected_items:
            prompt = prompt_bank.get(item["abbr"], {}).get(item["band"])
            if prompt:
                interview_prompts.append(prompt)

    generic_prompts = [
        "What conditions help you ramp up quickly in a new team, and what tends to slow that process down?",
        "Describe the kind of manager communication that helps you do your strongest work.",
        "Tell me about a recent role or project where the working environment brought out your best performance.",
        "If you joined this team, what would you want us to understand about how you learn, collaborate, and make decisions?",
    ]
    combined_prompts = (interview_prompts + generic_prompts)[:8]

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

    if no_scores:
        construct_reference_html = (
            "<tr><td><strong>N/A</strong></td><td>No scored constructs</td>"
            "<td>Scored construct aggregates were not available for this run.</td>"
            "<td>Review scoring inputs before using this report for employer interpretation.</td></tr>\n"
        )

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
        html {{ text-rendering: auto; }}
        body {{ font-family: "DejaVu Sans", Arial, Helvetica, sans-serif; margin: 12px 16px; color: #1f2933; font-size: 12px; line-height:1.5; letter-spacing: 0; word-spacing: 0; text-align: left; }}
        h1 {{ font-size: 23px; margin: 0 0 6px; color: #12131a; font-weight: 600; letter-spacing: 0; line-height:1.18; }}
        h2 {{ font-size: 14.5px; margin: 16px 0 8px; color: #12131a; font-weight: 600; letter-spacing: 0; line-height:1.3; page-break-after: avoid; }}
        h3 {{ font-size: 12.8px; margin: 12px 0 7px; color: #293241; font-weight: 600; line-height:1.32; }}
        p {{ margin: 0 0 9px; max-width: 680px; }}
        ul, ol {{ margin-top: 8px; padding-left: 21px; }}
        li {{ margin-bottom: 6px; line-height:1.48; }}
        table {{ border-collapse: collapse; width: 100%; margin-top:9px; page-break-inside: auto; }}
        tr {{ page-break-inside: avoid; }}
        th, td {{ border: 1px solid #d9dee7; padding: 9px 10px; text-align: left; vertical-align: top; font-size: 11px; line-height:1.46; word-spacing: 0; letter-spacing: 0; overflow-wrap: normal; }}
        th {{ background-color: #f4f6f8; font-weight:600; color: #293241; text-transform: none; }}
        td.avg {{ font-weight:600; width:86px; text-align:center; }}
        strong {{ font-weight: 600; }}
        em {{ font-style: italic; }}
        .band {{ margin-top: 4px; font-size: 9.8px; color: #5d6b7a; font-weight: 600; text-transform: none; letter-spacing: 0; }}
        .construct-name {{ font-size:10.4px; color:#4d5967; line-height:1.34; margin-top:3px; }}
        .muted {{ color:#66717f; font-size:10px; margin-top:3px; line-height:1.35; }}
        img {{ max-width: 84%; height: auto; display: block; margin: 5px auto 2px; }}
        .meta {{ color:#5d6b7a; font-size:11px; line-height:1.42; margin-bottom: 11px; }}
        .summary {{ border: 1px solid #d9dee7; background:#f7f9fb; border-radius: 8px; padding: 11px 12px; margin: 10px 0; page-break-inside: avoid; }}
        .summary-grid {{ display: table; width: 100%; table-layout: fixed; margin-top: 9px; }}
        .summary-cell {{ display: table-cell; padding: 9px 10px; border-right: 1px solid #d9dee7; }}
        .summary-cell:last-child {{ border-right: 0; }}
        .summary-label {{ font-size:10px; text-transform: none; letter-spacing:0; color:#6b7684; font-weight:600; }}
        .summary-value {{ font-size:17px; color:#12131a; font-weight:600; margin-top:4px; line-height:1.24; }}
        .note {{ border-left: 4px solid #6f8f7a; background:#f4f8f5; padding: 9px 11px; margin: 10px 0; color:#304438; page-break-inside: avoid; }}
        .disclaimer {{ border: 1px solid #d9dee7; background:#fbfbfc; padding: 10px 11px; margin-top: 13px; font-size: 10.5px; line-height:1.44; color:#4d5967; }}
        .section-grid {{ display: table; width: 100%; table-layout: fixed; border-spacing: 10px 0; margin-top: 6px; }}
        .section-cell {{ display: table-cell; width: 50%; vertical-align: top; border: 1px solid #d9dee7; border-radius: 8px; background: #ffffff; padding: 11px 13px; }}
        .action-box {{ border: 1px solid #d9dee7; background: #f7f9fb; border-radius: 8px; padding: 11px 13px; margin-top: 11px; }}
        .compact-heading {{ margin-top: 0; }}
        .reference-table th:nth-child(1), .reference-table td:nth-child(1) {{ width: 62px; text-align:center; }}
        .reference-table th:nth-child(2), .reference-table td:nth-child(2) {{ width: 210px; }}
        .scores-table th:nth-child(1), .scores-table td:nth-child(1) {{ width: 150px; }}
        .scores-table th:nth-child(2), .scores-table td:nth-child(2) {{ width: 80px; }}
        .prompt-list li {{ padding-left: 3px; max-width: 700px; }}
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

      <h2>Construct Reference</h2>
      <p>
        These constructs describe work-environment demands. They are designed to make the applicant conversation more precise:
        what kind of work context helps this person perform, where might friction appear, and what support would make ramp-up fairer.
      </p>
      <table class="reference-table">
        <tr><th>Code</th><th>Full Construct</th><th>Professional Definition</th><th>Why It Matters</th></tr>
        {construct_reference_html}
      </table>

      <h2>Construct Scores and Employer Interpretation</h2>
      <table class="scores-table">
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
      <ol class="prompt-list">{"".join(f"<li>{html_escape(_fix_mojibake(p))}</li>" for p in combined_prompts)}</ol>

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
            "margin-top": "11mm",
            "margin-bottom": "11mm",
            "margin-left": "12mm",
            "margin-right": "12mm",
            "page-size": "A4",
            "encoding": "UTF-8",
            "images": None,
            "quiet": "",
            "dpi": "96",
            "zoom": "1",
            "minimum-font-size": "10",
            "disable-smart-shrinking": "",
            "print-media-type": "",
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
