# Hamel Bros. Landscaping — Public Web Audit & Working Logic

> **Scope:** Public website only. Hamel OS, admin, YALH core and internal architecture are out of scope unless a public deployment dependency is discovered.
>
> **Purpose:** This file is the persistent working contract for auditing, fixing and maintaining the public web without reintroducing regressions.

## 1. Public website is the priority

The target is the **public website**, not Hamel OS.

Any change must answer:

1. Does it affect the public site?
2. Does it preserve existing public functionality?
3. Does it improve the root cause rather than add another patch?
4. Can the result be verified in source and production?

Do not modify internal OS files while solving public-site problems.

## 2. Current public surface

The public site currently consists of these primary pages:

- `index.html` — Home
- `about.html` — About
- `services.html` — Services
- `gallery.html` — Gallery
- `contact.html` — Contact
- `css/styles.css` — primary public stylesheet
- `css/public-hotfix.css` — legacy/base safety hotfix currently still loaded by all five pages
- `js/main.js` — public interaction layer
- `assets/logo/hamelBros.LandscapingLogo.png` — public logo

The repository also contains internal Hamel OS/YALH material and `inspirationresources/`. Those are not referenced by the five public HTML pages and must not become part of the public experience accidentally.

## 3. Visual identity — agreed direction

Preserve the established Hamel Bros. identity:

- black / deep green / lime palette
- professional landscaping-company presentation
- clean, modern and restrained visual language
- no rejected redesign direction
- no seasonal effects or seasonal preview controls
- no hidden symbolism added to the brand presentation
- logo must remain transparent and visually integrated with the dark header/footer

Do not change the visual identity merely to solve a technical issue.

## 4. Shared header/navigation contract

The header is shared by all five public pages.

### Desktop

- Utility bar stays anchored at the top.
- Main navigation stays anchored below the utility bar.
- Header must remain visible while scrolling.
- Desktop navigation links remain visible when the viewport is in desktop mode.
- Phone CTA and estimate CTA remain available in desktop mode.

### Responsive / mobile

- Hamburger appears at the agreed responsive breakpoint.
- Hamburger remains part of `.navbar__inner`; it is **not** a detached/floating viewport widget.
- Preserve the agreed `menu-toggle--floating-widget` class unless explicitly instructed otherwise.
- `.navbar__inner` is the positioned containing block for the dropdown.
- Mobile dropdown uses `position:absolute` with `top:100%` relative to the navigation container.
- Do not use a fixed dropdown positioned from viewport coordinates.
- Dropdown must remain attached to the header through responsive changes.
- Menu must be above page content and usable without horizontal overflow.
- Clicking a menu link closes the menu.
- Clicking outside closes the menu.
- Escape closes the menu and returns focus to the toggle.
- `aria-expanded`, `aria-controls` and `aria-label` must remain synchronized.

### Active page

Every page must identify the current page in two ways:

- semantic `aria-current="page"`
- visible `.is-active` state

The active state must remain visible in the mobile menu, not only desktop.

These rules are also explicitly recorded in `AGENTS.md`. Do not weaken them while fixing another breakpoint. fileciteturn270file0

## 5. Responsive contract

Responsive behavior must be evaluated as a system, not one breakpoint at a time.

Required states:

- large desktop
- desktop / tablet transition
- tablet
- mobile
- narrow mobile

Current stylesheet uses these principal breakpoints:

- `1050px` — navigation switches to hamburger mode
- `780px` — compact/mobile layout
- `500px` — narrow-phone refinements

Any breakpoint change must be coordinated between CSS and JS. In particular, the JS menu resize logic must use the same breakpoint as CSS.

Responsive checks must include:

- no horizontal page overflow
- fixed header does not cover content unexpectedly
- anchor jumps account for header height
- logo remains contained
- hamburger remains reachable
- dropdown remains anchored to header
- buttons do not overflow their containers
- service grids collapse cleanly
- contact form becomes single-column on mobile
- gallery grid collapses cleanly
- footer accordion works on mobile and remains normal on desktop

## 6. Stylesheet architecture

The intended end state is **one authoritative public stylesheet**.

Current finding:

- `css/styles.css` contains the main design system and responsive rules.
- `css/public-hotfix.css` is still loaded by all public pages and contains important base rules such as reset, image behavior, links, form inheritance, container sizing, skip-link and basic navigation rules. fileciteturn271file0

Therefore:

> **Do not delete `public-hotfix.css` until its required rules have been audited, merged into `styles.css`, and verified across all five pages.**

Do not create another `brand-fixes.css`, `site-refresh.css`, seasonal stylesheet, or other duplicate patch layer to solve the same problem.

The cleanup principle is:

1. identify root cause;
2. move required rule into the authoritative stylesheet;
3. remove redundant rule/file;
4. verify all public pages;
5. deploy only after verification.

## 7. Public JavaScript contract

`js/main.js` currently provides the public interaction layer:

- responsive navigation
- active-page synchronization
- service-card interaction/details
- reveal-on-scroll behavior
- footer accordion
- gallery lightbox
- contact form submission

Seasonal weather/preview functionality was rejected and must not be reintroduced.

### Navigation JS

The current production JS correctly restores:

```js
toggle.classList.add('menu-toggle--floating-widget');
```

This must remain unless explicitly removed by the project owner.

The menu logic must remain state-based (`is-open`) rather than coordinate-based.

### Service cards

Home service cards may be enhanced into interactive view cards, but the underlying destination must remain usable. The `View service` action must continue to navigate to the corresponding service section.

### Gallery

Gallery behavior is currently deferred as a redesign scope. Do not turn a navigation fix into gallery redesign work. Existing lightbox behavior must not be broken accidentally.

### Contact form

The contact form is a real public function, not decorative UI. It submits to Supabase `contact_submissions` through the public JS layer.

Required behavior:

- native required-field validation first
- disable submit while sending
- show sending state
- show success state when accepted
- show actionable fallback on failure with the office phone
- never expose private service-role credentials in the public site

## 8. Public HTML contract

All five public pages must maintain:

- viewport meta
- page title
- description
- shared header
- shared navigation
- shared footer
- correct active navigation state
- `#main` landmark and skip link
- `js/main.js`
- correct public stylesheet dependencies

The navigation structure should remain consistent across pages. The current five pages all use the same shared structure. fileciteturn272file0 fileciteturn273file0 fileciteturn274file0 fileciteturn275file0 fileciteturn276file0

## 9. Images and assets

The public logo is local:

`assets/logo/hamelBros.LandscapingLogo.png`

Home and Gallery currently use remote Unsplash imagery. Gallery explicitly labels these as representative references rather than company project photography. fileciteturn275file0

Rules:

- local brand assets take priority over remote substitutes
- remote images must have meaningful alt text
- image failures should have a graceful fallback where practical
- do not imply representative imagery is company work
- replace representative gallery images with authentic company photography only when approved

## 10. Accessibility contract

Maintain:

- skip link
- semantic navigation landmark
- semantic current-page state
- keyboard operation for menu
- Escape handling
- focus return after closing menu
- visible focus states for form controls
- meaningful image alt text
- reduced-motion support
- live status for contact-form feedback

Do not remove accessibility attributes while simplifying markup.

## 11. Link/function audit matrix

### Home

- logo → Home
- primary nav → all five pages
- hero estimate CTA → Contact
- services CTA → Services
- service cards → corresponding service anchors
- estimate card → Contact
- final CTA → Contact

### About

- logo/nav/footer → all five pages
- final CTA → Contact

### Services

- service anchors `#maintenance`, `#planting`, `#commercial`, `#other`
- estimate CTAs → Contact

### Gallery

- gallery cards → lightbox interaction
- lightbox → close / previous / next / keyboard / touch behavior
- note clearly identifies representative imagery

### Contact

- phone link → `tel:5086470003`
- form → Supabase `contact_submissions`
- validation → required fields
- success/error feedback → visible and live

## 12. Audit findings at the time this document was created

### Confirmed healthy

- all five public pages respond with HTTP 200 in production
- production deployment reached READY
- public navigation structure is present on all five pages
- active-page markup is present
- responsive navigation JS contains the required floating-widget compatibility class
- seasonal functionality is absent from the current public JS

### Requires cleanup / verification

1. `public-hotfix.css` is still loaded by every public page even though `styles.css` is intended to be authoritative.
2. Required hotfix/base rules need to be merged into `styles.css` before the file is removed.
3. The public asset boundary needs to remain explicit so internal Hamel OS/YALH files do not leak into the public deployment.
4. Responsive behavior must be checked as desktop → tablet → mobile, not by fixing a single breakpoint in isolation.
5. The deployed production version must always be verified after source changes; a GitHub commit alone is not proof of production deployment.

## 13. Safe change protocol

For every public-site change:

### A. Audit first

Inspect:

- affected HTML
- `styles.css`
- `public-hotfix.css` if present
- `main.js`
- related assets
- project guardrails
- current production deployment

### B. Define the root cause

Do not patch symptoms with another stylesheet or arbitrary coordinates.

### C. Make the smallest structural correction

Prefer:

- existing shared classes
- existing containers
- one authoritative stylesheet
- state classes
- semantic HTML

Avoid:

- duplicate CSS files
- repeated `!important`
- fixed viewport coordinates for in-header UI
- JavaScript-generated layout coordinates
- unrelated redesigns
- seasonal effects

### D. Verify source

Confirm:

- all five pages still load the expected dependencies
- navigation remains structurally identical
- responsive rules agree with JS breakpoints
- no removed agreed class/property has disappeared
- no internal OS file was pulled into public scope

### E. Verify production

After deployment:

1. confirm deployment is READY;
2. verify the public alias;
3. fetch each public page;
4. verify critical assets and JS are served;
5. only then call the change complete.

## 14. Definition of “operational”

The public web is considered operational only when:

- all five pages load
- navigation works at desktop/tablet/mobile widths
- header remains anchored as agreed
- mobile dropdown stays attached to the header
- active page is visibly identifiable
- service navigation works
- gallery interaction works without breaking the page
- contact form validates and submits or provides a clear phone fallback
- no unintended horizontal overflow is introduced
- no rejected seasonal UI is present
- production deployment is READY

## 15. Current principle

**Do not fix one thing by breaking another.**

The public website should evolve through controlled, auditable, reversible changes. Every regression becomes a documented rule here so the same mistake is not repeated.
