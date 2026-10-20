package com.tredevastro.app.ui.screens.alltools

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.navigation.Routes
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif

private data class AllTool(val name: String, val route: String? = null)
private data class ToolCategory(val label: String, val tools: List<AllTool>)

// Ports web/frontend/src/data/mockData.ts's FREE_TOOLS_CATEGORIES — every
// free tool the website lists, grouped the same way. Several labels share
// one route on purpose — the website's own TOOL_ROUTES does the same thing
// (e.g. "My Numerology" and "Life Path Number" are the same calculation).
// Only Vastu Calculator has no backend endpoint at all, so that's the one
// real "Soon".
private val CATEGORIES = listOf(
    ToolCategory(
        "Daily Astrology",
        listOf(
            AllTool("Daily Horoscope", Routes.HOROSCOPE),
            AllTool("Weekly Horoscope", Routes.HOROSCOPE),
            AllTool("Monthly Horoscope", Routes.HOROSCOPE),
            AllTool("Weekly Love Horoscope", Routes.HOROSCOPE),
            AllTool("Half-Yearly Horoscope", Routes.HOROSCOPE),
            AllTool("Yearly Horoscope", Routes.HOROSCOPE),
            AllTool("Today's Panchang", Routes.PANCHANG),
            AllTool("Muhurat Finder", Routes.MUHURAT_FINDER),
            AllTool("Choghadiya", Routes.CHOGHADIYA),
            AllTool("Abhijit Muhurat", Routes.ABHIJIT_MUHURAT),
        ),
    ),
    ToolCategory(
        "Birth",
        listOf(
            AllTool("Free Kundli", Routes.KUNDLI),
            AllTool("Moon Sign Calculator", Routes.NAKSHATRA_FINDER),
            AllTool("Nakshatra Finder", Routes.NAKSHATRA_FINDER),
            AllTool("Lucky Color & Date", Routes.LUCKY),
            AllTool("Baby Name Calculator", Routes.BABY_NAME),
            AllTool("Lal Kitab", Routes.LAL_KITAB),
        ),
    ),
    ToolCategory(
        "Compatibility",
        listOf(
            AllTool("Kundli Matching", Routes.KUNDLI_MATCHING),
            AllTool("Love Compatibility", Routes.KUNDLI_MATCHING),
            AllTool("FLAMES", Routes.FLAMES),
        ),
    ),
    ToolCategory(
        "Doshas",
        listOf(
            AllTool("Kaal Sarp Dosha", Routes.KAAL_SARP),
            AllTool("Pitra Dosha", Routes.PITRA_DOSHA),
            AllTool("Sade Sati", Routes.SADE_SATI),
            AllTool("Rahu Ketu Transit", Routes.RAHU_KETU_TRANSIT),
        ),
    ),
    ToolCategory(
        "Numerology",
        listOf(
            AllTool("My Numerology", Routes.NUMEROLOGY),
            AllTool("Life Path Number", Routes.NUMEROLOGY),
            AllTool("Name Numerology", Routes.NUMEROLOGY),
            AllTool("Numerology Match", Routes.NUMEROLOGY_MATCH),
            AllTool("Numerology Horoscope", Routes.NUMEROLOGY_HOROSCOPE),
            AllTool("Chinese Zodiac", Routes.CHINESE_ZODIAC),
        ),
    ),
    ToolCategory("Vastu", listOf(AllTool("Vastu Calculator"))),
)

@Composable
fun AllToolsScreen(onNavigate: (String) -> Unit, onBack: () -> Unit) {
    val colors = LocalAppColors.current

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = colors.textPrimary)
                    }
                    Column(modifier = Modifier.padding(start = 4.dp)) {
                        Text(tr("FREE TOOLS"), color = colors.goldPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
                        Text(tr("All Vedic Tools"), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
                    }
                }
            }

            CATEGORIES.forEach { category ->
                item {
                    Text(
                        tr(category.label),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 20.dp, bottom = 10.dp),
                    )
                }
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            category.tools.forEach { tool -> ToolRow(tool = tool, onClick = { tool.route?.let(onNavigate) }) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolRow(tool: AllTool, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = tool.route != null, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            tr(tool.name),
            color = if (tool.route != null) colors.textPrimary else colors.textMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
        )
        if (tool.route != null) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = colors.goldPrimary)
        } else {
            Text(
                tr("Soon"),
                color = colors.textMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .background(colors.bgSecondary, RoundedCornerShape(999.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}
