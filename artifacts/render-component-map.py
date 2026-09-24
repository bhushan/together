"""Generate the editable Form 2 component map SVG."""

from html import escape
from pathlib import Path


OUT = Path(__file__).with_name("form-2-component-map.svg")
WIDTH, HEIGHT = 1800, 1273
EXPORT_SCALE = 2
GRID_X, GRID_Y = 290, 280
COL_W, ROW_H = 288, 130
HEADERS = ("TRIGGER", "INPUT", "CONTEXT", "PROCESSING", "OUTPUT")
ROWS = (
    ("Riya", "Organiser", "Start a trip", "Trip name; currency", "Shared group link", "Create trip; lock choice", "Result and vote tally"),
    ("Friends", "Participants", "Open group link", "Origin; dates; budget", "Likes; dealbreakers", "Join; edit privately; vote", "Options and positions"),
    ("Trip Planner", "App", "Responses complete", "Preferences; votes", "Hard constraints; offers", "Check; rank; tally", "Options or conflicts"),
    ("Gemini", "AI service", "Candidate request", "Group preferences", "Dates; destination types", "Suggest; explain", "Structured candidates"),
    ("Supabase", "Data store", "Read or write", "Trips; people; rounds", "Edits; votes; result", "Persist; retrieve", "Current group state"),
    ("Other API", "SerpApi", "Live offer request", "Origins; dates; places", "Flights; hotels", "Fetch live quotes", "Prices; links; times"),
)


def text(x, y, value, size=27, color="#182640", weight=500, anchor="start"):
    return (
        f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial, Helvetica, sans-serif" '
        f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{escape(value)}</text>'
    )


parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH * EXPORT_SCALE}" height="{HEIGHT * EXPORT_SCALE}" viewBox="0 0 {WIDTH} {HEIGHT}">',
    '<rect width="1800" height="1273" fill="#f8fafc"/>',
    '<rect x="34" y="34" width="1732" height="1205" rx="30" fill="white" stroke="#dce5ee" stroke-width="2"/>',
    text(72, 113, "TOGETHER · GROUP TRIP PLANNER", 24, "#276d8f", 700),
    text(72, 169, "Component map", 50, "#142138", 700),
    text(72, 211, "From one shared link to a group decision", 25, "#55657a", 400),
    '<rect x="68" y="273" width="1652" height="3" rx="1.5" fill="#dfe8ee"/>',
]

for col, heading in enumerate(HEADERS):
    parts.append(text(GRID_X + col * COL_W + 20, GRID_Y - 18, heading, 21, "#46758a", 700))

for row, cells in enumerate(ROWS):
    y = GRID_Y + row * ROW_H
    fill = "#f5f9fb" if row % 2 == 0 else "#ffffff"
    parts.append(f'<rect x="68" y="{y}" width="1652" height="{ROW_H}" fill="{fill}"/>')
    parts.append(f'<rect x="68" y="{y}" width="6" height="{ROW_H}" fill="{("#1687a8" if row < 3 else "#63a295")}"/>')
    parts.append(text(94, y + 53, cells[0], 29, "#162840", 700))
    parts.append(text(94, y + 83, cells[1], 21, "#687b8e", 400))
    for col, cell in enumerate(cells[2:]):
        x = GRID_X + col * COL_W + 20
        words = cell.split(" ")
        lines = []
        current = ""
        for word in words:
            candidate = (current + " " + word).strip()
            if len(candidate) > 19 and current:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
        if len(lines) > 2:
            lines = [" ".join(words[: len(words) // 2]), " ".join(words[len(words) // 2 :])]
        start_y = y + (56 if len(lines) == 1 else 43)
        for index, line in enumerate(lines):
            parts.append(text(x, start_y + index * 32, line, 24, "#26364a", 500))
    parts.append(f'<line x1="68" y1="{y + ROW_H}" x2="1720" y2="{y + ROW_H}" stroke="#dce6ed" stroke-width="2"/>')

for col in range(6):
    x = GRID_X + col * COL_W
    if col == 5:
        x = 1720
    parts.append(f'<line x1="{x}" y1="{GRID_Y}" x2="{x}" y2="{GRID_Y + 6 * ROW_H}" stroke="#e3ebf0" stroke-width="2"/>')

parts.extend(
    [
        text(72, 1120, "FLOW", 21, "#46758a", 700),
        text(72, 1158, "People → App", 24, "#162840", 600),
        text(390, 1158, "App ↔ Supabase", 24, "#162840", 600),
        text(735, 1158, "App ↔ Gemini", 24, "#162840", 600),
        text(1045, 1158, "App ↔ SerpApi", 24, "#162840", 600),
        text(1400, 1158, "Results → people", 24, "#162840", 600),
        '<line x1="72" y1="1180" x2="1718" y2="1180" stroke="#dfe8ee" stroke-width="2"/>',
        text(72, 1211, "SerpApi supplies live flight and hotel prices; the app verifies feasibility and shows quote times.", 19, "#63768a", 400),
        '</svg>',
    ]
)

OUT.write_text("\n".join(parts) + "\n", encoding="utf-8")
print(OUT)
