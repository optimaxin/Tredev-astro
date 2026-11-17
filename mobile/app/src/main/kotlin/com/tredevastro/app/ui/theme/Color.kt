package com.tredevastro.app.ui.theme

import androidx.compose.ui.graphics.Color

// Ports the CSS custom properties from web/frontend/src/styles/globals.css
// so both apps read as one brand. Keep these two files in sync by hand —
// there's no shared token source between the web and native codebases.

object CosmosPalette {
    val bgPrimary = Color(0xFF060914)
    val bgSecondary = Color(0xFF080C1C)
    val surface = Color(0xFF0C1125)
    val surfaceElevated = Color(0xFF11172C)
    val surfaceHighlight = Color(0xFF151B31)

    val textPrimary = Color(0xFFF1E9DC)
    val textSecondary = Color(0xFFB9B3A8)
    val textMuted = Color(0xFF7F7B78)

    val goldPrimary = Color(0xFFC7A15A)
    val goldSecondary = Color(0xFF9F7B3D)
    val goldSoft = Color(0xFFD2B978)

    val sacredAccent = Color(0xFFA85A32)

    val borderSubtle = Color(0x29C7A15A)
    val borderStrong = Color(0x47C7A15A)

    val cloudSaffron = Color(0xD9C56A27)
    val cloudIndigo = Color(0xE61C2B63)
    val cloudMaroon = Color(0xBF781626)
}

object ParchmentPalette {
    val bgPrimary = Color(0xFFF5F0E7)
    val bgSecondary = Color(0xFFECE4D6)
    val surface = Color(0xFFFAF7F0)
    val surfaceElevated = Color(0xFFF2EBD9)
    val surfaceHighlight = Color(0xFFE8DEC8)

    val textPrimary = Color(0xFF182333)
    val textSecondary = Color(0xFF68717A)
    val textMuted = Color(0xFF8C8A84)

    val goldPrimary = Color(0xFFB58A3B)
    val goldSecondary = Color(0xFF8F6A22)
    val goldSoft = Color(0xFFD0B06A)

    val sacredAccent = Color(0xFFA85B2D)

    val borderSubtle = Color(0x2EB58A3B)
    val borderStrong = Color(0x59B58A3B)

    val cloudSaffron = Color(0x23F49650)
    val cloudIndigo = Color(0x19EB7828)
    val cloudMaroon = Color(0x14D76432)
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
    val cloudSaffron: Color,
    val cloudIndigo: Color,
    val cloudMaroon: Color,
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
    cloudSaffron = CosmosPalette.cloudSaffron,
    cloudIndigo = CosmosPalette.cloudIndigo,
    cloudMaroon = CosmosPalette.cloudMaroon,
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
    cloudSaffron = ParchmentPalette.cloudSaffron,
    cloudIndigo = ParchmentPalette.cloudIndigo,
    cloudMaroon = ParchmentPalette.cloudMaroon,
    isDark = false,
)
