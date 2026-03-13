# DRIFTLOOM

**Polyrhythm Texture Engine**

A generative music tool that layers independent repeating melodic cells at different rates to create evolving polyrhythmic textures. Inspired by the techniques of Steve Reich, Brian Eno, Philip Glass, Terry Riley, Arvo Pärt, and other minimalist and ambient composers.

## What it does

Each voice line repeats a short melodic pattern at its own rate (beats per measure). When multiple voices overlap at different rates — say 3 against 5 against 7 — the result is a constantly shifting texture that's more than the sum of its parts.

## Features

- **Up to 8 independent voice lines** with per-voice rate, timbre, volume, pan, and melody sequence
- **12 composer-inspired palettes** — weighted pitch sets that capture the harmonic character of Reich, Eno, Glass, Adams, Riley, Young, Pärt, Sakamoto, Feldman, Ligeti, and Xenakis
- **11 preset configurations** — one click to hear each composer's vibe
- **Reverb + tempo-synced delay** with musical subdivision control
- **Auto mode** — voices automatically add/remove over time
- **Shuffle** — randomize all voices while keeping the current palette and timbre
- **Stereo panning** — each voice gets a random position in the stereo field
- **Octave range control** — constrain pitches for focused or wide textures
- **Master limiter** — keeps output clean even with 8 stacked voices

## Getting started

```bash
pnpm install
pnpm dev
```

## Deploy to Vercel

```bash
pnpm i -g vercel
vercel
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

## Built with

- [React](https://react.dev)
- [Tone.js](https://tonejs.github.io) — Web Audio framework
- [Vite](https://vitejs.dev) — Build tool

## License

MIT
