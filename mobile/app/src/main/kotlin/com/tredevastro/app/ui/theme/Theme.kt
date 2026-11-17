package com.tredevastro.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.dp

enum class ThemeMode { Dark, Light }

val LocalAppColors = staticCompositionLocalOf { cosmosColors() }

val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

@Composable
fun TredevAstroTheme(
    themeMode: ThemeMode = ThemeMode.Dark,
    content: @Composable () -> Unit,
) {
    val appColors = if (themeMode == ThemeMode.Dark) cosmosColors() else parchmentColors()

    val materialScheme = if (themeMode == ThemeMode.Dark) {
        darkColorScheme(
            primary = appColors.goldPrimary,
            secondary = appColors.sacredAccent,
            background = appColors.bgPrimary,
            surface = appColors.surface,
            onPrimary = appColors.bgPrimary,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
        )
    } else {
        lightColorScheme(
            primary = appColors.goldPrimary,
            secondary = appColors.sacredAccent,
            background = appColors.bgPrimary,
            surface = appColors.surface,
            onPrimary = appColors.bgPrimary,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
        )
    }

    CompositionLocalProvider(LocalAppColors provides appColors) {
        MaterialTheme(
            colorScheme = materialScheme,
            typography = AppTypography,
            shapes = AppShapes,
            content = content,
        )
    }
}
