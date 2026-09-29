# Google Forms Automation

Playwright + TypeScript test suite that creates a Google Form and validates that a submission to it is recorded correctly.

## Problem Statement

**Google Forms automation** (precondition: a Google account)

1. Create a Google Form with questions.
2. Submit the form and validate the submission.

## Prompts

This project was built conversationally with Claude Code. The prompts below are refined, compact rewrites of the instructions given during the build — condensed from the full session down to the six that shaped the solution — each followed by a one-line outcome.

---

### 1. Solution planning

> Write two tests for Google Forms: one that creates a form for a trip with two questions (Name and Preference), and one that validates a submission against it. Since automating a real Google login is a known blocker, design this as an API-first solution and confirm whether a dummy Google account is viable for it. Before writing any code, walk me through the plan — overall approach, repo structure, and the decisions we need to settle first. We're using TypeScript, and we'll build this incrementally.

**Outcome:** Evaluated the Google Forms API's actual capabilities and scoped an initial architecture around a service account authenticating to `forms.googleapis.com`, with the repo split into an API client layer, form fixtures, and tests.

### 2. Pivoting the authentication strategy

> The service-account approach won't reliably create forms through the Forms API. Let's pivot to a Playwright `storageState`-based session instead — I'll complete one manual login against the dummy account myself, the session should persist to disk, and I should never need to log in again on later runs.

**Outcome:** Rebuilt the suite around a one-time interactive login (using real installed Chrome with automation flags stripped, since Google blocks sign-in from automation-flagged browsers) that saves a reusable session. Rewrote both tests to drive the actual Google Forms editor and public-form UI — since the Forms API has no endpoint to submit a response at all — through dedicated page objects, hardened over several iterations against Forms UI quirks until repeated and parallel runs were consistently green.

### 3. Root-cause triage, no fixes

> The tests are passing — forms are visibly created and submitted — but the HTML report shows every test as skipped. Investigate whether this is a reporting problem or a test-script problem and report the root cause. Don't make any changes yet; I want to understand the issue before we touch anything.

**Outcome:** Traced it to a `--reporter=list` flag used during debugging, which silently replaces the configured reporters on the CLI and had stopped the HTML report from ever regenerating — a reporting issue, not a test defect.

### 4. Reporting requirements

> Phase one is working end-to-end. Now I want the report to carry screenshots and video recordings for every critical flow, covering passed, failed, and skipped outcomes, so it's intuitive to navigate and reviewable on its own. Propose a plan using Playwright's built-in capabilities before implementing anything. Once I confirm: capture applies to all tests, not just critical ones, and the report artifacts must be committed to the repo — not gitignored — since this needs to be reviewed.

**Outcome:** Enabled `screenshot: 'on'`, `video: 'on'`, `trace: 'on'` suite-wide; restructured both tests into named `test.step()` blocks with checkpoint screenshots at key moments (published, submitted, confirmed); removed `test-results/` and `playwright-report/` from `.gitignore`.


### 5. Final delivery

> Push this repository to GitHub. Before that, add a README documenting the problem statement and presenting my prompts from this build in a refined, professional, compact form — not a verbatim dump — so a reviewer can see how this was engineered. Make sure credentials are properly excluded from the repo, and make sure the report's screenshots and videos are committed, not gitignored.

**Outcome:** Audited the repo for anything credential-shaped (only the gitignored session file qualified), merged onto the existing remote history without a destructive force-push, and pushed the full suite with its report artifacts and this README.

### 6. Post-delivery review

> Everything is pushed now — do a final pass over the whole repo as if reviewing someone else's pull request. Look for anything that shouldn't be there: dead code, inconsistencies between the README and the actual code, anything left over that isn't actually needed. Fix whatever you find.

**Outcome:** Found one unused helper method (`ResponderPage.question()`, never called by either test) and removed it; confirmed everything else — the config, page objects, fixtures, and this README — still accurately matches the repo as shipped.

---

## Architecture

**Google Forms has no API for submitting a response.** The Forms API can create/edit forms and read responses, but there's no endpoint to answer one — so both flows are driven through the real Google Forms UI with Playwright rather than the REST API.

**Page Object Model.** All UI interaction is isolated behind two page objects — `FormEditorPage` (building/publishing a form) and `ResponderPage` (filling in and submitting the public form). Tests call intention-revealing methods like `addMultipleChoiceQuestion()` or `chooseOption()`, never a raw locator against Google's markup directly. This wasn't just for tidiness: Google Forms' editor is built from non-standard custom elements (rich-text `div`s instead of `<input>`, custom "listbox" dropdowns, menus that render before they're clickable), which needed several rounds of hardening — retry-until-confirmed typing, scoping locators to the correct question card, tolerating a locale-dependent menu label. Keeping that logic in one place meant every fix only had to be made once, and both tests benefited immediately.

**Fixtures instead of manual setup/teardown.** `src/fixtures/tripForm.ts` extends Playwright's `test` with two fixtures: `editor` wraps the page in a `FormEditorPage` and guarantees it's moved to the bin afterwards regardless of pass/fail, and `publishedTripForm` builds and publishes a form before the test body runs, for the submission test that needs one already in place. Fixtures give dependency-based, automatic cleanup — the teardown runs exactly once per test no matter how it ends, and a test that doesn't need a published form simply doesn't request that fixture rather than every test paying for setup it doesn't use.

**Login as a Playwright project dependency, not an inline step.** Google blocks sign-in from Playwright's bundled Chromium and from any browser that advertises automation, so login can't happen inside a normal test. `tests/auth.setup.ts` is its own Playwright *project* (`setup`) that the `google-forms` project declares as a `dependencies` entry in `playwright.config.ts` — Playwright always runs it first and guarantees a valid `storageState` session exists before any real test starts. The script is idempotent: it checks headlessly whether the saved session still works, and only falls back to an interactive login if it doesn't.

**Capture settings live in config, not per test.** Screenshot, video and trace are all set to `'on'` globally in `playwright.config.ts`, so every test carries full evidence regardless of outcome without anyone needing to opt in per test. The one thing done per-test deliberately is the named checkpoint screenshots (`src/utils/reportSteps.ts`) — they capture a specific moment in a flow (form published, response confirmed) that the automatic end-of-test screenshot alone wouldn't show.

**Reporter is a list, not a single string.** `reporter: [['list'], ['html', { open: 'never' }]]`, not a bare `'html'` string — because a `--reporter` flag on the CLI *replaces* whatever's configured instead of adding to it, and debugging habitually used `--reporter=list` for cleaner terminal output, which had silently stopped the HTML report from ever regenerating (see prompt 3 above). Keeping both in the array means a fresh HTML report is written on every run no matter how it's invoked.

## Running it

```bash
npm install
npm run auth   # one-time interactive Google login (skipped automatically once a valid session exists)
npm test       # runs the suite, writes a fresh report every time
npx playwright show-report   # view the report locally
```

## Project structure

```
tests/
  auth.setup.ts        # one-time login, saves the session
  create-form.spec.ts  # builds and publishes a form, verifies its structure
  submit-form.spec.ts  # submits an answer, verifies it's recorded
src/
  pages/                # FormEditorPage, ResponderPage - UI interaction layer
  fixtures/tripForm.ts   # shared form schema + fixtures
  utils/reportSteps.ts   # named checkpoint screenshots for the report
playwright.config.ts     # real-Chrome launch config, reporters, capture settings
```

## Notes

- `playwright/.auth/` (the saved login session) is intentionally gitignored — it's a live credential, not project code.
- `test-results/` and `playwright-report/` are intentionally **not** gitignored, so the screenshots, videos and traces are reviewable directly from the repo.
