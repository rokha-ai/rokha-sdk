#!/usr/bin/env python3
"""Keep the docs site's shared chrome in one place.

Every page under docs/ carries five marker pairs:

    <!--chrome:head--> <!--/chrome:head-->     fonts, theme, shell stylesheet
    <!--chrome:top-->  <!--/chrome:top-->      masthead
    <!--chrome:side--> <!--/chrome:side-->     sidebar (the nav below)
    <!--chrome:crumb--><!--/chrome:crumb-->    breadcrumb
    <!--chrome:pager--><!--/chrome:pager-->    previous / next
    <!--chrome:foot--> <!--/chrome:foot-->     footer

    python3 scripts/docs-chrome.py           rewrite the chrome on every page
    python3 scripts/docs-chrome.py --check   fail if any page is stale or any
                                             internal link / anchor is broken
"""
import html
import pathlib
import re
import sys
from html.parser import HTMLParser

DOCS = pathlib.Path(__file__).resolve().parent.parent / "docs"
GH = "https://github.com/rokha-ai/rokha-sdk/blob/main"

NAV = [
    ("Start here", [
        ("index.html", "Overview"),
        ("get-started.html", "Get started"),
        ("install.html", "Connect your agent"),
    ]),
    ("Concepts", [
        ("concepts.html", "Concepts"),
        ("lifecycle.html", "Hire & Task lifecycles"),
        ("terms.html", "Glossary"),
    ]),
    ("Build & sell", [
        ("build.html", "Build"),
        ("sell.html", "Sell"),
        ("your-page.html", "Your page"),
    ]),
    ("Hire & get hired", [
        ("hire.html", "Hire an agent"),
        ("get-hired.html", "Get hired"),
        ("tasks.html", "Tasks"),
    ]),
    ("Money", [
        ("money.html", "Fees & money"),
        ("receipts.html", "Receipts"),
        ("rokha-coin.html", "$ROKHA"),
        ("blockchain.html", "On-chain"),
    ]),
    ("For agents", [
        ("agents.html", "Agents"),
        ("identity.html", "Security & trust"),
        ("api.html", "API reference"),
    ]),
    ("Project", [
        ("roadmap.html", "Roadmap"),
        ("whitepaper.html", "White paper"),
        ("manifesto.html", "Manifesto"),
        ("vision.html", "Vision"),
        ("faq.html", "FAQ"),
    ]),
]
# Pages kept for old links, outside the nav.
EXTRA = {
    "leaderboard.html": ("Project", "The Tailwind (history)"),
    "telegram-bot.html": ("For agents", "Telegram (off)"),
}

TABS = [
    ("index.html", "Docs"),
    ("api.html", "API"),
    ("roadmap.html", "Roadmap"),
    ("whitepaper.html", "White paper"),
]

ORDER = [p for _, items in NAV for p, _ in items]
TITLE = {p: t for _, items in NAV for p, t in items}
GROUP = {p: g for g, items in NAV for p, _ in items}
for p, (g, t) in EXTRA.items():
    TITLE[p], GROUP[p] = t, g

HEAD = """
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=B612:ital,wght@0,400;0,700;1,400&family=B612+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="./site-theme.css">
<link rel="stylesheet" href="./docs.css">
<script src="./site-theme.js"></script>
"""


def top(page):
    tabs = []
    for href, label in TABS:
        cur = href == page or (href == "index.html" and page not in {h for h, _ in TABS[1:]})
        attr = ' aria-current="page"' if cur else ""
        tabs.append(f'<a href="./{href}"{attr}>{label}</a>')
    return f"""
<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Show the docs menu">
<header class="top">
  <div class="top-in">
    <a class="mark" href="./index.html"><i aria-hidden="true"></i>Rokha <small>docs</small></a>
    <nav class="tabs" aria-label="Docs">{"".join(tabs)}</nav>
    <a class="go" href="https://rokha.ai">rokha.ai&nbsp;→</a>
    <label class="menu-btn" for="nav-toggle"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Menu</label>
    <div data-site-theme></div>
  </div>
</header>
"""


def side(page):
    out = ['\n<nav class="side" aria-label="All docs pages">']
    for group, items in NAV:
        out.append(f"  <h4>{group}</h4>\n  <ul>")
        for href, label in items:
            cur = ' aria-current="page"' if href == page else ""
            out.append(f'    <li><a href="./{href}"{cur}>{html.escape(label)}</a></li>')
        out.append("  </ul>")
    out.append("</nav>\n")
    return "\n".join(out)


def crumb(page):
    if page == "index.html":
        return '\n<p class="crumb">Docs</p>\n'
    return f'\n<p class="crumb"><a href="./index.html">Docs</a> / {GROUP.get(page, "Docs")}</p>\n'


def pager(page):
    if page not in ORDER:
        return '\n<nav class="pager" aria-label="Previous and next"><a href="./index.html"><small>Back to</small>Overview</a></nav>\n'
    i = ORDER.index(page)
    parts = []
    if i > 0:
        p = ORDER[i - 1]
        parts.append(f'<a class="prev" href="./{p}"><small>Previous</small>{html.escape(TITLE[p])}</a>')
    if i + 1 < len(ORDER):
        n = ORDER[i + 1]
        parts.append(f'<a class="next" href="./{n}"><small>Next</small>{html.escape(TITLE[n])}</a>')
    return f'\n<nav class="pager" aria-label="Previous and next">{"".join(parts)}</nav>\n'


FOOT = f"""
<footer class="foot">
  <div class="foot-in">
    <div><h4>Start</h4><ul>
      <li><a href="./get-started.html">Get started</a></li>
      <li><a href="./install.html">Connect your agent</a></li>
      <li><a href="./concepts.html">Concepts</a></li>
      <li><a href="./faq.html">FAQ</a></li>
    </ul></div>
    <div><h4>Work</h4><ul>
      <li><a href="./build.html">Build</a></li>
      <li><a href="./sell.html">Sell</a></li>
      <li><a href="./hire.html">Hire an agent</a></li>
      <li><a href="./tasks.html">Tasks</a></li>
    </ul></div>
    <div><h4>Money</h4><ul>
      <li><a href="./money.html">Fees &amp; money</a></li>
      <li><a href="./receipts.html">Receipts</a></li>
      <li><a href="./rokha-coin.html">$ROKHA</a></li>
      <li><a href="https://rokha.ai/fees">rokha.ai/fees</a></li>
    </ul></div>
    <div><h4>Developers</h4><ul>
      <li><a href="./api.html">API reference</a></li>
      <li><a href="{GH}/schemas/openapi.yaml">OpenAPI</a></li>
      <li><a href="https://rokha.ai/llms.txt">llms.txt</a></li>
      <li><a href="{GH}/CHANGELOG.md">Changelog</a></li>
    </ul></div>
    <div><h4>Project</h4><ul>
      <li><a href="./roadmap.html">Roadmap</a></li>
      <li><a href="./whitepaper.html">White paper</a></li>
      <li><a href="./manifesto.html">Manifesto</a></li>
      <li><a href="https://rokha.ai/news">News</a></li>
    </ul></div>
    <div><h4>Elsewhere</h4><ul>
      <li><a href="https://rokha.ai">rokha.ai</a></li>
      <li><a href="https://x.com/Rokha_ai">@Rokha_ai</a></li>
      <li><a href="https://github.com/rokha-ai/rokha-sdk">GitHub</a></li>
      <li><a href="https://github.com/rokha-ai/rokha-sdk/issues/new">Report an issue</a></li>
    </ul></div>
    <p class="fine">Rokha — The AI Studio and Marketplace. Capabilities here run for real, or say plainly why they cannot. Rokha AI LLC.</p>
  </div>
</footer>
"""

PARTS = {"head": lambda p: HEAD, "top": top, "side": side, "crumb": crumb, "pager": pager, "foot": lambda p: FOOT}


def render(page, text):
    for name, fn in PARTS.items():
        pat = re.compile(rf"(<!--chrome:{name}-->)(.*?)(<!--/chrome:{name}-->)", re.S)
        if not pat.search(text):
            raise SystemExit(f"{page}: missing <!--chrome:{name}--> markers")
        text = pat.sub(lambda m: m.group(1) + fn(page) + m.group(3), text, count=1)
    return text


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for k in ("href", "src"):
            if a.get(k) and tag in ("a", "link", "script", "img"):
                self.hrefs.append(a[k])


def check_links(pages):
    parsed = {}
    for p in pages:
        lp = Links()
        lp.feed((DOCS / p).read_text())
        parsed[p] = lp
    bad = []
    for p, lp in parsed.items():
        for h in lp.hrefs:
            if re.match(r"^([a-z][a-z0-9+.-]*:|#$)", h):
                continue
            path, _, frag = h.partition("#")
            path = path.removeprefix("./")
            target = p if path == "" else path
            if target.endswith("/") or not target:
                tgt = DOCS / target / "index.html"
            else:
                tgt = DOCS / target
            if not tgt.exists():
                bad.append(f"{p}: {h} (no file)")
                continue
            if frag and target in parsed and frag not in parsed[target].ids:
                bad.append(f"{p}: {h} (no anchor)")
    return bad


def main():
    check = "--check" in sys.argv
    pages = sorted(p.name for p in DOCS.glob("*.html"))
    stale = []
    for page in pages:
        f = DOCS / page
        text = f.read_text()
        new = render(page, text)
        if new != text:
            if check:
                stale.append(page)
            else:
                f.write_text(new)
    missing = [p for p in ORDER if p not in pages]
    bad = check_links(pages)
    for s in stale:
        print(f"stale chrome: {s} (run scripts/docs-chrome.py)")
    for m in missing:
        print(f"nav names a missing page: {m}")
    for b in bad:
        print(f"broken link: {b}")
    if stale or missing or bad:
        sys.exit(1)
    print(f"ok — {len(pages)} pages, chrome current, every internal link and anchor resolves")


if __name__ == "__main__":
    main()
