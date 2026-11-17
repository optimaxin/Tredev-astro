# TredevAstro — Design Reference (for Mobile App UI)

Source of truth: `frontend/src` (React web app). This doc extracts the screens, flows,
and visual language so a phone app (native or React Native) can be designed to match.
Admin Console (`admin/`) is an internal web-only back-office tool — **not** in scope for
the phone app. The Astrologer Workspace (`AstrologistDashboard/`) *is* a real app surface
(astrologers need a mobile app too) and is covered separately at the end.

---

## 1. Brand & Visual Language

**Vibe**: Vedic/Jyotish astrology brand — cosmic, temple-gold, parchment. Sanskrit terms
(Rashi, Nakshatra, Graha, Dosha) used throughout alongside English.

### Color tokens (dark theme — default)
| Token | Value | Use |
|---|---|---|
| `--bg-primary` | `#060914` | App background |
| `--bg-secondary` | `#080C1C` | Secondary background |
| `--surface` | `#0C1125` | Cards |
| `--surface-elevated` | `#11172C` | Elevated cards/modals |
| `--surface-highlight` | `#151B31` | Hover/highlight surface |
| `--text-primary` | `#F1E9DC` | Primary text (warm ivory) |
| `--text-secondary` | `#B9B3A8` | Secondary text |
| `--text-muted` | `#7F7B78` | Muted/caption text |
| `--gold-primary` | `#C7A15A` | Primary accent, CTAs, active states |
| `--gold-secondary` | `#9F7B3D` | Darker gold |
| `--gold-soft` | `#D2B978` | Soft gold highlight |
| `--sacred-accent` | `#A85A32` | Saffron/terracotta accent |
| `--subtle-maroon` | `#32161D` | Maroon accent surfaces |
| `--border-subtle` | `rgba(199,161,90,0.16)` | Card borders |

### Light theme (toggleable — warm ivory/parchment)
| Token | Value |
|---|---|
| `--bg-primary` | `#F5F0E7` (warm ivory) |
| `--bg-secondary` | `#ECE4D6` (parchment) |
| `--surface` | `#FAF7F0` (antique paper) |
| `--text-primary` | `#182333` (deep navy) |
| `--gold-primary` | `#B58A3B` (antique gold) |

Both themes exist and are user-toggleable — build the mobile app with a light/dark theme
switch from day one, driven by the same token pairs.

### Typography
- Display/heading font: **Yatra One** (decorative, Devanagari-flavored) with `Cormorant
  Garamond` / Georgia serif fallback.
- Body font: same `Yatra One` stack, falling back to `DM Sans` / system sans.
- Devanagari-script text: `Hind` font.
- Type scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 / 72px, plus a fluid
  `clamp(3rem, 8vw, 6.5rem)` hero size.

### Shape & motion
- Border radius scale: 4 / 8 / 16 / 24px, plus full-pill (999px) for buttons/badges.
- Cards use soft shadows (`0 4px 30px rgba(0,0,0,0.3)` dark, subtle in light).
- Section transitions use fade+slide-up on scroll (Framer Motion `whileInView`), ~250–400ms
  ease. Recreate as simple fade/slide-in on mount for mobile list items and screens.
- Recurring motif: a gold "✦ ❖ ✦" divider between header and content on most pages.
- Decorative "cosmic clouds" (saffron/indigo/maroon blurred blobs) drift behind content on
  dark theme — a subtle animated background layer, optional for v1 mobile.

### Iconography
- Custom line-art icon set (`Icons.tsx`): Cart, Profile, Sun/Moon (theme toggle), etc.
- Planet icons (`PlanetIcon`) — one per Graha (Sun, Moon, Mars, Mercury, Jupiter, Venus,
  Saturn, Rahu, Ketu), used throughout horoscope/kundli screens.
- Zodiac sign glyphs — 12 PNGs (`/images/zodiac/<Sign>.png`), used in the horoscope wheel
  and pickers.
- Benefic/malefic status shown via colored dots: green (benefic), red (malefic), grey
  (neutral) — a recurring convention across all planet-transit lists.

---

## 2. App Shell & Navigation

Persistent chrome around every consumer page:
- **Top nav** (desktop: full link bar; mobile: hamburger → full-screen slide-in menu):
  logo, primary links (Astrology, Kundli, Calculators, Reports, Panchang, Academy, Store),
  two CTA buttons (**Free Kundli**, **Consult**), cart icon+badge, notification bell,
  language picker (6 languages: English, Hindi, Marathi, Bengali, Tamil, Telugu) + theme
  toggle combined in one dropdown, and a login button / profile avatar dropdown.
- **Footer** — present on every public page.
- **Global overlays**: login modal (triggered by any gated action), payment-result modal,
  toast stack (realtime notifications), "active session" banner (persists across nav when
  a chat/call consultation is in progress), broadcast banner (site-wide admin announcements).
- A **"Monk Widget"** floating helper button is present site-wide (likely an AI/assistant
  entry point).

**Mobile-app equivalent**: bottom tab bar (Home / Astrologers / Kundli+Tools / Reports or
Store / Profile) is the natural translation of this nav, with the two CTAs promoted to
prominent buttons on Home instead of persistent header buttons. Cart, notifications, and
theme/language move into a Profile/Settings tab or a top-right icon cluster.

**Roles**: `USER` (customer), `ASTROLOGIST`, `STAFF`, `ADMIN`. Astrologist/Staff/Admin are
routed straight into their own workspace shell (no public nav/footer) — see §5.

---

## 3. Screen Inventory (Customer App)

### 3.1 Home
Single scrolling feed of sections, in order:
1. **Hero** — headline + primary CTA.
2. **Campaign banner** — promo strip.
3. **Seek Guidance** — concern picker (Love/Career/Marriage/etc.) driving into consult flow.
4. **Reports** (featured) — top astrology report products.
5. **Free Tools** (featured) — grid of calculator shortcuts.
6. **Panchang** — today's Panchang snapshot.
7. **Astrologers** (featured, 3-card grid) — top-rated Acharyas, "Explore All" link.
8. **AI Astrology** — "Ask TredevAstro" AI chat teaser.
9. **Store** (featured) — product teasers.
10. **Academy** (featured) — courses teaser.
11. **Blog** — latest posts.
12. **Testimonials**.
13. **Why TredevAstro** — trust/USP section.

### 3.2 Auth
Single page, two tabs: **Login** (email + password) and **Register** (multi-field:
full name, email, password, phone, DOB, time of birth, place of birth [autocomplete +
geocode], timezone, gender). Registration captures full birth details up front because
most tools need them later. Post-auth redirect: resumes whatever gated action triggered
login (e.g. straight into Astrologers or Free Kundli), or role-based redirect for
Astrologist/Staff/Admin into their workspace.

### 3.3 Free Kundli
Birth-details form → generates a full Kundli (birth chart) result: charts, Dasha periods,
downloadable PDF (PDF download is one of the few actions that force a login if not already
signed in). Chart rendering (`KundliCharts`) — plan for a native chart/table view, not a
literal iframe/PDF embed, on mobile.

### 3.4 Horoscope (Free Horoscopes)
- Period switcher (pill tabs): Daily / Weekly / Weekly Love / Monthly / Half-Year / Full Year.
- **12-segment zodiac wheel** (wedge-shaped ring, tap a wedge to select a sign) as the sign
  selector — a real design centerpiece, not a plain list. On mobile this can become a
  horizontally-scrollable sign carousel or a simplified radial picker.
- Selected-sign detail card: ruling planet, element, current transits list (planet icon +
  house + sign + retrograde flag), benefic/malefic dot, "Today's Focus" and "Love &
  Relationships" callout boxes, upcoming sign-change events.

### 3.5 Calculators ("Astrology Tools" — grid of ~20 tools)
All follow one shared shell pattern: eyebrow + title + description header → a form
(usually `BirthDetailsForm`: DOB/time/place, or `PanchangDetailsForm`: date/place) →
submit → result card showing both a plain-language verdict *and* the raw computed values
(so users can cross-check). Design this shell **once** as a reusable mobile template.

Tools: Choghadiya, Muhurat Finder, Abhijit Muhurat, Kundli Matching (Guna Milan — two-person
form + score-circle result out of 36 + per-koota breakdown grid), Nakshatra Finder, Mangal
Dosha (Manglik check), Sade Sati, Kaal Sarp Dosha, Rahu-Ketu Transit, Moon Sign, Ascendant,
Numerology, Life Path Number, Name Numerology, Numerology Match, FLAMES, Lucky Color & Date
(includes a color swatch), Baby Name (Namakaran syllable), Lal Kitab, Chinese Zodiac,
Numerology Horoscope.

### 3.6 Panchang
Date/place → sunrise/sunset, Tithi, Nakshatra, Yoga, Karana, Choghadiya, Abhijit Muhurat.

### 3.7 Astrologers
- **Listing**: category filter pills (All/Love/Marriage/Career/Finance/Vastu/Spirituality,
  labeled in Sanskrit), card grid — avatar, name, rating, price/min, live status dot.
- **Profile**: sidebar (avatar, name/title, star rating + review count, experience &
  consultations stat boxes, languages as badges, price/min with offer strikethrough,
  "Book Consultation" + "Save Astrologer" buttons) + content column (About, Approach to
  Jyotish, Lineage & Training, Client Reviews list). On mobile: sidebar becomes a sticky
  header card above a scrolling content list, with a floating/sticky "Book" CTA.
- **Booking**: "Consult Now" vs "Schedule for Later" toggle.
  - *Now*: format selector (Live Chat vs Voice Call, price/min shown with any offer
    applied), duration stepper (5–120 min, step 5), live-price summary sidebar, "Start
    Consultation Now" → joins the real-time queue.
  - *Schedule*: format selector (flat price) + time-slot grid → "Confirm Booking".
- **Waiting/Queue**: shows live queue position / assigned-astrologer state driven entirely
  by server realtime events (not client-computed) — countdown when session is about to
  expire, extend/end actions, recommended-astrologer fallback if the queue expires.
- **Live session**:
  - **Chat**: message list + text input, image attach, voice-message record button
    (customer-only feature — astrologer side has no attach button).
  - **Voice call**: WebRTC audio call UI — connecting/connected/ended states, elapsed
    timer, mute toggle, speaker toggle, hang-up. (Video is not built yet — voice-only.)

### 3.8 Reports
Grid of paid astrology report products → detail page (description, sample, price) →
purchase flow into checkout.

### 3.9 Store
Grid of physical/product items (gemstones, yantras, etc.) → product detail → cart → checkout.
Cart icon currently links out to an external store (`tredevastore.com`) rather than an
in-app cart on the web build — worth deciding explicitly for the phone app whether cart
stays in-app end-to-end.

### 3.10 Academy
Course grid → course detail → **course learning** view (lesson player/content) for
enrolled users.

### 3.11 Blog
Post grid → detail (article reader).

### 3.12 AI Astrology ("Ask TredevAstro")
AI chat interface for astrology Q&A.

### 3.13 Profile / "My Jyotish" Dashboard (customer)
Sidebar-navigated (mobile: convert to a list-of-tiles or bottom-sheet menu) dashboard with
sections: **My Jyotish** (home), **My Kundli**, **My Reports**, **My Consultations**, **My
Orders**, **My Wallet**, **Saved Astrologers** (favorited list with quick View/Remove),
**My Courses**. Consultation/report/order lists are simple card-list-with-status patterns.

### 3.14 About
Static company/brand page.

---

## 4. Shared UI Components (build as reusable mobile primitives)

| Component | Purpose |
|---|---|
| `BirthDetailsForm` | Name (optional) + DOB + time-of-birth + place (autocomplete+geocode) + timezone — the #1 reused form across ~15 calculator screens. |
| `PanchangDetailsForm` | Date + place — simpler sibling form for Panchang-based tools. |
| `AncientDatePicker` / `AncientTimePicker` | Custom-styled date/time pickers matching the brand (not native browser pickers). |
| `LocationAutocomplete` | Place-name autocomplete resolving to lat/lon server-side. |
| `ResultCard` / `CalculatorPageShell` | Generic "form → verdict + raw values" result pattern. |
| `PlanetIcon`, zodiac PNGs | Iconography for planets/signs, reused everywhere. |
| `ChatWindow`, `CallWindow` | Live consultation UI (see §3.7). |
| `LoginModal` | Gate for any action requiring auth; remembers the "pending action" to resume after login. |
| `PaymentResultModal` | Post-payment success/failure feedback. |
| `NotificationBell` / toast stack | Realtime notification surface. |
| Section-header pattern | eyebrow label → serif title → gold "✦ ❖ ✦" divider → sans description — used on nearly every page/section. |

---

## 5. Astrologer Workspace (separate app surface)

Astrologists get their own full workspace (no public nav/footer), organized as a
sidebar with groups:
- **Workspace**: Overview, Calendar, Consultations, Waiting Queue (live queue), Requests,
  Chat (inbox), Clients.
- **Practice**: Reports, Earnings, Reviews.
- **Profile**: My Profile, Availability, Notifications, Settings.

Includes real-time features specific to this role: incoming-assignment modal (new
consultation request popup), idle-warning banner, notification-permission onboarding,
and the same Chat/Call windows as the customer side (minus media-upload on chat). If a
companion astrologer mobile app is planned, treat this nav list as its tab/drawer
structure.

---

## 6. Notes for the Mobile Design Pass

- Skipped: Admin Console screens (internal web tool only — no mobile equivalent needed).
- The two themes (dark cosmic / light ivory) are both real, shipped, and user-toggleable —
  design both from the start rather than retrofitting light mode later.
- 6-language i18n is live in the web app (`t()` translation keys) — plan for the same
  language picker and text-expansion (Hindi/Marathi/Bengali/Tamil/Telugu run longer than
  English) in mobile layouts.
- Real-time state (queue position, live astrologer status, chat/call) is server-authoritative
  everywhere — the mobile app should treat these as live subscriptions, not polled/cached data.
