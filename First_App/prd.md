PRODUCT: Cadence Cow



USER: A sales or business-development rep managing 10-30 active outbound prospects, each needing a personalized multi-step cadence across channels — e.g., a rep running corporate recruiting-partnership outreach who plans "Day 1 email, Day 3 call, Day 4 LinkedIn message... Day 21 call" for each contact. Good: "reps who plan multi-step, multi-channel outbound cadences by hand for 10-30 live contacts at once" Bad: "salespeople"



PROBLEM: Reps who plan custom multi-touch cadences by hand (day 1 email, day 3 call, day 4 LinkedIn message, day 21 call...) have no single place to see what's due today across every contact, so they start each day unsure exactly who to reach out to and how.



CORE USER STORY: As a sales rep, I can build a custom cadence of touchpoints for each contact and see everything due today across all of them, so I always know exactly what to do to start my day.



FEATURES:



Add contact — done means: user enters name, company, and a cadence start date (default today); the contact appears in the Contacts list immediately.

Build a custom cadence — done means: on a contact's detail page, user adds any number of touchpoints, each with a day offset (e.g., Day 1, Day 3, Day 21), a channel (email / call / LinkedIn / other), and a short description; touchpoints display in day order.

Edit/remove a touchpoint — done means: user can change a touchpoint's day offset, channel, or description, or delete it entirely, from the contact detail page.

Today view — done means: opening the app shows every pending touchpoint due today or overdue across all contacts, sorted most-urgent-first, with contact name, company, channel, and description visible without clicking into the contact.

Mark off touchpoints — done means: user can mark a touchpoint done or skipped from either the Today view or the contact page, and it immediately stops showing as pending/due.

Contact-level status tracking — done means: user can set a contact's status (active / replied / no\_response / won) from the contact page; setting it to replied, no\_response, or won visually de-emphasizes that contact's remaining touchpoints and removes them from the Today view.

Contacts overview — done means: a Contacts list screen shows every contact as a card with name, company, status, and a progress indicator (e.g., "3 of 7 touchpoints done"), linking to their detail page.



DESIGN DIRECTION: Modern, clean, corporate-SaaS feel (Salesforce Lightning-inspired) as the base — confident blue primary (~#0176D3–#1B96FF), white cards with soft shadows and ~8px rounded corners on a light gray/off-white canvas, clean sans-serif type, purposeful status colors only (blue = active, green = done/won, amber = due today, red = overdue).

Layered on top, a light "Cadence Cow" personality — not a full cartoon theme:
- A simple, minimal cow icon/silhouette (clean line-art, not a cutesy mascot) as the logo mark next to the "Cadence Cow" wordmark in the nav.
- A small cow-spot pattern may subtly accent one element only (e.g. the logo mark) — never the whole background or cards.
- Playful copy in a few low-stakes places only: e.g. the Today view's "nothing due" empty state ("Nothing due — the herd's all caught up 🐮"), or a small success message after marking a touchpoint done.
- Everything else — buttons, forms, the actual work of the app — stays clean and serious.

Goal: a screenshot of the Today view should still read as a legitimate sales tool for a work context, while having enough personality that the "Cadence Cow" name earns a smile.



OUT OF SCOPE (the v2 parking lot): Accounts/login, multi-device sync, a backend or database, reusable cadence templates, recurring/repeating cadences, CRM integrations, automatic email/LinkedIn sending, mobile app, team/shared views.



DATA WE STORE: Per contact — name, job title, company, email, phone, LinkedIn, cadence start date, notes, and status (active/replied/no response/won). Per touchpoint: day offset, channel, description, and done/skipped status. Stored only in the user's own browser (localStorage) — nothing sent to a server or shared with anyone else.

