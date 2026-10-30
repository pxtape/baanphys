# B2 · Explorer Studio

Implemented on the existing GitHub Pages classroom, preserving course access, manual level unlocks, task completion, question checklists, PDF downloads and video restrictions. Classroom and lesson presentation use warm ivory, deep teal and amber, observatory navigation artwork, a laboratory banner, chapter compass badges and topic illustrations. Statistics and upcoming events continue to come from existing records; design-board numbers and appointments are not seeded into the database.

Desktop: compact course tabs, prominent continue action, 5 lesson cards per row at 1280px+, persistent progress sidebar. Mobile: 2 lesson cards per row, visible progress and weekly activity, bottom navigation; only data-entry controls collapse.

Validation: existing 82 classroom/access/progress tests; TypeScript; production static export and local link verification; desktop and mobile browser review. Test cleanup applies to the standalone profile-navigation test as well as the grouped tests and drains React's immediate queue before the DOM is torn down.

## Generated artwork

Created with the built-in image_gen tool; source PNGs retained in `deliverables/explorer-studio-assets/`. Web JPEGs total approximately 187 kB:

- `public/studio/explorer-observatory.jpg`
- `public/studio/explorer-lab.jpg`

Prompts:

Observatory: Use case: stylized-concept. Asset type: tall narrow background artwork for the left navigation rail of a premium physics learning website, Baanphys Explorer Studio. Create a single portrait illustration, 1:3 aspect ratio. A small classical domed astronomical observatory nestled among dark trees in the bottom third, warm golden light in its windows, distant forest hills at sunset, scattered tiny stars above. Top half mostly deep midnight petrol teal negative space for navigation text; warm amber clouds and subtle stardust in the middle and bottom. Painterly cinematic realism, restrained sophisticated rich texture, warm cream-gold highlights, very dark navy teal shadows. No text, no lettering, no logo, no UI, no borders. Entire image edge to edge.

Laboratory: Use case: photorealistic-natural. Asset type: panoramic hero background for Explorer Studio physics classroom website. Create a cinematic photograph style warm physics laboratory, wide 3:1 framing. A single unmarked small wooden cube sits on a wooden workbench in the RIGHT third, full cube visible with clear top and right faces, warm amber side light, dark blurred vintage laboratory and shelves in the background. Left half very dark petrol teal shadow, empty negative space for white website lesson title. Table occupies lower quarter. Subtle depth of field, tactile wood grain, sophisticated authentic scientific mood. No arrows, no letters, no text, no equations, no people, no UI. The cube is the only sharp object, placed 75 percent from the left and 65 percent from the top.

