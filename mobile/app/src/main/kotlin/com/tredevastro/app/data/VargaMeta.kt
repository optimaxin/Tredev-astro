package com.tredevastro.app.data

/** Display names for the 18 divisional (varga) charts D2-D60 — mirrors
 * web/frontend/src/services/calculatorService.ts's VARGA_LABELS, same order
 * the website's Charts tab uses (D1/D9 are shown separately, not in this map). */
val VARGA_LABELS: Map<String, String> = linkedMapOf(
    "D2" to "Hora (D2) — Wealth",
    "D3" to "Drekkana (D3) — Siblings",
    "D4" to "Chaturthamsa (D4) — Property",
    "D5" to "Panchamsa (D5) — Fame & Power",
    "D6" to "Shashtamsa (D6) — Health",
    "D7" to "Saptamsa (D7) — Children",
    "D8" to "Ashtamsa (D8) — Longevity",
    "D10" to "Dasamsa (D10) — Career",
    "D11" to "Rudramsa (D11) — Gains",
    "D12" to "Dwadasamsa (D12) — Parents",
    "D16" to "Shodasamsa (D16) — Vehicles & Comforts",
    "D20" to "Vimsamsa (D20) — Spiritual Life",
    "D24" to "Chaturvimsamsa (D24) — Education",
    "D27" to "Bhamsa (D27) — Strengths & Weaknesses",
    "D30" to "Trimsamsa (D30) — Miseries & Evils",
    "D40" to "Khavedamsa (D40) — Maternal Fortune",
    "D45" to "Akshavedamsa (D45) — Paternal Fortune",
    "D60" to "Shashtiamsa (D60) — Past Karma",
)

/** Same order the website lists divisional charts in (Charts tab's
 * "All Divisional Charts" grid), Chandra + D1/D9 excluded since those get
 * their own featured slots. */
val DIVISIONAL_ORDER = listOf(
    "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D10", "D11", "D12",
    "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60",
)
