# Hamel Bros. Landscaping

Official website and Hamel OS field operations dashboard.

## Routes
- `/` — public website
- `/services.html` — services
- `/about.html` — company and team
- `/gallery.html` — gallery
- `/contact.html` — contact requests saved to Supabase
- `/adminos.html` — Hamel OS entry point
- `/hamel-os.html` — field operations dashboard

## Backend
Supabase project: Hamel Bross Landscaping.

The current Hamel OS snapshot is persisted in Supabase `app_state`, and contact requests are stored in `contact_requests`.

## Notes
This is intentionally a lightweight static deployment: public pages use HTML/CSS/vanilla JS, while Hamel OS uses React UMD/Babel in the browser.
