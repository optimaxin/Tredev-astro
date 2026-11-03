import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Professional Color Palette (Corporate Modern Dark)
    BG_COLOR = RGBColor(11, 15, 25)        # Deep Charcoal Navy
    CARD_BG = RGBColor(19, 26, 42)         # Slate Surface Card
    CARD_BORDER = RGBColor(38, 50, 78)     # Subtle Border
    TEXT_MAIN = RGBColor(248, 250, 252)    # Pure White / Ivory
    TEXT_MUTED = RGBColor(148, 163, 184)   # Slate Muted
    GOLD_ACCENT = RGBColor(217, 144, 44)   # Warm Vedic Gold
    SAFFRON = RGBColor(224, 102, 43)       # Terracotta Saffron
    GREEN_COLOR = RGBColor(34, 197, 94)    # Emerald Green
    RED_COLOR = RGBColor(239, 68, 68)      # Soft Crimson

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, slide_num, phase, title, subtitle=None):
        # Top Phase & Slide Tracker
        tracker = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.4))
        tf_t = tracker.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = f"TREDEVAASTRO  |  {phase.upper()}  •  SLIDE {slide_num:02d}/14"
        p_t.font.name = "Calibri"
        p_t.font.size = Pt(10)
        p_t.font.bold = True
        p_t.font.color.rgb = GOLD_ACCENT

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.733), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Arial"
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN

        if subtitle:
            sub_p = tf.add_paragraph()
            sub_p.text = subtitle
            sub_p.font.name = "Calibri"
            sub_p.font.size = Pt(13)
            sub_p.font.color.rgb = TEXT_MUTED
            sub_p.space_before = Pt(4)

    def add_card(slide, left, top, width, height, bg=CARD_BG, border=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg
        card.line.color.rgb = border
        card.line.width = Pt(1)
        return card

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)
    
    # Title Box
    t_box = s1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(10.9), Inches(3.5))
    tf1 = t_box.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "INTERNSHIP PROGRESS REPORT"
    p.font.name = "Calibri"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD_ACCENT
    
    p2 = tf1.add_paragraph()
    p2.text = "From Prototype to Platform"
    p2.font.name = "Arial"
    p2.font.size = Pt(44)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_MAIN
    p2.space_before = Pt(12)

    p3 = tf1.add_paragraph()
    p3.text = "TredevaAstro: Evolution from a UI Prototype to a Full-Scale Astrology Platform"
    p3.font.name = "Calibri"
    p3.font.size = Pt(18)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    # Details Card
    add_card(s1, Inches(1.2), Inches(5.2), Inches(10.9), Inches(1.3))
    dt_box = s1.shapes.add_textbox(Inches(1.5), Inches(5.35), Inches(10.3), Inches(1.0))
    dt_tf = dt_box.text_frame
    dt_p = dt_tf.paragraphs[0]
    dt_p.text = "Presenter: Sparsh Bansal      |      Role: Software Development Engineer Intern      |      Duration: 15 Minutes"
    dt_p.font.name = "Calibri"
    dt_p.font.size = Pt(14)
    dt_p.font.bold = True
    dt_p.font.color.rgb = TEXT_MAIN

    dt_sub = dt_tf.add_paragraph()
    dt_sub.text = "Focus: Frontend Architecture, Backend API Integration, Swiss Ephemeris Computation, WebRTC, and Production Deployments"
    dt_sub.font.name = "Calibri"
    dt_sub.font.size = Pt(12)
    dt_sub.font.color.rgb = TEXT_MUTED
    dt_sub.space_before = Pt(6)

    s1.notes_slide.notes_text_frame.text = "Good morning everyone. Today I'll be walking you through my internship work on TredevaAstro. When I joined, this project was primarily a front-end visual prototype with mock data. Over the course of my internship, we transformed it into a full-scale, production-ready astrology technology platform."

    # ==========================================
    # SLIDE 2: PROJECT AT A GLANCE
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, 2, "Overview", "Project at a Glance: What TredevaAstro Became", "An end-to-end astrology platform combining computation, communication, and e-commerce.")

    # 4 Key Metrics Cards
    metrics = [
        ("185", "Git Commits", "Disciplined version history across full stack"),
        ("20+", "Astrology Tools", "Vedic calculators, matchmaking, and horoscopes"),
        ("1 Core", "Kundli Engine", "Swiss Ephemeris-driven calculation pipeline"),
        ("2", "Target Platforms", "Fully synchronized Web and Android ecosystem")
    ]
    for i, (m_val, m_lbl, m_desc) in enumerate(metrics):
        cx = Inches(0.8 + i * 3.0)
        add_card(s2, cx, Inches(1.8), Inches(2.75), Inches(1.5))
        mb = s2.shapes.add_textbox(cx + Inches(0.2), Inches(1.9), Inches(2.35), Inches(1.3))
        mtf = mb.text_frame
        mp1 = mtf.paragraphs[0]
        mp1.text = m_val
        mp1.font.name = "Arial"
        mp1.font.size = Pt(32)
        mp1.font.bold = True
        mp1.font.color.rgb = GOLD_ACCENT
        
        mp2 = mtf.add_paragraph()
        mp2.text = m_lbl
        mp2.font.name = "Calibri"
        mp2.font.size = Pt(13)
        mp2.font.bold = True
        mp2.font.color.rgb = TEXT_MAIN
        
        mp3 = mtf.add_paragraph()
        mp3.text = m_desc
        mp3.font.name = "Calibri"
        mp3.font.size = Pt(10)
        mp3.font.color.rgb = TEXT_MUTED

    # Functional Pillars Box
    add_card(s2, Inches(0.8), Inches(3.6), Inches(11.733), Inches(3.2))
    p_box = s2.shapes.add_textbox(Inches(1.1), Inches(3.8), Inches(11.1), Inches(2.8))
    ptf = p_box.text_frame
    pp1 = ptf.paragraphs[0]
    pp1.text = "CORE PLATFORM SUBSYSTEMS"
    pp1.font.name = "Calibri"
    pp1.font.size = Pt(12)
    pp1.font.bold = True
    pp1.font.color.rgb = GOLD_ACCENT

    pillars = [
        ("Astrology & Calculations:", "Personalized Kundli generation, Swiss Ephemeris mathematical models, 20+ Vedic tools, Panchang engine."),
        ("Commercial Services:", "Automated multi-section PDF Kundli reports (Hindi + English), e-commerce store with regional pricing."),
        ("Real-time Communication:", "Peer-to-peer WebRTC voice consultations and low-latency live astrologer chat."),
        ("Operational Infrastructure:", "Role-based dashboards for Admins, Staff, and Astrologers with direct onboarding & Cashfree/Razorpay payments.")
    ]
    for p_title, p_desc in pillars:
        pp = ptf.add_paragraph()
        pp.text = f"•  {p_title} "
        pp.font.bold = True
        pp.font.size = Pt(13)
        pp.font.color.rgb = TEXT_MAIN
        pp.space_before = Pt(8)
        run = pp.add_run()
        run.text = p_desc
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    s2.notes_slide.notes_text_frame.text = "To understand the breadth of what was accomplished: TredevaAstro isn't just a static content site. It is a complete technology stack with 185 commits, featuring an exact computational engine, commercial PDF pipelines, WebRTC voice calling, and a store backed by payments."

    # ==========================================
    # SLIDE 3: BEFORE VS AFTER
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, 3, "Transformation", "Where It Started vs. Where It Is", "The product evolved from an isolated visual mock into an enterprise-grade functional ecosystem.")

    # Before Card (Left)
    add_card(s3, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    b_box = s3.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.0), Inches(4.5))
    btf = b_box.text_frame
    bp1 = btf.paragraphs[0]
    bp1.text = "STARTING POINT (UI PROTOTYPE)"
    bp1.font.name = "Arial"
    bp1.font.size = Pt(14)
    bp1.font.bold = True
    bp1.font.color.rgb = RED_COLOR

    before_points = [
        "Purely front-end focused design mockup",
        "Mock & hardcoded data across all screens",
        "Basic mock authentication without token validation",
        "Limited/disconnected backend infrastructure",
        "No mathematical astrology calculation engine",
        "No payment, cart, or checkout workflows",
        "No real-time communication between users & astrologers"
    ]
    for pt in before_points:
        p = btf.add_paragraph()
        p.text = f"✕  {pt}"
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(10)

    # After Card (Right)
    add_card(s3, Inches(6.9), Inches(1.8), Inches(5.6), Inches(5.0))
    a_box = s3.shapes.add_textbox(Inches(7.2), Inches(2.0), Inches(5.0), Inches(4.5))
    atf = a_box.text_frame
    ap1 = atf.paragraphs[0]
    ap1.text = "CURRENT PRODUCT (FULL-STACK PLATFORM)"
    ap1.font.name = "Arial"
    ap1.font.size = Pt(14)
    ap1.font.bold = True
    ap1.font.color.rgb = GREEN_COLOR

    after_points = [
        "Distributed React frontend & Node.js backend services",
        "Production Firebase Google & Phone OTP authentication",
        "Swiss Ephemeris-driven astronomical calculation pipeline",
        "20+ functional Vedic astrology calculators & Panchang",
        "Commercial multi-section PDF reports (Hindi/English)",
        "Integrated Cashfree & Razorpay payments with Wallet",
        "Real-time chat & WebRTC voice consultation calling",
        "Admin, staff, and astrologer operational workspaces"
    ]
    for pt in after_points:
        p = atf.add_paragraph()
        p.text = f"✓  {pt}"
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MAIN
        p.space_before = Pt(8)

    s3.notes_slide.notes_text_frame.text = "This before-and-after slide really captures the core story. We didn't just tweak the UI. We replaced every mock system with real APIs, real calculation algorithms, real authentication, and real payment processing."

    # ==========================================
    # SLIDE 4: PHASE 1 — FOUNDATION
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, 4, "Phase 1", "Building the Visual & UX Foundation", "Establishing the design language, component library, and core user experience.")

    # 4 Design System Pillars
    d_cards = [
        ("Vedic Visual Identity", [
            "Ancient Vedic manuscript aesthetic paired with modern UI",
            "Saffron gradients, warm parchment, and deep cosmic dark theme",
            "Yatra One display typography paired with clean sans-serif body",
            "Parchment-style authentic Kundli chart layout"
        ]),
        ("Core Screen Architecture", [
            "Modular Homepage structure with hero video and monk widget",
            "Gated login flows triggered by premium actions",
            "Comprehensive Astrologer profile & rating displays",
            "Clean categorization across Kundli, Tools, Reports, & Store"
        ]),
        ("Responsive Layouts", [
            "Desktop-first web responsiveness down to mobile screens",
            "Refined touch target sizes and mobile drawer navigation",
            "Light and dark theme support via unified design tokens",
            "Clean card abstractions and persistent chrome"
        ]),
        ("Design Foundation Impact", [
            "Created reusable design system components used across all 20+ tools",
            "Zero UI refactoring needed when plugging in live backend APIs later",
            "Unified experience across consumer web and astrologer dashboards"
        ])
    ]

    for idx, (ctitle, cpoints) in enumerate(d_cards):
        col = idx % 2
        row = idx // 2
        cx = Inches(0.8 + col * 5.95)
        cy = Inches(1.8 + row * 2.6)
        add_card(s4, cx, cy, Inches(5.75), Inches(2.4))
        
        tb = s4.shapes.add_textbox(cx + Inches(0.25), cy + Inches(0.2), Inches(5.25), Inches(2.0))
        c_tf = tb.text_frame
        cp = c_tf.paragraphs[0]
        cp.text = ctitle
        cp.font.name = "Arial"
        cp.font.size = Pt(13)
        cp.font.bold = True
        cp.font.color.rgb = GOLD_ACCENT

        for pt in cpoints:
            p = c_tf.add_paragraph()
            p.text = f"• {pt}"
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT_MUTED
            p.space_before = Pt(4)

    s4.notes_slide.notes_text_frame.text = "In Phase 1, my priority was establishing the design system. An astrology platform needs to evoke trust and authenticity while feeling modern. We paired Vedic manuscript motifs like saffron tones and parchment Kundlis with a clean, responsive component system."

    # ==========================================
    # SLIDE 5: PHASE 2 — FROM UI TO REAL APPLICATION
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, 5, "Phase 2", "The Turning Point: Mock to Real Infrastructure", "Architecting the backend and connecting frontend components to live microservices.")

    # Architecture Transition (Top Card)
    add_card(s5, Inches(0.8), Inches(1.8), Inches(11.733), Inches(2.2))
    ab = s5.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(11.1), Inches(1.8))
    atf = ab.text_frame
    ap = atf.paragraphs[0]
    ap.text = "ARCHITECTURAL TRANSITION"
    ap.font.name = "Arial"
    ap.font.size = Pt(13)
    ap.font.bold = True
    ap.font.color.rgb = GOLD_ACCENT

    arch_pts = [
        "Separated monolithic prototype into dedicated frontend and backend tiers.",
        "Replaced mock state and mock users with real Firebase Authentication (Google OAuth + Phone OTP verification).",
        "Constructed centralized REST API services with error handling and token authentication middleware.",
        "Built persistent user data storage for saved birth charts, user favorites, and consultation history."
    ]
    for pt in arch_pts:
        p = atf.add_paragraph()
        p.text = f"➔  {pt}"
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MAIN
        p.space_before = Pt(4)

    # 6 Real Modules (Bottom 6 Cards)
    modules = [
        ("Authentication", "Firebase Google & Phone OTP with JWT session guards"),
        ("Astrology APIs", "Live coordinate geocoding, ephemeris calculations"),
        ("Reports Service", "Automated background Kundli PDF rendering"),
        ("Panchang Engine", "Tithi, Nakshatra, Yoga, and Kaal timings"),
        ("Chat Service", "Socket-based messaging with persistence"),
        ("User Data", "Saved Kundlis, favorites, and profile orders")
    ]
    for idx, (m_name, m_sub) in enumerate(modules):
        mx = Inches(0.8 + (idx % 3) * 3.95)
        my = Inches(4.2 + (idx // 3) * 1.45)
        add_card(s5, mx, my, Inches(3.8), Inches(1.3))
        tb = s5.shapes.add_textbox(mx + Inches(0.2), my + Inches(0.15), Inches(3.4), Inches(1.0))
        mtf = tb.text_frame
        mp = mtf.paragraphs[0]
        mp.text = m_name
        mp.font.name = "Arial"
        mp.font.size = Pt(12)
        mp.font.bold = True
        mp.font.color.rgb = GOLD_ACCENT

        mp2 = mtf.add_paragraph()
        mp2.text = m_sub
        mp2.font.size = Pt(10)
        mp2.font.color.rgb = TEXT_MUTED
        mp2.space_before = Pt(3)

    s5.notes_slide.notes_text_frame.text = "Phase 2 was the crucial engineering pivot. This is where TredevaAstro stopped being a visual prototype and became a functional platform. We set up real API endpoints, integrated Firebase Auth, and created live data models for users."

    # ==========================================
    # SLIDE 6: HERO TECHNICAL WORK — KUNDLI ENGINE
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, 6, "Core Engineering", "Building the Kundli Engine", "Mathematical computation pipeline powered by Swiss Ephemeris.")

    # 7-Step Horizontal Pipeline Box
    add_card(s6, Inches(0.8), Inches(1.8), Inches(11.733), Inches(1.6))
    pb = s6.shapes.add_textbox(Inches(1.0), Inches(1.9), Inches(11.3), Inches(1.4))
    ptf = pb.text_frame
    pp = ptf.paragraphs[0]
    pp.text = "COMPUTATIONAL PIPELINE"
    pp.font.name = "Calibri"
    pp.font.size = Pt(11)
    pp.font.bold = True
    pp.font.color.rgb = GOLD_ACCENT

    pipe_steps = "Birth Data (Date/Time)   ➔   Geocoding (Lat/Long/TZ)   ➔   Swiss Ephemeris   ➔   Planetary Positions   ➔   Placidus Houses   ➔   Vedic Calculations   ➔   Kundli & PDF Report"
    pp2 = ptf.add_paragraph()
    pp2.text = pipe_steps
    pp2.font.name = "Arial"
    pp2.font.size = Pt(12)
    pp2.font.bold = True
    pp2.font.color.rgb = TEXT_MAIN
    pp2.space_before = Pt(10)

    # Left: Mathematical Subsystems
    add_card(s6, Inches(0.8), Inches(3.6), Inches(6.8), Inches(3.3))
    sb = s6.shapes.add_textbox(Inches(1.0), Inches(3.75), Inches(6.4), Inches(3.0))
    stf = sb.text_frame
    sp = stf.paragraphs[0]
    sp.text = "COMPUTATIONAL SUBSYSTEMS IMPLEMENTED"
    sp.font.name = "Arial"
    sp.font.size = Pt(12)
    sp.font.bold = True
    sp.font.color.rgb = GOLD_ACCENT

    subsystems = [
        "Dasha Systems: Vimshottari Dasha calculations down to Antardasha/Pratyantardasha",
        "Yogini Dasha: Cycle mapping and planetary period transitions",
        "Shodasavarga: Complete 16 divisional charts (D1 Rashi, D9 Navamsha, to D60)",
        "Ashtakavarga & KP System: Planet bindu calculation & KP Sub-Lord analysis",
        "Shadbala & Bhavbala: Six-fold planetary strength & house potential scoring",
        "Chart Rendering: Interactive North Indian and South Indian chart visualizers"
    ]
    for ss in subsystems:
        p = stf.add_paragraph()
        p.text = f"• {ss}"
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(4)

    # Right: Debugging Highlight
    add_card(s6, Inches(7.8), Inches(3.6), Inches(4.733), Inches(3.3))
    db = s6.shapes.add_textbox(Inches(8.0), Inches(3.75), Inches(4.333), Inches(3.0))
    dtf = db.text_frame
    dp = dtf.paragraphs[0]
    dp.text = "CRITICAL BUG DIAGNOSED & FIXED"
    dp.font.name = "Arial"
    dp.font.size = Pt(12)
    dp.font.bold = True
    dp.font.color.rgb = RED_COLOR

    dp2 = dtf.add_paragraph()
    dp2.text = "Ascendant Calculation Angular Error"
    dp2.font.name = "Arial"
    dp2.font.size = Pt(14)
    dp2.font.bold = True
    dp2.font.color.rgb = TEXT_MAIN
    dp2.space_before = Pt(8)

    bug_details = [
        "Symptom: Certain birth charts placed the Lagna (Ascendant) in the wrong zodiac sign.",
        "Root Cause: Angular normalization issue in trigonometric calculations when converting local sidereal time (LST) and geographic longitude.",
        "Fix: Corrected modulo angular reductions and obliquity formulas across the calculation flow.",
        "Impact: Restored 100% mathematical accuracy verified against standard astrological ephemeris benchmarks."
    ]
    for bd in bug_details:
        p = dtf.add_paragraph()
        p.text = f"• {bd}"
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(5)

    s6.notes_slide.notes_text_frame.text = "This is our core technical slide. The Kundli engine uses the Swiss Ephemeris for planetary data, calculating Placidus houses, Dashas, and divisional charts. A key engineering highlight was diagnosing an angular modulo bug in the ascendant calculation that caused incorrect Lagna placements."

    # ==========================================
    # SLIDE 7: PRODUCT EXPANSION — TOOLS & PANCHANG
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, 7, "Product Expansion", "Expanding Beyond Kundli: Tools & Panchang", "Broadening the platform from a horoscope tool into a full Vedic astrology toolkit.")

    # 20+ Tools Matrix (Left)
    add_card(s7, Inches(0.8), Inches(1.8), Inches(6.8), Inches(5.0))
    tb_box = s7.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(6.2), Inches(4.5))
    ttf = tb_box.text_frame
    tp1 = ttf.paragraphs[0]
    tp1.text = "20+ ASTROLOGY CALCULATORS & TOOLS"
    tp1.font.name = "Arial"
    tp1.font.size = Pt(13)
    tp1.font.bold = True
    tp1.font.color.rgb = GOLD_ACCENT

    tools_categories = [
        ("Core Tools:", "Numerology, Nakshatra Finder, Sade Sati Tracker, Kundli Matching (Gun Milan)"),
        ("Compatibility & Fun:", "FLAMES Calculator, Lucky Color & Date, Baby Name Recommendation"),
        ("Classical Systems:", "Lal Kitab Insights, Chinese Zodiac Compatibility, Vastu Guidelines, Pitra Dosha"),
        ("Forecasts:", "Weekly, Monthly, and Yearly automated transit horoscope generators")
    ]
    for cat, desc in tools_categories:
        p = ttf.add_paragraph()
        p.text = f"{cat} "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MAIN
        p.space_before = Pt(8)
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # Panchang Engine (Right)
    add_card(s7, Inches(7.8), Inches(1.8), Inches(4.733), Inches(5.0))
    pb_box = s7.shapes.add_textbox(Inches(8.1), Inches(2.0), Inches(4.133), Inches(4.5))
    ptf = pb_box.text_frame
    pp1 = ptf.paragraphs[0]
    pp1.text = "PANCHANG ENGINE & UTILITIES"
    pp1.font.name = "Arial"
    pp1.font.size = Pt(13)
    pp1.font.bold = True
    pp1.font.color.rgb = SAFFRON

    panchang_pts = [
        "Panchang Redesign: Intuitive daily view of Tithi, Nakshatra, Yoga, and Karana.",
        "Inauspicious Periods: Accurate timing calculations for Yamaganda and Gulika Kaal.",
        "Auspicious Periods: Abhijit Muhurta and Rahu Kaal window indicators.",
        "Timezone Handling: Automated dynamic timezone and daylight saving adjustments.",
        "Geocoding Integration: Fast city/coordinate lookup with local caching to minimize API latency."
    ]
    for pt in panchang_pts:
        p = ptf.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(10)

    s7.notes_slide.notes_text_frame.text = "Once the core Kundli engine was stable, we expanded horizontally. We added 20+ specialized calculators ranging from Sade Sati to Numerology, alongside a redesigned daily Panchang engine that calculates complex planetary timings."

    # ==========================================
    # SLIDE 8: PRODUCTIZATION — REPORTS, CALLS & STORE
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, 8, "Productization", "Commercialization: Reports, Communication & Store", "Transitioning from free information delivery into monetization and live interaction.")

    # 3 Commercial Pillars
    pillars_data = [
        ("Commercial PDF Reports", [
            "Multi-section comprehensive Kundli PDF export",
            "Full Hindi language translation & layout support",
            "Optimized server-side PDF generation pipeline",
            "Login-gated access with persistent download history",
            "High-resolution chart vector embedding"
        ]),
        ("Real-time Communication", [
            "Peer-to-peer WebRTC voice consultation calling",
            "Custom TURN/STUN server configuration for NAT traversal",
            "Socket-based real-time text chat with presence indicators",
            "Resolved race conditions in concurrent chat sessions",
            "Automatic session duration tracking & call termination"
        ]),
        ("Store & Monetization", [
            "Vedic store backend with full order lifecycle tracking",
            "Flexible consultation pricing (per-minute & flat rates)",
            "Dynamic regional geo-IP pricing calculation",
            "CSV bulk pricing upload utility for catalog operations",
            "Shopping cart, checkout validation, and wallet integration"
        ])
    ]

    for idx, (p_title, p_points) in enumerate(pillars_data):
        cx = Inches(0.8 + idx * 3.95)
        add_card(s8, cx, Inches(1.8), Inches(3.8), Inches(5.0))
        
        tb = s8.shapes.add_textbox(cx + Inches(0.2), Inches(2.0), Inches(3.4), Inches(4.5))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = p_title
        p.font.name = "Arial"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = GOLD_ACCENT

        for pt in p_points:
            pp = tf.add_paragraph()
            pp.text = f"• {pt}"
            pp.font.size = Pt(11)
            pp.font.color.rgb = TEXT_MUTED
            pp.space_before = Pt(8)

    s8.notes_slide.notes_text_frame.text = "This slide demonstrates how the product became commercially viable. We created high-value downloadable PDF reports, built WebRTC voice and socket chat so users can consult astrologers, and deployed an e-commerce backend."

    # ==========================================
    # SLIDE 9: PAYMENTS, AUTH & ADMIN
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, 9, "Operational Layer", "Payments, Authentication & Role Administration", "Multi-tenant infrastructure separating consumer, astrologer, staff, and admin workflows.")

    # 4 Role Workflows
    roles = [
        ("USER WORKFLOW", [
            "Google Login or Phone OTP",
            "Free Kundli & Basic Tools",
            "Wallet recharge & payments",
            "Consultation booking & orders"
        ]),
        ("ASTROLOGER WORKFLOW", [
            "Dedicated Astrologist Dashboard",
            "Incoming chat & call interface",
            "Availability schedule toggles",
            "Earnings & consultation history"
        ]),
        ("STAFF OPERATIONS", [
            "Section-level permission access",
            "Direct astrologer onboarding",
            "Catalog & product curation",
            "Order status & fulfillment check"
        ]),
        ("ADMIN MANAGEMENT", [
            "Full platform access control",
            "Revenue & financial metrics",
            "Campaign tracking & analytics",
            "System configuration overrides"
        ])
    ]
    for idx, (r_title, r_items) in enumerate(roles):
        cx = Inches(0.8 + idx * 2.95)
        add_card(s9, cx, Inches(1.8), Inches(2.85), Inches(3.4))
        
        tb = s9.shapes.add_textbox(cx + Inches(0.15), Inches(1.95), Inches(2.55), Inches(3.1))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = r_title
        p.font.name = "Arial"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = GOLD_ACCENT

        for itm in r_items:
            pp = tf.add_paragraph()
            pp.text = f"➔ {itm}"
            pp.font.size = Pt(10)
            pp.font.color.rgb = TEXT_MUTED
            pp.space_before = Pt(6)

    # Integrated Gateways Bottom Card
    add_card(s9, Inches(0.8), Inches(5.4), Inches(11.733), Inches(1.4))
    gb = s9.shapes.add_textbox(Inches(1.1), Inches(5.55), Inches(11.1), Inches(1.1))
    gtf = gb.text_frame
    gp = gtf.paragraphs[0]
    gp.text = "INTEGRATED PLATFORM SERVICES"
    gp.font.name = "Calibri"
    gp.font.size = Pt(11)
    gp.font.bold = True
    gp.font.color.rgb = GOLD_ACCENT

    gp2 = gtf.add_paragraph()
    gp2.text = "Payments: Cashfree & Razorpay Gateways + Internal User Wallet   |   Auth: Firebase Google OAuth & Phone OTP Verification"
    gp2.font.name = "Arial"
    gp2.font.size = Pt(12)
    gp2.font.bold = True
    gp2.font.color.rgb = TEXT_MAIN
    gp2.space_before = Pt(4)

    s9.notes_slide.notes_text_frame.text = "Behind the scenes, we built distinct operational workflows. Users, astrologers, staff, and administrators each have separate dashboards with role-based access control, tied together by production payments and authentication."

    # ==========================================
    # SLIDE 10: MAJOR PROBLEMS SOLVED
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, 10, "Engineering Rigor", "Major Engineering Problems Solved", "Work is not just about writing features — it is about identifying and fixing hard bugs.")

    # Table of 8 Solved Problems
    problems = [
        ("Incorrect Kundli calculations", "Identified angular normalization errors in Lagna calculations; corrected modulo formulas."),
        ("Cross-network WebRTC call drops", "Configured production TURN/STUN credentials to enable peer connection across restricted NATs."),
        ("PDF generation deployment crashes", "Resolved Chromium memory leaks on Render by applying minimal memory launch arguments."),
        ("Mock authentication vulnerabilities", "Replaced hardcoded tokens with real Firebase JWT verification middleware on all protected routes."),
        ("Chat message race conditions", "Implemented sequence IDs and socket synchronization locks to prevent out-of-order message delivery."),
        ("Regional pricing mismatches", "Engineered IP-based geo-location detection with fallback currency conversion tables."),
        ("High server computation load", "Reworked expensive mathematical loops and cached planetary positions for recurring dates."),
        ("Deployment & hosting instability", "Standardized cloud configs across Cloudflare and Render to resolve build pipeline failures.")
    ]

    add_card(s10, Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.0))
    tb = s10.shapes.add_textbox(Inches(1.0), Inches(1.9), Inches(11.3), Inches(4.7))
    tf = tb.text_frame
    p0 = tf.paragraphs[0]
    p0.text = f"{'ENGINEERING CHALLENGE':<45} |  {'RESOLUTION & IMPACT'}"
    p0.font.name = "Arial"
    p0.font.size = Pt(11)
    p0.font.bold = True
    p0.font.color.rgb = GOLD_ACCENT

    for prob, res in problems:
        p = tf.add_paragraph()
        p.text = f"• {prob}: "
        p.font.name = "Arial"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN
        p.space_before = Pt(5)
        run = p.add_run()
        run.text = res
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    s10.notes_slide.notes_text_frame.text = "This slide highlights my debugging and engineering contribution. We resolved cross-network WebRTC failures with TURN servers, fixed PDF generator memory crashes on Render, eliminated race conditions in chat, and corrected calculations."

    # ==========================================
    # SLIDE 11: INFRASTRUCTURE, DEPLOYMENT & MOBILE
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, 11, "Infrastructure", "Infrastructure, Deployment & Mobile Expansion", "Expanding from a browser-only application into a multi-platform production ecosystem.")

    # 3 Cards
    infra_cols = [
        ("Cloud Infrastructure", [
            "Cloudflare DNS management & SSL routing",
            "Render deployment pipeline stabilization",
            "Playwright / Chromium headless configuration",
            "PDF rendering memory optimization",
            "AWS Location & geocoding coordinate caching",
            "TURN/STUN server credential provisioning"
        ]),
        ("Monorepo Architecture", [
            "Restructured repository from flat frontend to clean monorepo: frontend/ ➔ web/frontend/",
            "Isolated web frontend, backend APIs, and mobile packages",
            "Standardized environment configuration across dev & prod",
            "Clean separation between consumer app and admin console"
        ]),
        ("Mobile App Ecosystem", [
            "Added Android mobile application to the platform",
            "Synchronized design system (Vedic palette & Yatra One typography)",
            "Mobile-friendly Kundli visualization & tools access",
            "Shared backend APIs between web and native Android clients"
        ])
    ]
    for idx, (ititle, ipoints) in enumerate(infra_cols):
        cx = Inches(0.8 + idx * 3.95)
        add_card(s11, cx, Inches(1.8), Inches(3.8), Inches(5.0))
        
        tb = s11.shapes.add_textbox(cx + Inches(0.2), Inches(2.0), Inches(3.4), Inches(4.5))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = ititle
        p.font.name = "Arial"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = GOLD_ACCENT

        for pt in ipoints:
            pp = tf.add_paragraph()
            pp.text = f"• {pt}"
            pp.font.size = Pt(11)
            pp.font.color.rgb = TEXT_MUTED
            pp.space_before = Pt(8)

    s11.notes_slide.notes_text_frame.text = "My work wasn't confined to the frontend. I worked across the infrastructure: configuring Cloudflare, resolving headless Chromium PDF deployment issues on Render, restructuring the monorepo, and supporting the Android mobile expansion."

    # ==========================================
    # SLIDE 12: THE 45-DAY TRANSFORMATION
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, 12, "Impact & Scale", "42 Days of Git History. 185 Commits. One Transformation.", "A disciplined progression from concept to a commercially-oriented platform.")

    # 4 Transformation Stages Cards
    stages = [
        ("STAGE 1: PROTOTYPE", "UI Foundation & Design System", "Vedic aesthetic, component library, Yatra One typography, homepage and Kundli static mockup."),
        ("STAGE 2: FUNCTIONAL", "Real Backend & Engine", "Firebase Auth, REST APIs, Swiss Ephemeris mathematical computation, ascendant calculation fix."),
        ("STAGE 3: COMMERCIAL", "Productization & Commerce", "Commercial Kundli PDF reports, WebRTC voice consultations, socket chat, store & payments."),
        ("STAGE 4: ECOSYSTEM", "Multi-Platform & Infra", "Monorepo restructuring, Render/Cloudflare deployment stabilization, Android app expansion.")
    ]
    for idx, (s_title, s_sub, s_desc) in enumerate(stages):
        cx = Inches(0.8 + idx * 2.95)
        add_card(s12, cx, Inches(1.8), Inches(2.85), Inches(3.4))
        
        tb = s12.shapes.add_textbox(cx + Inches(0.15), Inches(1.95), Inches(2.55), Inches(3.1))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = s_title
        p.font.name = "Arial"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = GOLD_ACCENT if idx < 3 else GREEN_COLOR

        p2 = tf.add_paragraph()
        p2.text = s_sub
        p2.font.name = "Arial"
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(4)

        p3 = tf.add_paragraph()
        p3.text = s_desc
        p3.font.size = Pt(10)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(8)

    # 185 Commits Bottom Banner
    add_card(s12, Inches(0.8), Inches(5.4), Inches(11.733), Inches(1.4))
    bb = s12.shapes.add_textbox(Inches(1.1), Inches(5.55), Inches(11.1), Inches(1.1))
    btf = bb.text_frame
    bp = btf.paragraphs[0]
    bp.text = "CORE METRIC: 185 GIT COMMITS OF MEASURABLE PROGRESS"
    bp.font.name = "Arial"
    bp.font.size = Pt(13)
    bp.font.bold = True
    bp.font.color.rgb = GOLD_ACCENT

    bp2 = btf.add_paragraph()
    bp2.text = "Every commit represented tangible progression: eliminating mocks, calibrating ephemeris calculations, securing endpoints, and stabilizing deployments."
    bp2.font.name = "Calibri"
    bp2.font.size = Pt(11)
    bp2.font.color.rgb = TEXT_MUTED
    bp2.space_before = Pt(4)

    s12.notes_slide.notes_text_frame.text = "Looking at the overall trajectory: across 42 days of git history and 185 commits, we systematically moved from a prototype into a functional product, then a commercial platform, and finally a multi-platform ecosystem."

    # ==========================================
    # SLIDE 13: MY TECHNICAL CONTRIBUTION
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, 13, "Personal Scope", "My Technical Contribution Across the Stack", "Clear breakdown of engineering areas I personally owned and contributed to.")

    # 5 Capability Columns
    contrib_areas = [
        ("Frontend", [
            "UI/UX Implementation",
            "Responsive Web Design",
            "Astrologer Dashboard",
            "Interactive Kundli UI",
            "Panchang Components"
        ]),
        ("Backend", [
            "REST API Services",
            "Firebase Auth Layer",
            "Reports Generator",
            "Orders & Store Logic",
            "Role Permissions"
        ]),
        ("Core Engineering", [
            "Kundli Computation",
            "Ascendant Debugging",
            "WebRTC Voice Relays",
            "Socket Chat Engine",
            "Payment Gateways"
        ]),
        ("Infrastructure", [
            "Cloudflare Routing",
            "Render Deployment",
            "PDF Memory Tuning",
            "Monorepo Structure",
            "Build Configurations"
        ]),
        ("Product Scope", [
            "20+ Astrology Tools",
            "Campaign Features",
            "Content Quality",
            "Regional Pricing",
            "Android Sync"
        ])
    ]
    for idx, (area, items) in enumerate(contrib_areas):
        cx = Inches(0.8 + idx * 2.37)
        add_card(s13, cx, Inches(1.8), Inches(2.25), Inches(4.3))
        
        tb = s13.shapes.add_textbox(cx + Inches(0.15), Inches(1.95), Inches(1.95), Inches(4.0))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = area
        p.font.name = "Arial"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = GOLD_ACCENT

        for itm in items:
            pp = tf.add_paragraph()
            pp.text = f"• {itm}"
            pp.font.size = Pt(10)
            pp.font.color.rgb = TEXT_MUTED
            pp.space_before = Pt(6)

    # Bottom Scope Statement
    add_card(s13, Inches(0.8), Inches(6.25), Inches(11.733), Inches(0.7))
    sb = s13.shapes.add_textbox(Inches(1.0), Inches(6.32), Inches(11.3), Inches(0.55))
    stf = sb.text_frame
    sp = stf.paragraphs[0]
    sp.text = "Summary: Frontend  ➔  Backend  ➔  Core Computation  ➔  Infrastructure & Deployment  ➔  Product Systems"
    sp.font.name = "Arial"
    sp.font.size = Pt(11)
    sp.font.bold = True
    sp.font.color.rgb = TEXT_MAIN

    s13.notes_slide.notes_text_frame.text = "Instead of claiming every feature in isolation, this capability map shows the breadth of my personal engineering involvement: from frontend UI and backend endpoints to core computation, deployment stabilization, and product features."

    # ==========================================
    # SLIDE 14: CLOSING SLIDE
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)

    # Large Statement Card
    add_card(s14, Inches(1.2), Inches(1.2), Inches(10.9), Inches(5.1))
    cb = s14.shapes.add_textbox(Inches(1.6), Inches(1.6), Inches(10.1), Inches(4.3))
    ctf = cb.text_frame
    ctf.word_wrap = True

    cp1 = ctf.paragraphs[0]
    cp1.text = "CONCLUSION"
    cp1.font.name = "Calibri"
    cp1.font.size = Pt(12)
    cp1.font.bold = True
    cp1.font.color.rgb = GOLD_ACCENT

    cp2 = ctf.add_paragraph()
    cp2.text = "From Screens to Systems."
    cp2.font.name = "Arial"
    cp2.font.size = Pt(40)
    cp2.font.bold = True
    cp2.font.color.rgb = TEXT_MAIN
    cp2.space_before = Pt(8)

    cp3 = ctf.add_paragraph()
    cp3.text = "\"What started as a UI-driven prototype evolved into a functional, commercially-oriented, multi-platform astrology ecosystem.\""
    cp3.font.name = "Georgia"
    cp3.font.size = Pt(18)
    cp3.font.italic = True
    cp3.font.color.rgb = GOLD_ACCENT
    cp3.space_before = Pt(16)

    cp4 = ctf.add_paragraph()
    cp4.text = "Thank you. Questions & Discussion."
    cp4.font.name = "Arial"
    cp4.font.size = Pt(18)
    cp4.font.bold = True
    cp4.font.color.rgb = TEXT_MAIN
    cp4.space_before = Pt(28)

    cp5 = ctf.add_paragraph()
    cp5.text = "Sparsh Bansal  |  SDE Intern  |  TredevaAstro Progress Report"
    cp5.font.name = "Calibri"
    cp5.font.size = Pt(12)
    cp5.font.color.rgb = TEXT_MUTED
    cp5.space_before = Pt(6)

    s14.notes_slide.notes_text_frame.text = "To conclude: this internship was about bridging the gap between screens and systems. We took a concept that looked good in Figma and made it run in production with real users, calculations, and commerce. Thank you, and I welcome any questions."

    # Save to PowerPoint file
    output_path = os.path.join(r"d:\oldCoding\Internship\TredevAstro\presentation", "TredevaAstro_Internship_Progress_Report.pptx")
    prs.save(output_path)
    print(f"PowerPoint Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    create_presentation()
