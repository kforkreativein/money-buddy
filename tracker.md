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
| 7 | Delete entry with undo | ✅ Completed | Immediate delete + 5s undo toast, no confirm dialog |
| 8 | Payment mode: GPay or Cash | ✅ Completed | Toggle in form |
| 9 | GPay bank selector: Yes Bank / HDFC | ✅ Completed | Shown only when GPay selected |
| 10 | Notes/description field (no categories) | ✅ Completed | Free-text, optional |

---

## UI / UX

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11 | Claymorphism design system | ✅ Completed | `.clay`, `.clay-green`, `.clay-red`, etc. in globals.css |
| 12 | Nunito rounded font | ✅ Completed | Google Fonts via next/font |
| 13 | Warm cream background (#FFF7ED) | ✅ Completed | Joyful, non-clinical feel |
| 14 | Mobile-first layout (max-w-md) | ✅ Completed | Primary device is phone |
| 15 | Clay button press animation | ✅ Completed | `.clay-btn` active state |
| 16 | Onboarding modal (5 steps, shown once) | ✅ Completed | localStorage flag `onboarding_done` |
| 17 | Hidden totals (₹ ·····) with eye icon | ✅ Completed | Per-card toggle, default hidden |
| 18 | Transaction list (newest first) | ✅ Completed | With payment badge, date, edit button |
| 19 | Empty state illustration | ✅ Completed | 🪙 icon + friendly message |
| 20 | Profile name + Hey [Name] greeting | ✅ Completed | localStorage, time-aware greeting |
| 21 | Desktop view optimization | ✅ Completed | 2-column layout on lg screens (lg:flex-row) |
| 22 | Quick amount shortcuts | ✅ Completed | ₹100 / ₹500 / ₹1000 / ₹2000 chips in form |
| 23 | Monthly summary view | ✅ Completed | Grouped by month with income/expense totals per group |
| 24 | Search & filter entries | ✅ Completed | Search by description, date, or amount |

---

## Audio / Visual Effects

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 25 | Income confetti burst | ✅ Completed | canvas-confetti, 3 staggered bursts |
| 26 | Income happy ascending tones | ✅ Completed | Web Audio API: C4→E4→G4→C5 |
| 27 | Expense sad descending tones (6 levels) | ✅ Completed | Level 1 (₹500) to Level 6 (₹3000+), slower + lower |
| 28 | Emoji rain 💸😢 for expense >₹500 | ✅ Completed | More emojis at higher amounts |
| 29 | Motivation banner toast (expense >₹500) | ✅ Completed | Random message, auto-dismisses in 10s |

---

## Data & Analytics

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 30 | Export to CSV | ✅ Completed | One-tap download, all transactions |
| 31 | Budget goal / spending limit | ✅ Completed | Set monthly limit, progress bar, over-budget alert |
| 32 | Spending insights chart | ✅ Completed | 4-month bar chart, income vs expense, CSS bars |

---

## PWA / Platform

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 33 | PWA manifest.json | ✅ Completed | Enables "Add to Home Screen" on iOS Safari |
| 34 | ?action=add URL param | ✅ Completed | Auto-opens add form (for Back Tap shortcut) |
| 35 | iOS Back Tap shortcut support | ✅ Completed | User creates Shortcut → Back Tap. See CLAUDE.md |
| 36 | Offline support (service worker) | ⬜ Not Started | Could add next-pwa for full offline |
| 37 | Push notifications | ⬜ Not Started | Daily spending reminder (requires service worker) |

---

## Future Ideas

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 38 | Recurring transactions | ✅ Completed | Toggle in form, frequency picker, auto-adds on load, manage via RecurringManager |
| 39 | Multiple wallets / accounts | ✅ Completed | Wallet picker in form, WalletBar with net balances + opening balance, edit name/emoji/balance, add/delete custom wallets |
| 40 | Filter by wallet | ✅ Completed | Tap wallet card to filter transactions list, ✕ Clear filter button |
| 41 | Net balance / savings | ✅ Completed | Income − expense shown below stats cards, hidden by default with eye toggle |
| 44 | User login (username + password) | ✅ Completed | Sign up / sign in screen, per-user isolated data, session remembered on this device |
| 45 | Investment tracking | ✅ Completed | Third type alongside income/expense, own stats column, excluded from expense budget & net income |
| 42 | Currency / language localization | ⬜ Not Started | Support for multiple Indian languages |
| 43 | Dark mode | ⬜ Not Started | Not planned (warm cream is intentional) |
