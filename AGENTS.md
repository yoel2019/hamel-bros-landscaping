# Hamel Bros. Landscaping — Agent Guardrails

## Navigation/menu lessons

1. **Never remove a previously agreed CSS class/property to solve a layout problem.** In particular, preserve `menu-toggle--floating-widget` unless the project owner explicitly asks to remove it.
2. **Keep the mobile menu anchored to the navigation container.** The menu must use the same positioned containing block as the header controls; do not mix a `position:fixed` menu with an in-header toggle when the intended behavior is an anchored dropdown.
3. **Do not use coordinates derived from the toggle as a substitute for a proper containing block.** Prefer a positioned `.navbar__inner` and `top: 100%` so the menu follows the header naturally through responsive changes.
4. **The active page must always be identifiable.** Navigation links should receive both semantic `aria-current="page"` and a visible `.is-active` state. The active indicator must remain visible on mobile, not only desktop.
5. **Do not solve one responsive breakpoint by breaking another.** After menu changes, verify desktop, tablet and mobile behavior and preserve the agreed layout properties.
6. **Do not modify deferred scope without explicit approval.** The Gallery is currently deferred; navigation fixes must not turn into gallery work.
7. **Preserve the Hamel Bros. visual identity.** Do not introduce the rejected redesign direction or change the established black/deep-green/lime palette unless explicitly requested.

## Working rule

Before changing shared navigation CSS/JS, inspect the current implementation and the last agreed behavior. Make the smallest structural correction that fixes the root cause, then verify the resulting behavior before making another change.


## Current responsive navigation contract — September 23, 2026

The approved public navigation breakpoint is **960px**.

- `js/main.js` uses `MOBILE_NAV_BREAKPOINT = 960`.
- `css/styles.css` uses `@media (max-width:960px)` for the mobile navigation state.
- CSS and JavaScript must remain synchronized at 960px.
- Do not revert the breakpoint to 1050px based only on older documentation or historical commits.
- When auditing breakpoint behavior, inspect the latest public commits and the current agreed behavior before reporting a change as a regression.
- The 960px decision was part of the September 22, 2026 responsive-header cleanup.
