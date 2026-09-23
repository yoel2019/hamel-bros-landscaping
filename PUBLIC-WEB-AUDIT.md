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

## 2. Public site structure to maintain

The public website consists of five primary pages:

- `index.html` — Home
- `about.html` — About
- `services.html` — Services
- `gallery.html` — Gallery
- `contact.html` — Contact

Public dependencies:

- `css/styles.css` — **the single authoritative public stylesheet**
- `js/main.js` — public interaction layer
- `assets/logo/hamelBros.LandscapingLogo.png` — public brand logo
- Font Awesome CDN — public icon dependency
- Google Fonts imported by `styles.css` — DM Sans and DM Serif Display
- Unsplash — representative imagery currently used by Home/Gallery
- Supabase public API layer — contact-form submission

### Stylesheet rule

There must be **one authoritative CSS file for the public website: `css/styles.css`**.

`public-hotfix.css` has been retired. Do not recreate it or introduce another patch stylesheet to compensate for a problem that belongs in `styles.css`.

Required public CSS behavior must be integrated directly into `styles.css`, including global reset/base behavior, typography, layout primitives, header, utility bar, navigation, mobile menu/dropdown, buttons, cards, hero sections, services, gallery, contact form, footer, responsive breakpoints, accessibility states and reduced-motion support.

## 3. Visual identity — KEEP

The following visual direction is approved and must remain unless explicitly changed:

- black / deep green / lime palette
- professional landscaping-company presentation
- modern, clean and restrained visual language
- strong but controlled typography
- dark cards and panels
- lime accent for important actions and active states
- transparent Hamel Bros. logo integrated into the dark header/footer
- rounded cards and buttons consistent with the existing design language
- subtle borders, shadows and gradients used for depth
- no unnecessary visual clutter

Do not replace this identity with a different redesign while solving technical issues.

## 4. Content and company-information rules — KEEP

### Company identity

Maintain the public company presentation as:

**Hamel Bros. Landscaping Inc.**

Family-owned and operated since **2001**.

### Contact information

Keep:

- P.O. Box 2069
- Natick, MA 01760
- Phone: 508-647-0003

The phone number must remain actionable through `tel:5086470003`.

### Service area

Keep the primary Metro West service-area presentation:

- Natick
- Wellesley
- Weston
- Wayland
- Framingham

Lawn care must be presented as part of the company's available maintenance services without an unsupported city-specific restriction.

### Company story

Keep the family-business positioning and the established-2001 story.

The About page keeps the existing family/team presentation for:

- Paul Hamel
- Dave Hamel
- Steve Hamel
- Jimmy Hamel

Do not invent new company claims, services, locations or biographies without approval.

## 5. Shared header/navigation contract — KEEP

The header is shared across all five public pages.

### Desktop

- Utility bar remains anchored at the top.
- Main navigation remains anchored directly below it.
- Header remains visible while scrolling.
- Navigation links remain visible in desktop mode.
- Phone CTA remains available in desktop mode.
- Free Estimate CTA remains available in desktop mode.

### Responsive/mobile

- Hamburger appears at the agreed `960px` breakpoint.
- Hamburger remains part of `.navbar__inner`.
- Preserve `.menu-toggle--floating-widget` compatibility class in JavaScript unless explicitly instructed otherwise.
- `.navbar__inner` is the positioned containing block for the dropdown.
- Dropdown uses `position:absolute` and `top:100%` relative to the navigation container.
- Do not position the menu using viewport coordinates or JavaScript-calculated coordinates.
- Dropdown remains visually attached to the header.
- Menu remains above page content.
- No horizontal overflow is introduced.
- Clicking a menu link closes the menu.
- Clicking outside closes the menu.
- Escape closes the menu and returns focus to the toggle.
- `aria-expanded`, `aria-controls` and `aria-label` remain synchronized.

### Active page

Every public page must have:

- semantic `aria-current="page"`
- visible `.is-active` state

The active state must also remain visible inside the mobile menu.

## 6. Responsive contract — KEEP

Responsive behavior is treated as one system, not isolated breakpoint fixes.

Current principal breakpoints:

- `960px` — navigation changes to hamburger mode
- `780px` — compact/mobile page layout
- `500px` — narrow-phone refinements

The JavaScript and CSS navigation breakpoint must remain synchronized.

Responsive checks must cover large desktop, tablet/transition, mobile and narrow mobile states, including no clipped controls and no horizontal overflow.

## 7. Page-by-page functionality — KEEP

### Home

Keep:

- hero section
- free-estimate CTA
- services CTA
- service cards
- service-area presentation
- reviews section
- final estimate CTA
- shared header/footer

Home service cards must continue to point to:

- `services.html#maintenance`
- `services.html#planting`
- `services.html#commercial`
- `services.html#other`

### About

Keep:

- company story
- 2001 family-business presentation
- Paul, Dave, Steve and Jimmy sections
- reviews
- contact CTA
- shared navigation/footer

### Services

Keep four service groups:

1. **Maintenance** — `#maintenance`
2. **Planting & design** — `#planting`
3. **Commercial & snow** — `#commercial`
4. **Other landscape work** — `#other`

Keep the existing service details. Do not impose an unsupported geographic restriction on lawn care.

### Gallery

Keep the current gallery as a functional page, but **do not turn navigation or unrelated fixes into a gallery redesign**.

Current images are representative Unsplash references, not claims of company project photography.

The explanatory note must remain clear about this distinction until authentic company photography is approved and added.

Keep gallery lightbox functionality intact.

### Contact

Keep:

- mailing address
- phone
- service area
- estimate request form

Required form fields:

- first name
- last name
- email
- property city
- project message

Phone remains optional.

Service selection remains optional.

Hidden source value remains `Website`.

The form must:

- use native required-field validation first
- prevent duplicate/concurrent submission
- disable submission while sending
- show a sending state
- show a visible/live success state
- show an actionable failure fallback with the office phone
- never expose private service-role credentials

## 8. Public JavaScript contract — KEEP

`js/main.js` is the **single authoritative public interaction layer**. Public HTML must not recreate its behaviors with inline JavaScript, duplicated event handlers or page-specific copies of shared logic.

The public interaction layer owns only these responsibilities:

- responsive navigation
- active-page synchronization
- service-card interaction/details
- reveal-on-scroll behavior
- footer accordion
- gallery lightbox
- contact-form submission

### JavaScript single-source rules

- Do not create `seasonal-index.js`, page-specific menu scripts, navigation hotfix scripts or duplicate interaction files.
- Do not duplicate shared event handlers in individual HTML pages.
- Do not use JavaScript to calculate CSS layout coordinates for the header/menu.
- Do not inject inline `style` attributes as a substitute for `styles.css`.
- State changes should use semantic/state classes such as `.is-open` and `.is-visible`; layout and visual rules belong in `styles.css`.
- Use existing shared classes before creating a new class.
- New JS-created classes must have a corresponding intentional CSS contract before deployment.
- Initialization must be idempotent so loading the public script twice cannot duplicate listeners or UI.
- Component-level initialization guards should prevent repeated setup when a component already exists.
- Public JS must not target Hamel OS/admin selectors or internal application state.
- Hardcoded business data in JS must remain limited to data required by the public interaction itself and must agree with the public content contract.

### Navigation

Keep state-based menu behavior using `.is-open`.

Keep:

- open/close behavior
- outside-click close
- Escape close
- focus return
- ARIA synchronization
- active-page detection
- `.menu-toggle--floating-widget` compatibility class

The breakpoint constant in `main.js` must remain synchronized with the navigation breakpoint in `styles.css`.

### Service cards

Home service cards may be enhanced by JavaScript, but their destination must remain functional and lead to the correct service section.

Only the intended `.service-grid .service-card[href]` elements may be converted into interactive detail cards. Team cards or unrelated cards must not be captured by the service-card enhancement.

Generated detail controls must use real buttons/links and valid ARIA relationships; do not turn an element containing interactive descendants into a competing nested button/link pattern.

### Reveal

Reveal-on-scroll is progressive enhancement only. If IntersectionObserver is unavailable or reduced motion is requested, content must remain visible rather than becoming inaccessible.

### Footer

The mobile footer accordion remains part of the public interaction layer. Desktop state must remain fully expanded.

### Gallery

Existing lightbox behavior must not be broken accidentally. It must preserve keyboard access, Escape close, focus return, previous/next controls and touch navigation.

### Contact form

Existing Supabase submission behavior is considered a real public function, not decorative UI.

The public key is publishable/client-side by design; private service-role credentials must never be placed in `main.js` or public HTML.

## 9. Accessibility contract — KEEP

Maintain:

- skip link to `#main`
- semantic navigation landmark
- `aria-current="page"`
- keyboard-accessible menu
- Escape handling
- focus return to menu toggle
- synchronized ARIA menu state
- visible form focus states
- meaningful image alt text
- reduced-motion support
- live contact-form status

Accessibility attributes must not be removed during cleanup.

Interactive components created by JavaScript must remain keyboard reachable and must expose valid accessible names and state relationships.

## 10. Images and branding — KEEP

Primary local logo:

`assets/logo/hamelBros.LandscapingLogo.png`

Rules:

- use the local logo as the authoritative brand asset
- keep the logo transparent and visually integrated with the dark design
- do not add a white/gray box behind it
- remote images must have meaningful alt text
- use graceful image fallback where practical
- do not present stock/representative imagery as company work

## 11. Footer — KEEP

Keep the shared footer on all five pages with:

- Hamel Bros. branding
- company description
- Explore links
- service area
- contact information
- copyright
- free-estimate/residential-commercial messaging

On mobile, the existing footer sections may collapse into the approved accordion behavior.

## 12. Typography and UI behavior — KEEP

Keep the current typography system:

- DM Sans for general interface/body text
- DM Serif Display for major display headings
- lime accent for emphasis and important states

Keep:

- pill/chip treatments
- rounded CTA buttons
- card-based service presentation
- restrained hover movement
- subtle transitions
- reduced-motion fallback

Do not introduce unnecessary animation, autoplay effects or seasonal effects.

## 13. Explicitly rejected / DO NOT REINTRODUCE

The following are not part of the public website direction:

- Hamel OS functionality inside the public website
- OS/admin UI mixed into the public site
- seasonal weather UI
- seasonal preview controls
- duplicate CSS patch layers
- `brand-fixes.css`
- `site-refresh.css`
- `seasonal-index.css`
- `seasonal-index.js`
- page-specific copies of shared public navigation logic
- inline JavaScript for public shared behavior
- arbitrary viewport-coordinate menu positioning
- JavaScript-calculated layout coordinates for the header menu
- redesigning Gallery as part of unrelated bug fixes
- hidden symbolism in the visual identity
- unnecessary redesigns that replace the approved visual direction
- unsupported geographic restrictions on public services

## 14. Public deployment boundary — KEEP STRICT

The public site must expose only what is necessary for the public website.

Internal material such as the following must remain outside the public-site experience:

- Hamel OS UI/code
- admin interfaces
- YALH core/domain implementation
- internal architecture files
- internal backups
- development-only resources

`inspirationresources/` must not be treated as a public dependency unless an asset is intentionally approved for the public site.

A repository file existing in GitHub does not automatically make it part of the public website's intended surface.

## 15. Change-management rules — KEEP

For every public change:

### Audit first

Inspect the affected:

- HTML
- `styles.css`
- `main.js`
- public assets
- deployment state
- project guardrails

When auditing JavaScript specifically, inspect for:

- duplicated initialization/listeners
- inline style injection
- layout calculations that belong to CSS
- selectors broader than the intended component
- missing initialization guards
- invalid/nested interactive semantics
- missing keyboard/ARIA behavior
- hardcoded values that conflict with the content contract
- public JS references to OS/admin code

### Root cause first

Do not solve a structural problem with another patch file.

### Single-source principle

If a required public CSS rule exists elsewhere, integrate it into `styles.css` and remove the redundant stylesheet after verification.

If a shared interaction exists elsewhere, consolidate it into `js/main.js` and remove the duplicate after verification.

### Smallest safe correction

Prefer:

- existing shared classes
- existing containers
- semantic HTML
- state classes
- centralized CSS
- centralized public interaction logic

Avoid:

- duplicate stylesheets
- duplicate JavaScript listeners
- repeated `!important`
- arbitrary coordinates
- unrelated redesigns
- seasonal functionality

### No regression rule

**Do not fix one thing by breaking another.**

Every change must preserve previously approved public behavior unless the project owner explicitly changes that requirement.

### Content-source rule

Do not add or restore geographic restrictions, service limitations or other business rules unless they are supported by an authoritative company source or explicitly approved by the project owner.

## 16. Verification protocol — KEEP

Before declaring a public change complete:

1. verify source changes;
2. audit public HTML for duplicate/inline JavaScript and `style` attributes;
3. audit `main.js` for duplicate initialization, listeners, CSS/layout responsibilities and accessibility regressions;
4. verify all five public pages retain required dependencies;
5. verify navigation structure is consistent;
6. verify active-page state;
7. verify CSS/JS breakpoint agreement;
8. verify no internal OS dependency was introduced;
9. deploy;
10. confirm Vercel deployment is `READY`;
11. verify the production public alias;
12. fetch/check each public page and critical assets where possible;
13. inspect runtime errors after deployment.

A Git commit alone is not proof that production is healthy.

Pixel-perfect visual claims must not be made without an actual visual/browser inspection capability.

## 17. Definition of operational

The public website is operational only when:

- all five pages load
- shared navigation works
- desktop/tablet/mobile states remain coherent
- fixed header remains anchored
- mobile dropdown remains attached to the header
- active page is visibly identifiable
- service navigation works
- gallery lightbox works
- contact form validates and submits or gives a clear fallback
- no unintended horizontal overflow is introduced
- no rejected seasonal UI is present
- the public stylesheet is centralized in `css/styles.css`
- public shared interaction logic is centralized in `js/main.js`
- production deployment is `READY`

## 18. Current audit note — September 23, 2026

The responsive navigation breakpoint was intentionally aligned to **960px** on September 22, 2026. The current public implementation uses `960px` in both `js/main.js` (`MOBILE_NAV_BREAKPOINT`) and `css/styles.css` (`@media (max-width:960px)`). This is the current approved navigation breakpoint and must not be reverted to 1050px solely because of the older audit wording or historical implementation.

The September 22 change was part of a responsive-header cleanup that also addressed duplicate phone/location presentation and simplified header spacing. Future audits must compare the current implementation against the latest agreed behavior and recent commit history before classifying a breakpoint change as a regression.

The public-web audit must treat **CSS/JS synchronization at 960px** as the current contract.

## 19. Current audit note — September 15, 2026

A JavaScript hardening pass was applied to the public interaction layer.

Verified source-level improvements:

- public initialization is idempotent;
- menu initialization is guarded against duplicate setup;
- contact-form initialization and submission are guarded against duplicate/concurrent submission;
- service-card enhancement is scoped to the service grid only;
- service detail controls use explicit `aria-controls` relationships;
- service cards are keyboard reachable without creating nested interactive controls;
- no public JS layout coordinates are used for the header menu;
- public interaction state is represented through CSS classes/ARIA rather than injected visual styles;
- OS/admin JavaScript was not modified as part of this public-web pass.

The repository also contains internal OS files that may contain inline styles/scripts; those are **not** public-web defects and must not be modified under this audit contract.

## 20. Current working principle

> **Public website first. Audit before modifying. Fix the root cause. Keep one authoritative stylesheet and one authoritative public interaction layer. Preserve approved functionality. Never fix one thing by breaking another. Verify in production.**

This document is the persistent working contract for future public-web work. When a new regression is discovered, document the resulting rule here so the same mistake is not repeated.
