package com.tredevastro.app.ui.theme

import androidx.compose.ui.graphics.Color

// Ports the CSS custom properties from web/frontend/src/styles/globals.css
// so both apps read as one brand. Keep these two files in sync by hand —
// there's no shared token source between the web and native codebases.

// Flat dark grey / dark navy-blue combination — no gradient underlay (the
// earlier cosmic-cloud glow read as "cheap" regardless of how much its
// opacity got tuned down, so it's gone; see CosmicBackground.kt). Background
// sits on the navy side, surfaces step up through neutral dark greys, same
// gold/terracotta accents as before for brand continuity.
object CosmosPalette {
    val bgPrimary = Color(0xFF0D1117)
    val bgSecondary = Color(0xFF161B22)
    val surface = Color(0xFF1C1F26)
    val surfaceElevated = Color(0xFF22262E)
    val surfaceHighlight = Color(0xFF2A2F38)

    val textPrimary = Color(0xFFF1E9DC)
    val textSecondary = Color(0xFFB9B3A8)
    val textMuted = Color(0xFF7F7B78)

    val goldPrimary = Color(0xFFC7A15A)
    val goldSecondary = Color(0xFF9F7B3D)
    val goldSoft = Color(0xFFD2B978)

    val sacredAccent = Color(0xFFA85A32)

    val borderSubtle = Color(0x29C7A15A)
    val borderStrong = Color(0x47C7A15A)
}

// "Vedic Sanctuary" — exact tokens from
// Extra/stitch_tredev_mobile_app_design/vedic_sanctuary_light/DESIGN.md.
object ParchmentPalette {
    val bgPrimary = Color(0xFFF5F0E7) // Base Canvas — Warm Ivory
    val bgSecondary = Color(0xFFECE4D6) // Canvas Variant — Soft Parchment
    val surface = Color(0xFFFAF7F0) // Surfaces — Antique Paper
    val surfaceElevated = Color(0xFFF2EBD9)
    val surfaceHighlight = Color(0xFFE8DEC8)

    val textPrimary = Color(0xFF182333) // Primary Navy
    val textSecondary = Color(0xFF546071) // Warm Charcoal
    val textMuted = Color(0xFF818D9D) // Subtle Muted Slate

    val goldPrimary = Color(0xFFB58A3B) // Primary Accent — Antique Gold
    val goldSecondary = Color(0xFF8F6A22)
    val goldSoft = Color(0xFFC7A15A) // Tertiary Accent — Rich Amber Gold

    val sacredAccent = Color(0xFFA85A32) // Secondary Accent — Terracotta Saffron

    val borderSubtle = Color(0x33B58A3B) // rgba(181,138,59,0.20)
    val borderStrong = Color(0x59B58A3B) // rgba(181,138,59,0.35)
}

/** Color set an individual screen reads from, resolved for the active theme. */
data class AppColors(
    val bgPrimary: Color,
    val bgSecondary: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val surfaceHighlight: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val goldPrimary: Color,
    val goldSecondary: Color,
    val goldSoft: Color,
    val sacredAccent: Color,
    val borderSubtle: Color,
    val borderStrong: Color,
    val isDark: Boolean,
)

fun cosmosColors() = AppColors(
    bgPrimary = CosmosPalette.bgPrimary,
    bgSecondary = CosmosPalette.bgSecondary,
    surface = CosmosPalette.surface,
    surfaceElevated = CosmosPalette.surfaceElevated,
    surfaceHighlight = CosmosPalette.surfaceHighlight,
    textPrimary = CosmosPalette.textPrimary,
    textSecondary = CosmosPalette.textSecondary,
    textMuted = CosmosPalette.textMuted,
    goldPrimary = CosmosPalette.goldPrimary,
    goldSecondary = CosmosPalette.goldSecondary,
    goldSoft = CosmosPalette.goldSoft,
    sacredAccent = CosmosPalette.sacredAccent,
    borderSubtle = CosmosPalette.borderSubtle,
    borderStrong = CosmosPalette.borderStrong,
    isDark = true,
)

fun parchmentColors() = AppColors(
    bgPrimary = ParchmentPalette.bgPrimary,
    bgSecondary = ParchmentPalette.bgSecondary,
    surface = ParchmentPalette.surface,
    surfaceElevated = ParchmentPalette.surfaceElevated,
    surfaceHighlight = ParchmentPalette.surfaceHighlight,
    textPrimary = ParchmentPalette.textPrimary,
    textSecondary = ParchmentPalette.textSecondary,
    textMuted = ParchmentPalette.textMuted,
    goldPrimary = ParchmentPalette.goldPrimary,
    goldSecondary = ParchmentPalette.goldSecondary,
    goldSoft = ParchmentPalette.goldSoft,
    sacredAccent = ParchmentPalette.sacredAccent,
    borderSubtle = ParchmentPalette.borderSubtle,
    borderStrong = ParchmentPalette.borderStrong,
    isDark = false,
)
