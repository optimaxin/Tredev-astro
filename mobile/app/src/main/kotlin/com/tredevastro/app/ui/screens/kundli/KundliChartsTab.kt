package com.tredevastro.app.ui.screens.kundli

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.DIVISIONAL_ORDER
import com.tredevastro.app.data.VARGA_LABELS
import com.tredevastro.app.data.rashiIndexOf
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.theme.LocalAppColors

/** Ports the website's Charts tab: D1+D9 featured side by side, then every
 * other divisional chart (D2-D60) plus Chandra and Bhav Chalit as small
 * tiles — all real data from the same kundli-full response, just a
 * different rendering of it (see resolveChart() in KundliSection.tsx). */
@Composable
internal fun KundliChartsTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val kundli = result.kundli

    Column(modifier = modifier.fillMaxWidth()) {
        Text2(
            tr("Each square shows the RASHI NUMBER occupying that house (from your real Ascendant); planet abbreviations tenant their own house. D9 (Navamsa) reveals the deeper strength of what D1 promises."),
        )

        Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ChartTile(
                label = tr("D1 — Rashi (Birth Chart)"),
                ascendantRashiIndex = remember(kundli) { rashiIndexOf(kundli.ascendant.rashi) },
                housePlanets = remember(kundli) { houseToPlanets(kundli) },
                modifier = Modifier.weight(1f),
            )
            ChartTile(
                label = tr("D9 — Navamsa"),
                ascendantRashiIndex = remember(result) { rashiIndexOf(result.navamsaChart.ascendant.rashi) },
                housePlanets = remember(result) { vargaHouseToPlanets(result.navamsaChart.planets) },
                modifier = Modifier.weight(1f),
            )
        }

        SectionLabel(tr("Chandra Kundli (Moon Chart)"))
        val chandra = result.chandraChart
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ChartTile(
                label = tr("Chandra"),
                ascendantRashiIndex = remember(chandra) { rashiIndexOf(chandra.moonRashi) },
                housePlanets = remember(chandra) {
                    chandra.planets.mapNotNull { p -> PLANET_ABBR_CHARTS[p.id]?.let { p.house to it } }.groupBy({ it.first }, { it.second })
                },
                modifier = Modifier.weight(1f),
            )
            ChartTile(
                label = tr("Bhav Chalit"),
                ascendantRashiIndex = remember(result) { rashiIndexOf(result.bhavChalit.ascendant.rashi) },
                housePlanets = remember(result) { vargaHouseToPlanets(result.bhavChalit.planets) },
                modifier = Modifier.weight(1f),
            )
        }

        SectionLabel(tr("All Divisional Charts"))
        DIVISIONAL_ORDER.chunked(2).forEach { pair ->
            Row(modifier = Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                pair.forEach { key ->
                    val varga = result.vargaCharts[key]
                    if (varga != null) {
                        ChartTile(
                            label = tr(VARGA_LABELS[key] ?: key),
                            ascendantRashiIndex = remember(varga) { rashiIndexOf(varga.ascendant.rashi) },
                            housePlanets = remember(varga) { vargaHouseToPlanets(varga.planets) },
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
                    }
                }
                if (pair.size == 1) androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

private val PLANET_ABBR_CHARTS = mapOf(
    "sun" to "Su", "moon" to "Mo", "mars" to "Ma", "mercury" to "Me",
    "jupiter" to "Ju", "venus" to "Ve", "saturn" to "Sa", "rahu" to "Ra", "ketu" to "Ke",
)

@Composable
private fun ChartTile(label: String, ascendantRashiIndex: Int, housePlanets: Map<Int, List<String>>, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            KundliChart(onHouseSelected = {}, ascendantRashiIndex = ascendantRashiIndex, housePlanets = housePlanets)
            Text2(label, top = 8, small = true, center = true)
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    val colors = LocalAppColors.current
    androidx.compose.material3.Text(
        text,
        color = colors.textPrimary,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        modifier = Modifier.padding(top = 24.dp, bottom = 4.dp),
    )
}

@Composable
private fun Text2(text: String, top: Int = 0, small: Boolean = false, center: Boolean = false) {
    val colors = LocalAppColors.current
    androidx.compose.material3.Text(
        text,
        color = if (small) colors.textPrimary else colors.textSecondary,
        fontSize = if (small) 11.sp else 12.sp,
        fontWeight = if (small) FontWeight.Medium else FontWeight.Normal,
        textAlign = if (center) androidx.compose.ui.text.style.TextAlign.Center else androidx.compose.ui.text.style.TextAlign.Start,
        lineHeight = 17.sp,
        modifier = Modifier.fillMaxWidth().padding(top = top.dp),
    )
}
