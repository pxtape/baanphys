# Explorer Studio — shared interface system

The B2 reference remains the design direction: ivory surfaces, petrol teal controls, amber highlights, observatory navigation and a serif English lesson title. The eight physics identities from stage 3 remain intact.

## Shared foundations

- Self-hosted variable **Noto Sans Thai**, downloaded from the official [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/notosansthai). `next/font/local` preloads the local asset with swap fallback; no font request goes to Google at runtime. The SIL Open Font License ships in the repository and public artifact.
- Body 15px, normal text 14px, secondary text 12px; 11px reserved for compact labels. Thai line heights are 1.65–1.8. Serif English lesson titles retain the B2 character.
- Shared ink, muted text, paper, border, surface, accent, success, warning and error tokens. Visible focus rings, native disabled states, consistent input corners and primary/secondary control treatments.
- Inputs are 40px normally, 38px in dense admin workspaces, and at least 44px with 16px text on phones. Question buttons are at least 44px on phones. Reduced-motion settings are respected.

## Student experience

The reader has one persistent viewer on the left and a work list on the right. Category buttons filter all/video/sheet/HW without unmounting the active video. PDF and solution previews share the viewer, while document download links remain available. The video sandbox, click shield, watermark, fullscreen control and authenticated media paths are preserved.

On narrow screens the viewer and work list stack with normal page scrolling. Duplicate course/pathway headings are removed visually while reading. Account navigation, profile details, progress, calendar controls, login and the homepage use the same font and palette. Profile details use three compact columns on desktop.

## Admin experience

The compact navigation highlights the active student/content/calendar page. Forms use denser controls; the content editor retains its independent scroll region and visible save footer, including all solution-link fields. Profile, course and content feedback distinguishes confirmed saves, incomplete data and errors with explicit text and semantic color. Student selection has a visible and accessible selected state.

No authorization, enrollment, billing, question-count or calendar database behavior changes. Browser checks use read-only page navigation and file opening; no student progress or account records are modified for visual review.

## Validation

The classroom regression suite includes a new test proving that filtering and completing preview homework does not close the active video. The admin rejection assertion targets the actual returned message instead of assuming there can be only one live status on the page. TypeScript, production export and artifact verification cover the shared stylesheet, local Thai font and license as well as existing local links and secret checks.

