"""Builds reports/test-cases.xlsx from reports/test-cases.json.

Run after `npm run export` (or scripts/export-test-cases.ts):  python3 scripts/export_excel.py
Requires: pip install openpyxl
"""
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "reports" / "test-cases.json").read_text())
cases = data["testCases"]

FONT = "Arial"
HEAD = PatternFill("solid", start_color="0B1F44")
thin = Side(style="thin", color="D0D5DD")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical="top")
GREEN, RED, GREY = "E6F4EA", "FDECEA", "F2F4F7"

wb = Workbook()

# ---------------- Test Cases ----------------
tc = wb.active
tc.title = "Test Cases"
cols = [
    ("Test Case ID", 13), ("Feature", 30), ("Scenario / Title", 48), ("Type", 10), ("Category", 12),
    ("WCAG Criteria", 16), ("Priority", 9), ("Preconditions", 34), ("Test Steps", 60),
    ("Expected Result", 52), ("Test Data", 22), ("Tags", 30), ("Known Defect", 11),
    ("Status", 10), ("Duration (ms)", 11), ("Actual Result / Failure Reason", 70), ("Feature File", 34),
]
for i, (name, width) in enumerate(cols, 1):
    c = tc.cell(row=1, column=i, value=name)
    c.font = Font(name=FONT, bold=True, color="FFFFFF")
    c.fill = HEAD
    c.alignment = Alignment(wrap_text=True, vertical="center")
    c.border = BORDER
    tc.column_dimensions[get_column_letter(i)].width = width

numbered = lambda xs: "\n".join(f"{n}. {x}" for n, x in enumerate(xs, 1))
for r, c in enumerate(cases, 2):
    actual = c.get("failureReason") or ("All assertions passed." if c["status"] == "Passed" else "")
    row = [
        c["id"], c["feature"], c["scenario"], c["type"], c["category"], ", ".join(c["wcag"]),
        c["priority"], numbered(c["preconditions"]), numbered(c["steps"]), numbered(c["expectedResults"]),
        c["testData"], " ".join(c["tags"]), "Yes" if c["knownDefect"] else "No",
        c["status"], c.get("durationMs"), actual, f'{c["featureFile"]}:{c["line"]}',
    ]
    for col, v in enumerate(row, 1):
        cell = tc.cell(row=r, column=col, value=v)
        cell.font = Font(name=FONT, size=10)
        cell.alignment = WRAP
        cell.border = BORDER

last = len(cases) + 1
status_rng = f"N2:N{last}"
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Passed"'], fill=PatternFill("solid", start_color=GREEN), font=Font(name=FONT, color="137333", bold=True)))
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Failed"'], fill=PatternFill("solid", start_color=RED), font=Font(name=FONT, color="B42318", bold=True)))
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Not run"'], fill=PatternFill("solid", start_color=GREY)))
tab = Table(displayName="TestCases", ref=f"A1:{get_column_letter(len(cols))}{last}")
tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=False)
tc.add_table(tab)
tc.freeze_panes = "D2"

# ---------------- Summary (formulas over the Test Cases sheet) ----------------
s = wb.create_sheet("Summary", 0)
s.column_dimensions["A"].width = 34
for col in "BCDE":
    s.column_dimensions[col].width = 14
title = s["A1"]
title.value = data["suite"]
title.font = Font(name=FONT, bold=True, size=14, color="0B1F44")
s["A2"].value = f'Target: {data["target"]}'
s["A3"].value = f'Run environment: {data.get("runEnvironment", "")}'
s["A4"].value = f'Generated: {data["generated"]}'
for r in range(2, 5):
    s.cell(row=r, column=1).font = Font(name=FONT, size=10, color="475467")

rng = lambda col: f"'Test Cases'!${col}$2:${col}${last}"
headers = ["Metric", "Total", "Positive", "Negative"]
for i, h in enumerate(headers, 1):
    c = s.cell(row=6, column=i, value=h)
    c.font = Font(name=FONT, bold=True, color="FFFFFF")
    c.fill = HEAD
    c.border = BORDER
metrics = [
    ("Test cases", f'=COUNTA({rng("A")})', f'=COUNTIF({rng("D")},"Positive")', f'=COUNTIF({rng("D")},"Negative")'),
    ("Passed", f'=COUNTIF({rng("N")},"Passed")', f'=COUNTIFS({rng("N")},"Passed",{rng("D")},"Positive")', f'=COUNTIFS({rng("N")},"Passed",{rng("D")},"Negative")'),
    ("Failed", f'=COUNTIF({rng("N")},"Failed")', f'=COUNTIFS({rng("N")},"Failed",{rng("D")},"Positive")', f'=COUNTIFS({rng("N")},"Failed",{rng("D")},"Negative")'),
    ("Not run / skipped", "=B7-B8-B9", "=C7-C8-C9", "=D7-D8-D9"),
    ("Pass rate", "=IFERROR(B8/B7,0)", "=IFERROR(C8/C7,0)", "=IFERROR(D8/D7,0)"),
    ("Failed — logged known defects", f'=COUNTIFS({rng("N")},"Failed",{rng("M")},"Yes")', "", ""),
    ("Failed — new / untracked", "=B9-B12", "", ""),
]
for r, row in enumerate(metrics, 7):
    for col, v in enumerate(row, 1):
        c = s.cell(row=r, column=col, value=v)
        c.font = Font(name=FONT, size=10, bold=(col == 1))
        c.border = BORDER
        if r == 11 and col > 1:
            c.number_format = "0.0%"

s.cell(row=15, column=1, value="By category").font = Font(name=FONT, bold=True, size=11, color="0B1F44")
for i, h in enumerate(["Category", "Total", "Passed", "Failed"], 1):
    c = s.cell(row=16, column=i, value=h)
    c.font = Font(name=FONT, bold=True, color="FFFFFF")
    c.fill = HEAD
    c.border = BORDER
cats = list(dict.fromkeys(c["category"] for c in cases))
for r, cat in enumerate(cats, 17):
    vals = [cat, f'=COUNTIF({rng("E")},A{r})', f'=COUNTIFS({rng("E")},A{r},{rng("N")},"Passed")', f'=COUNTIFS({rng("E")},A{r},{rng("N")},"Failed")']
    for col, v in enumerate(vals, 1):
        c = s.cell(row=r, column=col, value=v)
        c.font = Font(name=FONT, size=10)
        c.border = BORDER
note_row = 17 + len(cats) + 1
s.cell(row=note_row, column=1, value="All figures are formulas over the 'Test Cases' sheet; edit a Status cell there and the summary updates.").font = Font(name=FONT, size=9, italic=True, color="475467")

# ---------------- Defects ----------------
d = wb.create_sheet("Defects")
dcols = [("Defect ID", 10), ("Test Case ID", 13), ("WCAG", 12), ("Severity", 10), ("Title", 50), ("Details (from test run)", 80), ("Suggested fix", 60)]
fixes = {
    "1.4.4": "Remove maximum-scale=1 from the viewport meta tag: content=\"width=device-width, initial-scale=1\".",
    "2.4.11": "Move the cookie banner earlier in the DOM / focus it on load, or add scroll-padding-bottom equal to the banner height so focused elements scroll clear of it.",
    "2.4.5": "Render the 404 route inside the standard layout (header, nav, footer) with a 'Back to home' link; replace the developer message.",
    "1.4.10": "Let the About/Contact grids shrink below their min-content width (minmax(0,1fr), overflow-wrap:anywhere on headings) so text wraps at 320px.",
    "best-practice": "Change <aside class=\"contact-side\"> to a <div> (it is inside <main>/<section>), or move it out of the main landmark.",
}
severity = {"1.4.4": "Critical", "2.4.11": "Serious", "1.4.10": "Serious", "2.4.5": "Moderate", "best-practice": "Minor"}
for i, (name, width) in enumerate(dcols, 1):
    c = d.cell(row=1, column=i, value=name)
    c.font = Font(name=FONT, bold=True, color="FFFFFF")
    c.fill = HEAD
    c.border = BORDER
    d.column_dimensions[get_column_letter(i)].width = width
failed = [c for c in cases if c["status"] == "Failed"]
for r, c in enumerate(failed, 2):
    key = next((w for w in c["wcag"] if w in fixes), "best-practice")
    row = [f"A11Y-{r-1:03d}", c["id"], key, severity.get(key, "Moderate"), c["scenario"], c.get("failureReason", ""), fixes.get(key, "")]
    for col, v in enumerate(row, 1):
        cell = d.cell(row=r, column=col, value=v)
        cell.font = Font(name=FONT, size=10)
        cell.alignment = WRAP
        cell.border = BORDER
d.freeze_panes = "C2"

out = ROOT / "reports" / "test-cases.xlsx"
wb.save(out)
print(f"wrote {out} ({len(cases)} test cases, {len(failed)} defects)")
