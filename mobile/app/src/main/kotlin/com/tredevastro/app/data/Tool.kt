package com.tredevastro.app.data

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.ui.graphics.vector.ImageVector
import com.tredevastro.app.navigation.Routes

/** Mirrors the site's nav/quick-tool set: Kundli, Horoscope, Panchang,
 * Astrologers, Academy, Store (web/frontend/src/components/Navigation).
 * `route` is null for tools that don't have a built screen yet. */
data class Tool(val label: String, val icon: ImageVector, val route: String? = null)

val HOME_TOOLS = listOf(
    Tool("Kundli", Icons.Filled.AutoAwesome, Routes.KUNDLI),
    Tool("Horoscope", Icons.Filled.WbSunny),
    Tool("Panchang", Icons.Filled.CalendarMonth),
    Tool("Astrologers", Icons.Filled.Groups, Routes.ASTROLOGERS),
    Tool("Academy", Icons.AutoMirrored.Filled.MenuBook),
    Tool("Store", Icons.Filled.Storefront),
)
