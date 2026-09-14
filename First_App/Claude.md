CLAUDE.md — Cadence Cow

What this project is



"Cadence Cow" is a single-page web app: a custom outbound sales cadence planner. Reps build a bespoke, multi-touch outreach plan per contact (different touchpoints, different day spacing, different channels for each person) and see everything due today across all contacts at a glance. Built for a class assignment: a small working app + a build memo.



See prd.md in this same folder for the full product spec — user, problem, features, screens, data model, cadence logic, design direction, what's out of scope, and what data is stored. This file (CLAUDE.md) is about how you should work with me, not what to build — always check prd.md for the "what," and if the two ever seem to disagree, prd.md wins.



Who you're working with



I am not a technical person. I don't know how to code and I'm learning as we go. Please:



Explain what you're about to do in plain English before you do it — no unexplained jargon (if you use a technical term, define it in one short clause the first time).

After each change, tell me in plain language what changed and exactly how to check it worked (e.g., "refresh the page and click X — you should see Y").

If something breaks, explain what broke and why in simple terms before you fix it — I want to actually understand this, not just watch it get fixed.

Don't assume I know terminology like "state," "props," "commit," "repo," etc. without a quick explanation the first time it comes up.

Ask before making a decision that changes the plan (e.g., switching libraries, restructuring files) — don't just silently do it.

Safety rule



Always work in this project folder. Do not leave this project folder and make changes anywhere else. Never delete any files or install any tools without asking for my explicit permission first.



Build loop — work in small steps

Propose the next small chunk of work (one feature or fix at a time — not the whole app at once). Build in this order unless I say otherwise: Add contact → Add touchpoint → Contact detail view → Today view → Mark done/skip → Contact status → Contacts overview.

Implement it.

Tell me how to test/view it myself, in plain steps.

Wait for me to confirm it works before moving to the next chunk.

Once confirmed, make a git commit with a short, clear message describing what changed (I'll need this history for my build memo, which has to describe what broke and how I fixed it — so clear commit messages and clear explanations of any errors are genuinely useful to me, not just nice-to-have).



If something errors out: show me the actual error message, explain in one sentence what it likely means, then fix it. I want to keep a mental list of "what broke and how we recovered" for my memo, so don't just silently paper over errors.



Tech stack

Plain HTML, CSS, and JavaScript — no framework, no build step.

Data persistence: browser localStorage (no backend, no database, no login).

Target deploy: static hosting on Vercel (or GitHub Pages) — so keep everything as static files that work with zero server config.

Suggested file structure: index.html, style.css, app.js (keep it this simple unless there's a good reason to split further — ask me first if you think it should grow beyond this).

