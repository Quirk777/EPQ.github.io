#!/usr/bin/env python3
"""Bulk-heal stale/missing PDF report rows.

Goal
----
Find applicants where:
  - pdf_status = 'success'
  - but the referenced PDF file does not exist in REPORTS_DIR

Then:
  - regenerate the PDF using the same app flow (report_generator.generate_pdf_report)
  - update applicants.pdf_filename to the regenerated basename
  - skip rows that cannot be repaired cleanly (missing/corrupt score_json, missing assessment)

Safety
------
- This is a local/ops script only; it is not exposed as an API route.
- It only writes PDFs into REPORTS_DIR and only stores basenames into the DB.
- It strips any directory components from pdf_filename to prevent path traversal.

Usage
-----
  python scripts/heal_missing_pdfs.py --dry-run
  python scripts/heal_missing_pdfs.py

Optional environment variables
------------------------------
  REPORTS_DIR: override the on-disk reports directory
  WKHTMLTOPDF_PATH: override wkhtmltopdf location for pdfkit

"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Add the project root to the Python path (so imports work when executed from anywhere)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


logger = logging.getLogger("epq.scripts.heal_missing_pdfs")


def _reports_dir() -> Path:
    reports_dir = Path(os.environ.get("REPORTS_DIR") or (PROJECT_ROOT / "reports")).expanduser().resolve()
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir


def _safe_reports_path(reports_dir: Path, raw_name: str) -> Path:
    """Resolve a DB-stored pdf_filename to a safe on-disk path under reports_dir."""
    raw = (raw_name or "").strip()
    if not raw:
        return reports_dir

    p = Path(raw)
    # Always force basename-only to keep this an ops repair tool that writes into REPORTS_DIR.
    return reports_dir / p.name


def _parse_score_json(raw: Any) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {}

    s = raw.strip()
    if not s:
        return {}

    try:
        parsed = json.loads(s)
    except Exception:
        return {}

    return parsed if isinstance(parsed, dict) else {}


@dataclass
class HealCounts:
    total_checked: int = 0
    repaired: int = 0
    skipped: int = 0
    failed: int = 0


def heal_missing_pdfs(*, dry_run: bool, limit: int | None, candidate_id: str | None) -> HealCounts:
    """Scan DB for success rows, heal missing report files, and update pdf_filename."""

    from app.services import db

    reports_dir = _reports_dir()
    logger.info("PROJECT_ROOT=%s", PROJECT_ROOT)
    logger.info("REPORTS_DIR=%s", reports_dir)
    logger.info("dry_run=%s", dry_run)

    counts = HealCounts()

    con = db.connect()
    try:
        cur = con.cursor()

        sql = (
            "SELECT candidate_id, assessment_id, pdf_status, pdf_filename, score_json "
            "FROM applicants WHERE pdf_status = 'success'"
        )
        params: tuple[Any, ...] = ()
        if candidate_id:
            sql += " AND candidate_id = ?"
            params = (candidate_id,)
        sql += " ORDER BY COALESCE(submitted_utc, '') DESC"
        if limit and limit > 0:
            sql += " LIMIT ?"
            params = params + (int(limit),)

        cur.execute(sql, params)

        rows = cur.fetchall()
        logger.info("Rows matched: %s", len(rows))

        # Import lazily; if pdfkit/wkhtmltopdf isn\'t available, we still want clean logs.
        try:
            from report_generator import generate_pdf_report
        except Exception as exc:
            logger.error("Cannot import report_generator.generate_pdf_report: %s", exc)
            # Treat as failures for all rows that would require repair.
            for r in rows:
                counts.total_checked += 1
                pdf_filename = (dict(r).get("pdf_filename") or "").strip()
                pdf_path = _safe_reports_path(reports_dir, pdf_filename) if pdf_filename else None
                if pdf_path and pdf_path.exists():
                    counts.skipped += 1
                else:
                    counts.failed += 1
            return counts

        for r in rows:
            counts.total_checked += 1
            row = dict(r)
            cid = (row.get("candidate_id") or "").strip()
            aid = (row.get("assessment_id") or "").strip()
            pdf_filename = (row.get("pdf_filename") or "").strip()

            if not cid or not aid:
                logger.warning("SKIP: missing candidate_id or assessment_id (candidate_id=%r assessment_id=%r)", cid, aid)
                counts.skipped += 1
                continue

            pdf_path = _safe_reports_path(reports_dir, pdf_filename) if pdf_filename else None
            if pdf_path and pdf_path.exists():
                logger.debug("OK: %s already has PDF %s", cid, pdf_path.name)
                counts.skipped += 1
                continue

            # File missing: attempt repair
            score = _parse_score_json(row.get("score_json"))
            if not score:
                logger.warning("SKIP: %s missing/corrupt score_json; cannot regenerate", cid)
                counts.skipped += 1
                continue

            assessment = db.get_assessment(aid)
            if not assessment:
                logger.warning("SKIP: %s assessment not found (%s)", cid, aid)
                counts.skipped += 1
                continue

            env = (assessment.get("environment") or "Standard").strip() or "Standard"

            if dry_run:
                logger.info("DRY-RUN: would regenerate %s (env=%s) -> reports/", cid, env)
                counts.repaired += 1
                continue

            try:
                out_path_str = generate_pdf_report(
                    applicant_result=score,
                    employer_environment=env,
                    candidate_id=cid,
                    output_dir=str(reports_dir),
                    auto_open=False,
                )
            except Exception as exc:
                logger.exception("FAIL: %s regeneration threw: %s", cid, exc)
                counts.failed += 1
                continue

            if not out_path_str:
                logger.warning("SKIP: %s generate_pdf_report returned None", cid)
                counts.skipped += 1
                continue

            try:
                out_path = Path(out_path_str)
                out_basename = out_path.name
                final_path = reports_dir / out_basename
            except Exception as exc:
                logger.exception("FAIL: %s could not interpret generated pdf path (%r): %s", cid, out_path_str, exc)
                counts.failed += 1
                continue

            if not final_path.exists():
                # Some environments may return an absolute path; if it exists and is under reports_dir, accept.
                try:
                    resolved = out_path.expanduser().resolve()
                    if resolved.exists() and (reports_dir in resolved.parents or resolved == reports_dir):
                        final_path = resolved
                        out_basename = resolved.name
                    else:
                        logger.warning("SKIP: %s generated PDF path does not exist under REPORTS_DIR (%s)", cid, out_path_str)
                        counts.skipped += 1
                        continue
                except Exception:
                    logger.warning("SKIP: %s generated PDF path does not exist (%s)", cid, out_path_str)
                    counts.skipped += 1
                    continue

            try:
                size = final_path.stat().st_size
            except Exception:
                size = None

            if not size or size < 1000:
                logger.warning("SKIP: %s regenerated PDF too small/invalid (%s bytes) at %s", cid, size, final_path)
                counts.skipped += 1
                continue

            try:
                db.set_applicant_pdf_success(cid, out_basename)
            except Exception as exc:
                logger.exception("FAIL: %s could not update DB pdf_filename=%s: %s", cid, out_basename, exc)
                counts.failed += 1
                continue

            logger.info("REPAIRED: %s -> %s (%s bytes)", cid, out_basename, size)
            counts.repaired += 1

        return counts

    finally:
        try:
            con.close()
        except Exception:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Bulk-heal missing PDFs for applicants marked pdf_status=success")
    parser.add_argument("--dry-run", action="store_true", help="Do not write PDFs or update DB; just report what would be repaired")
    parser.add_argument("--limit", type=int, default=0, help="Limit the number of matched rows processed (0 = no limit)")
    parser.add_argument("--candidate-id", type=str, default="", help="Only process a single candidate_id")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="[%(levelname)s] %(message)s",
    )

    counts = heal_missing_pdfs(
        dry_run=bool(args.dry_run),
        limit=(args.limit if args.limit and args.limit > 0 else None),
        candidate_id=(args.candidate_id.strip() or None),
    )

    print("\n=== PDF HEAL SUMMARY ===")
    print(f"Total checked: {counts.total_checked}")
    print(f"Repaired:      {counts.repaired}")
    print(f"Skipped:       {counts.skipped}")
    print(f"Failed:        {counts.failed}")

    # Exit non-zero if failures occurred (useful in ops runs)
    return 2 if counts.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
