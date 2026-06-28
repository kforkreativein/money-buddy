# Money Buddy — Feature Tracker

> Status: `✅ Completed` | `🔄 In Progress` | `⬜ Not Started`

---

## Core Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Next.js 16 + Tailwind v4 scaffold | ✅ Completed | App Router, TypeScript |
| 2 | localStorage data persistence | ✅ Completed | No backend needed |
| 3 | Transaction data model | ✅ Completed | id, type, amount, description, paymentMode, bank, date |
| 4 | Add Income entry | ✅ Completed | With amount, notes, payment mode, date |
| 5 | Add Expense entry | ✅ Completed | With amount, notes, payment mode, date |
| 6 | Edit any existing entry | ✅ Completed | Pre-filled form in bottom-sheet modal |
| 7 | Payment mode: GPay or Cash | ✅ Completed | Toggle in form |
| 8 | GPay bank selector: Yes Bank / HDFC | ✅ Completed | Shown only when GPay selected |
| 9 | Notes/description field (no categories) | ✅ Completed | Free-text, required |

---

## UI / UX

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 10 | Claymorphism design system | ✅ Completed | `.clay`, `.clay-green`, `.clay-red`, etc. in globals.css |
| 11 | Nunito rounded font | ✅ Completed | Google Fonts via next/font |
| 12 | Warm cream background (#FFF7ED) | ✅ Completed | Joyful, non-clinical feel |
| 13 | Mobile-first layout (max-w-md) | ✅ Completed | Primary device is phone |
| 14 | Clay button press animation | ✅ Completed | `.clay-btn` active state |
| 15 | Onboarding modal (5 steps, shown once) | ✅ Completed | localStorage flag `onboarding_done` |
| 16 | Hidden totals (₹ ·····) with eye icon | ✅ Completed | Per-card toggle, default hidden |
| 17 | Transaction list (newest first) | ✅ Completed | With payment badge, date, edit button |
| 18 | Empty state illustration | ✅ Completed | 🪙 icon + friendly message |
| 19 | Desktop view optimization | ⬜ Not Started | Max-width container, larger screens |

---

## Audio / Visual Effects

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 20 | Income confetti burst | ✅ Completed | canvas-confetti, colorful |
| 21 | Income happy ascending tones | ✅ Completed | Web Audio API: C4→E4→G4→C5 |
| 22 | Expense sad descending tones (6 levels) | ✅ Completed | Level 1 (₹500) to Level 6 (₹3000+), slower + lower |
| 23 | Emoji rain 💸😢 for expense >₹500 | ✅ Completed | More emojis at higher amounts |
| 24 | Motivation banner toast (expense >₹500) | ✅ Completed | Random message, auto-dismisses in 4s |

---

## PWA / Platform

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 25 | PWA manifest.json | ✅ Completed | Enables "Add to Home Screen" on iOS Safari |
| 26 | ?action=add URL param | ✅ Completed | Auto-opens add form (for Back Tap shortcut) |
| 27 | iOS Back Tap shortcut support | ✅ Completed | User creates Shortcut → Back Tap. See CLAUDE.md |
| 28 | Offline support (service worker) | ⬜ Not Started | Could add next-pwa for full offline |
| 29 | Push notifications | ⬜ Not Started | E.g. daily spending reminder |

---

## Future Ideas (Not Started)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 30 | Monthly summary view | ⬜ Not Started | Group by month, show totals |
| 31 | Export to CSV / PDF | ⬜ Not Started | Simple data export |
| 32 | Delete entry | ⬜ Not Started | With confirmation |
| 33 | Search / filter entries | ⬜ Not Started | By description or date |
| 34 | Recurring transactions | ⬜ Not Started | Auto-add salary, rent, etc. |
| 35 | Budget goal / limit warning | ⬜ Not Started | Alert when monthly expense crosses a limit |
| 36 | Multiple accounts | ⬜ Not Started | Separate wallets / family members |
| 37 | Dark mode | ⬜ Not Started | Not planned (warm cream is intentional) |
