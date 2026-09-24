# Nova Beauty Studio: Free AI Booking System (Demo)

A complete appointment booking demo with an admin dashboard. **Zero cost, zero backend**: plain HTML/CSS/JS, `localStorage` as the database, deployable on GitHub Pages.

## Features
- **Customers:** pick service (duration + price), date, live available slots, details form, confirmation with appointment ID, cancel via ID + email/phone.
- **AI-style assistant:** local keyword/rule parser ("I want a facial tomorrow afternoon" -> service, date, time-of-day) then suggests real open slots. No external AI API. `parse()` in `script.js` is the single place to swap in a real model later.
- **Admin:** month calendar, today/upcoming, customers, service stats, cancellation rate, booking sources, create/edit/cancel/complete/no-show, filter by date/status, search.
- **Rules engine:** configurable weekly hours, slot interval, blocked dates, holidays, unavailable periods, per-service durations. Overlap check `a.start < b.end && b.start < a.end`, so 14:00-15:00 blocks anything crossing it, but 15:00 back-to-back is allowed. Cancelled appointments free their slot. Availability is re-validated on every save.
- **Reset Demo Data** button re-seeds realistic dates relative to today.

## Run / deploy
Open `index.html`, or push to GitHub and enable **Settings -> Pages**.

## Notes
Demo only: no real emails or payments; data stays in the visitor's browser. Clearing site data or clicking Reset restores the sample data.
