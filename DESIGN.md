---
name: UP — Unframe Playlist
description: The established paper, blue, lime, and LP-player system for music issued by UNFRAME.
colors:
  up-blue: "#143cff"
  up-lime: "#ccff00"
  up-orange: "#ff5c35"
  up-paper: "#f1efe7"
  up-paper-2: "#e8e5dc"
  up-ink: "#11110f"
  up-muted: "#6e6c65"
  up-line: "rgba(17, 17, 15, 0.16)"
  card-paper: "#fffdf5"
  field-paper: "#fffdf7"
  feedback-blue: "#004aad"
  white: "#ffffff"
typography:
  display:
    fontFamily: 'Inter, Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif'
    fontSize: "clamp(54px, 7vw, 112px)"
    fontWeight: 950
    lineHeight: 0.82
    letterSpacing: "-0.09em"
  headline:
    fontFamily: 'Inter, Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif'
    fontSize: "clamp(42px, 5vw, 78px)"
    fontWeight: 950
    lineHeight: 0.9
    letterSpacing: "-0.07em"
  title:
    fontFamily: 'Inter, Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif'
    fontSize: "clamp(2rem, 4.5vw, 3.7rem)"
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: 'Inter, Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif'
    lineHeight: 1.7
  label:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  field: "6px"
  listening-button: "8px"
  listening-panel: "12px"
  navigation: "16px"
  collection: "22px"
  mini-player: "24px"
  hero: "32px"
  pill: "100px"
  circle: "50%"
spacing:
  action-gap: "10px"
  card-gap: "18px"
  panel: "24px"
  page-desktop: "38px"
  release-gap: "48px"
components:
  listening-primary:
    backgroundColor: "{colors.up-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.listening-button}"
    padding: "10px 14px"
  listening-secondary:
    backgroundColor: "{colors.up-paper}"
    textColor: "{colors.up-ink}"
    rounded: "{rounded.listening-button}"
    padding: "10px 14px"
  listening-secondary-hover:
    backgroundColor: "{colors.up-paper-2}"
  listening-field:
    backgroundColor: "{colors.field-paper}"
    textColor: "{colors.up-ink}"
    rounded: "{rounded.field}"
    padding: "11px"
  navigation-active:
    backgroundColor: "{colors.up-ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.navigation}"
    padding: "8px"
  genre-active:
    backgroundColor: "{colors.up-ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  collection:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.up-ink}"
    rounded: "{rounded.collection}"
    padding: "14px"
  feedback-toast:
    backgroundColor: "{colors.feedback-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.listening-panel}"
    padding: "16px 20px"
---

# Design System: UP — Unframe Playlist

## Overview

**Creative North Star: "A personal listening desk for music issued by UNFRAME only."**

This is a record of the implemented, approved incumbent system, not a replacement visual direction. The confirmed language is bright, unique, premium but witty. Warm paper, a faint square grid, heavy compressed-looking sans-serif headlines, compact mono annotations, saturated color, and small rotations make the identity recognizable. Listening-task pages deliberately use quieter type and thin dividers inside that same shell.

The release-detail, radio, exhibition-journey, and listener-library extension inherits the existing navigation, icons, palette, and persistent LP player. The north-star sentence comes from the first-body extension contract in `index.html`; it is not a newly invented metaphor. Extraction authority is `src/up-system.css`, `AppShell.jsx`, `FullPlayer.jsx`, `ReleaseDetail.jsx`, and `ListenerLibrary.jsx`, checked against supplied desktop library/radio and mobile release screenshots. Tokens above preserve source values; numeric weights are recorded only where explicitly styled.

**Key Characteristics:**

- Paper and ink ground saturated blue, lime, and orange.
- Oversized, tightly tracked exhibition headlines coexist with readable listening-task headings.
- Rounded containers, thin rules, hard offset shadows, and circular controls share one system.
- Navigation and playback remain persistent as the content changes.

## Colors

The palette combines warm neutrals with deliberately bright, high-contrast accents; the frontmatter preserves exact incumbent values.

The sidecar's synthesized tonal ramps are panel-only previews, not additional implemented palette tokens.

### Primary

- **UP Blue** (`up-blue`): brand mark, listening primary actions, selected library tabs, artist names, and blue visual panels.

### Secondary

- **UP Lime** (`up-lime`): exhibition hero, active mobile navigation, player play/progress accents, and hard-offset highlights.

### Tertiary

- **UP Orange** (`up-orange`): mood tile, liked collection, stamps, and selected heart accents.
- **Feedback Blue** (`feedback-blue`): existing feedback toast, global focus treatment, and some legacy player accents. It is distinct from UP Blue; do not silently unify them.

### Neutral

- **UP Paper / UP Paper 2**: shell surface and secondary paper layers.
- **UP Ink / UP Muted**: primary text and quiet metadata/navigation.
- **UP Line**: translucent separators and quiet outlines; preserve its source RGBA value.
- **Card Paper / Field Paper**: the slightly different incumbent collection and form surfaces.
- **White**: reversed text and selected controls.

## Typography

The display and body stack is the existing Inter/Pretendard/system stack recorded above. Labels use system monospace; the code also uses shorter `ui-monospace, monospace` fallbacks. Do not replace these families during an extension.

Display is the home hero; headline is the exhibition section heading. Both use uppercase Latin text, heavy weight, close tracking, and tight leading. The listening-page title is intentionally less compressed, wraps anywhere when necessary, and does not declare a new bold weight. Listening prose has a readable line height and a maximum width of 70ch. Metadata, route breadcrumbs, indexes, and kickers are compact mono or small sans-serif labels rather than another display face.

The incumbent mobile hero uses `clamp(48px, 16vw, 72px)` at 700px and below; section headings become 45px. Listening titles retain their fluid scale. These are observed responsive variants, not a newly normalized type scale.

## Layout

The shell uses a 32px square grid, a fixed 232px desktop sidebar, a corresponding main-content offset, and an 86px sticky top bar. Home content has 38px horizontal padding. Listening pages are centered within a maximum width of 1180px with 42px/16px top/horizontal padding and 160px bottom clearance.

At 900px and below the sidebar disappears, the top bar becomes 66px, member copy hides, and four navigation destinations move into a fixed bottom dock. The mini player sits above that dock and respects the safe-area inset. At 760px and below listening pages use 24px/20px top/horizontal padding and 165px bottom clearance; release art and text stack with a 20px gap, radio's three columns become divided rows, the track picker becomes one column, and playlist rows stack.

Desktop release detail uses 0.9fr/1.1fr columns with the release gap token. Radio uses three equal columns separated by rules, not separate floating cards. Listening actions wrap; library tabs wrap and keep an explicit selected state. Home has its own existing 1120px and 700px layout changes; do not force all surfaces onto a single breakpoint.

## Elevation & Depth

This is a hybrid system. Quiet listening tools are largely flat with thin borders; exhibition cards and the LP player use intentional hard offsets, while fixed overlays use soft shadows and blur. The faint shell grid remains an incumbent choice, not a defect to remove.

Representative source shadows are brand-mark ink offset (`5px 5px 0`), hero ink offset (`9px 9px 0`), collection-hover blue offset (`6px 6px 0`), and mini-player ambient depth (`0 18px 60px rgba(17,17,15,.28)`). The desktop full-player sheet combines a lime offset with a deep ambient shadow. Exact compound values are retained in the sidecar.

## Shapes

Circular brand marks and playback controls coexist with pill filters and large rounded panels. Listening buttons, fields, and panels use the smaller radii in frontmatter; collections and navigation keep their established larger corners. Borders are generally thin ink or translucent ink. Square album art is cropped with `object-fit: cover`; release covers use a 12px radius. The desktop LP sleeve is a deliberate near-square exception with a 4px corner, rotation, and visible record disc.

## Components

### Buttons

Listening controls are compact and direct: inline-flex with a 7px icon gap, 42px minimum height, the listening-button radius, and weight 650. Primary uses UP Blue/White; secondary uses Paper/Ink and Paper 2 on hover. The source's generic hover rule also applies to primary buttons; document the cascade rather than inventing another variant. Disabled listening controls use 0.5 opacity and a not-allowed cursor. Extension focus is a 3px UP Blue outline with a 3px offset.

The existing exhibition CTA is a separate uppercase pill: 54px minimum height, 24px horizontal padding, weight 900, ink fill, and a blue hard shadow that compresses on hover. Do not replace one family with the other.

### Chips

Genre filters are mono uppercase pills with quiet outlines and muted text. Active filters reverse to Ink/White. Library tabs are listening buttons rather than genre chips; selected tabs use UP Blue/White and expose `aria-selected`.

### Cards / Containers

Collection cards use Card Paper, a thin ink border, the collection radius, 14px padding, square cover art, and a blue-offset hover with slight lift/rotation. Radio is a ruled three-column shelf. Library playlists are ruled rows, with actions aligned at the right on desktop. Editors use a quiet outlined panel; the receipt uses Field Paper, a soft shadow, and dashed internal rules. Avoid treating these different incumbent structures as interchangeable cards.

### Inputs / Fields

Listening fields use Field Paper, Ink, a `#88867e` border, the field radius, 11px padding, and a 44px minimum height. Labels use 14px/650; textareas start at 85px and resize vertically. Checkboxes use the blue accent. The catalog search is a distinct 54px pill with an inline search icon; it is not the same component as the library form field.

### Navigation

Desktop items pair an icon with uppercase title/subtitle, a quiet default state, outlined hover, and an Ink/White active state with lime icon and 4px horizontal shift. The mobile dock has a dark translucent surface; its active destination becomes Lime/Ink. Floor, Archive, Library, and About stay the four shared destinations. Preserve native links, accessible labels, visible focus, and the skip link.

### Persistent LP player

The mini player is a dark rounded fixed bar with cover, lime progress, metadata, and circular controls. Expanding opens the existing cover/lyrics/queue dialog. Above 900px its 1180px-maximum sheet is split into a blue LP-art panel and paper controls, with a 32px corner and lime hard shadow. The sleeve, grooved disc, center label, and spindle remain intact; the disc rotates over 12 seconds only while playing and not buffering. Mobile keeps the existing full-screen paper player rather than forcing the desktop LP composition into a small screen.

The close control has an ink circular face, white border, and lime offset that compresses on hover/press. The dialog supports Escape and focus management. Existing spring/shared-surface and paint transitions are implementation facts; reduced-motion CSS shortens animations and transitions. Extend playback tools without replacing this signature.

### Feedback and persistence states

Mutation feedback uses the fixed Feedback Blue toast, White text, a check icon, 12px corner, readable wrapping, and a polite atomic live status. It sits below the top bar: desktop top 100px/right 24px; mobile top 78px/right 16px. Library loading, error/retry, empty, disabled, and saved states are real states, not placeholder marketing content. Preserve server-backed library refresh and explicit privacy choices alongside these visuals.

## Do's and Don'ts

### Do:

- Do preserve the paper grid, existing type stack, saturated accents, icons, and LP player when adding listening tools.
- Do keep task pages quieter than exhibition headlines while retaining the shared shell.
- Do retain wrapping, bottom-player clearance, visible focus, and explicit selected/disabled states.
- Do use the implemented ruled rows, radio columns, and small form panels for their existing roles.

### Don't:

- Don't replace the approved palette, normalize its two blues, or remove the grid as incidental cleanup.
- Don't redesign the sleeve/disc player or replace it with a generic album card.
- Don't promote a task-specific layout into a new global visual rule.
- Don't invent a new font, color scale, metaphor, or component state and label it incumbent.
