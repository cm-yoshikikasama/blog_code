"""HTML report generation script.

Embeds Agent JSON results into an HTML template to generate a report file.

Usage:
    python3 {SKILL_DIR}/scripts/generate_report.py \
        --data '<JSON array string>' \
        --period '2026-03 (1-7d)' \
        --output {SKILL_DIR}/reports/2026-03.html

    Or pass JSON via stdin:
    echo '<JSON>' | python3 {SKILL_DIR}/scripts/generate_report.py \
        --period '2026-03 (1-7d)' \
        --output {SKILL_DIR}/reports/2026-03.html
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = SCRIPT_DIR / "report_template.html"

REQUIRED_DATA_KEYS = {"summary", "serviceCosts"}
REQUIRED_SUMMARY_KEYS = {"totalCost"}


def validate_report_data(report_data):
    """Validate the structure of report data and normalize to list format."""
    if isinstance(report_data, dict):
        report_data = [report_data]

    if not isinstance(report_data, list) or len(report_data) == 0:
        raise ValueError("Report data must be a non-empty list or object")

    for i, account in enumerate(report_data):
        label = account.get("name", f"index {i}")

        if "data" not in account:
            raise ValueError(f"Account '{label}': 'data' key is missing")

        data = account["data"]
        missing = REQUIRED_DATA_KEYS - set(data.keys())
        if missing:
            raise ValueError(f"Account '{label}': missing keys in data: {missing}")

        if "summary" in data:
            missing_s = REQUIRED_SUMMARY_KEYS - set(data["summary"].keys())
            if missing_s:
                raise ValueError(
                    f"Account '{label}': missing keys in summary: {missing_s}"
                )

    return report_data


def generate_report(report_data, period, output_path):
    report_data = validate_report_data(report_data)
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    json_str = json.dumps(report_data, ensure_ascii=False)
    # Prevent </script> injection: escape forward slash after '<'
    json_str = json_str.replace("</", r"<\/")

    html = template.replace("{{REPORT_DATA}}", json_str)
    html = html.replace("{{REPORT_PERIOD}}", period)
    html = html.replace("{{GENERATED_AT}}", now)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")

    return output.stat().st_size


def main():
    parser = argparse.ArgumentParser(
        description="AWS Cost Analysis HTML Report Generator"
    )
    parser.add_argument("--data", help="JSON string of REPORT_DATA array")
    parser.add_argument("--data-file", help="Path to JSON file containing REPORT_DATA")
    parser.add_argument(
        "--period", required=True, help="Report period label (e.g., '2026-03 (1-7d)')"
    )
    parser.add_argument("--output", required=True, help="Output HTML file path")
    args = parser.parse_args()

    if args.data:
        report_data = json.loads(args.data)
    elif args.data_file:
        with open(args.data_file, encoding="utf-8") as f:
            report_data = json.load(f)
    elif not sys.stdin.isatty():
        report_data = json.load(sys.stdin)
    else:
        parser.error("--data, --data-file, or stdin is required")

    size = generate_report(report_data, args.period, args.output)
    print(f"Written: {args.output} ({size:,} bytes)")


if __name__ == "__main__":
    main()
