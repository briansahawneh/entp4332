# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A prompt-engineering comparison: two independent, self-contained "Tip Splitter" web apps, each a single `index.html` with inline `<style>` and `<script>` — no build step, no dependencies, no package.json.

- `Session2_BadPrompt/index.html` — built from a minimal/vague prompt (~485 lines).
- `Session2_DetailedPrompt/index.html` — built from a detailed/specific prompt (~699 lines).

The two folders are deliberately parallel implementations of the same app, meant to be compared. When editing one, check whether the same change is expected in the other before assuming it's a shared bug.

## Running / testing

There is no build or test tooling. Open a file directly in a browser to run it:

```bash
start Session2_BadPrompt/index.html
start Session2_DetailedPrompt/index.html
```

To iterate with live reload, serve the folder and use the Browser preview tool rather than editing blind — e.g. `npx serve Session2_DetailedPrompt`.

## Deployment

The repo is pushed to a private GitHub repo (`briansahawneh/entp4332`) and each folder is linked as its **own separate Vercel project**, with its own Root Directory setting pointing at that folder. A `git push` to `master` auto-redeploys both. There is no shared root site — do not add a root-level `index.html` expecting it to be served; it won't be picked up by either Vercel project.

## Architecture notes

Each `index.html` is fully self-contained: CSS custom properties in `:root` drive theming, and a single inline `<script>` block wires up DOM event listeners (bill input, tip slider/presets, people stepper, reset) that all funnel into one `calculate()` function recomputing tip/total/per-person amounts. There's no module system, no external state — everything lives in that one file per app.
