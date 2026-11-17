package com.tredevastro.app.data

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material.icons.filled.Work
import androidx.compose.ui.graphics.vector.ImageVector
import com.tredevastro.app.R
import com.tredevastro.app.navigation.Routes

/** A tappable tile with a title + optional subtitle. */
data class Tool(
    val label: String,
    val subtitle: String = "",
    val icon: ImageVector? = null,
    val iconRes: Int? = null,
    val route: String? = null,
)

/** The primary big-icon grid right under the Home greeting — every entry here
 * is one tap from the greeting, on purpose: this app's users are older,
 * non-technical folks (per explicit product direction), so the home screen
 * leads with large, plainly-labelled shortcuts instead of a "browse by
 * topic" pitch. */
val HOME_FEATURE_GRID = listOf(
    Tool("Kundli", iconRes = R.drawable.icon_kundli, route = Routes.KUNDLI),
    Tool("Panchang", iconRes = R.drawable.icon_panchang, route = Routes.PANCHANG),
    Tool("Horoscope", iconRes = R.drawable.icon_astrology, route = Routes.HOROSCOPE),
    Tool("Gemstone", icon = Icons.Filled.Diamond, route = Routes.GEMSTONE),
    Tool("Matching", icon = Icons.Filled.VolunteerActivism, route = Routes.KUNDLI_MATCHING),
    Tool("More Tools", icon = Icons.Filled.MoreHoriz, route = Routes.ALL_TOOLS),
)

/** The horizontal "Reports" strip — reuses real tools where one already
 * covers the report (Kundli, Matching); the rest are the website's report
 * catalog and show "coming soon" until built here. */
val REPORT_CATEGORIES = listOf(
    Tool("Kundli Report", iconRes = R.drawable.icon_kundli, route = Routes.KUNDLI),
    Tool("Love Report", icon = Icons.Filled.Favorite, route = Routes.KUNDLI_MATCHING),
    Tool("Marriage Report", icon = Icons.Filled.Favorite, route = Routes.KUNDLI_MATCHING),
    Tool("Career Report", icon = Icons.Filled.Work),
    Tool("Health Report", icon = Icons.Filled.Spa),
)
