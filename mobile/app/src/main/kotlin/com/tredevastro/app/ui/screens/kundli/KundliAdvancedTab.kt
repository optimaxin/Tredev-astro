package com.tredevastro.app.ui.screens.kundli

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.PlanetShadbalaDto
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.theme.LocalAppColors

/** Ports the website's Advanced tab: Shadbala strength table, KP sub-lord
 * table + Ruling Planets, and the Sarvashtakavarga bindu grid — all
 * "technical, classical scoring... not required" per the site's own copy,
 * shown at the totals level the live web tabs actually render (the API's
 * fuller Shadbala per-component breakdown is only needed for the PDF's
 * matrix tables, which this port doesn't attempt — see KundliPdfExport). */
@Composable
internal fun KundliAdvancedTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(modifier = modifier.fillMaxWidth()) {
        Text(tr("Shadbala — Planetary Strength"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(bottom = 10.dp))
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                result.shadbala.planets.forEach { p -> ShadbalaRow(p) }
            }
        }

        Text(tr("KP — Ruling Planets"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        val rp = result.kp.rulingPlanets
        val rpFields = listOf(
            tr("Lagna Sign Lord") to rp.lagnaSignLord, tr("Lagna Star Lord") to rp.lagnaStarLord, tr("Lagna Sub Lord") to rp.lagnaSubLord,
            tr("Moon Sign Lord") to rp.moonSignLord, tr("Moon Star Lord") to rp.moonStarLord, tr("Moon Sub Lord") to rp.moonSubLord,
            tr("Day Lord") to rp.dayLord,
        )
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                rpFields.chunked(2).forEach { row ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { (label, value) -> KpTile(label = label, value = value, modifier = Modifier.weight(1f)) }
                        if (row.size == 1) androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
                    }
                    androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 10.dp))
                }
            }
        }

        Text(tr("KP Sub-Lord Table"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                result.kp.table.forEach { row -> KpRow(id = row.id, rashi = row.rashi, signLord = row.signLord, starLord = row.starLord, subLord = row.subLord) }
            }
        }

        Text(tr("Sarvashtakavarga (Total: ${result.ashtakavarga.sarvaTotal})"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                result.ashtakavarga.sarva.chunked(3).forEach { row ->
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { point -> KpTile(label = point.rashi, value = tr("${point.bindus} bindus"), modifier = Modifier.weight(1f)) }
                        repeat(3 - row.size) { androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ShadbalaRow(p: PlanetShadbalaDto) {
    val colors = LocalAppColors.current
    val name = PLANET_META[p.planet.lowercase()]?.name ?: p.planet.replaceFirstChar { it.uppercase() }
    val tint = if (p.isStrong) androidx.compose.ui.graphics.Color(0xFF50C878) else colors.sacredAccent
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(name, color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Text(tr("${"%.2f".format(p.rupas)} / ${"%.2f".format(p.minRequiredRupas)} rupas"), color = colors.textMuted, fontSize = 11.sp, modifier = Modifier.weight(1.2f))
        Text(
            tr(if (p.isStrong) "STRONG" else "WEAK"),
            color = tint,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.background(tint.copy(alpha = 0.12f), RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
        )
    }
}

@Composable
private fun KpRow(id: String, rashi: String, signLord: String, starLord: String, subLord: String) {
    val colors = LocalAppColors.current
    val label = PLANET_META[id.lowercase()]?.name ?: id.replaceFirstChar { it.uppercase() }
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(label, color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        Text(
            tr("$rashi · Sign: $signLord · Star: $starLord · Sub: $subLord"),
            color = colors.textMuted,
            fontSize = 11.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun KpTile(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier.background(colors.bgSecondary, RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(tr(label), color = colors.textMuted, fontSize = 10.sp)
        Text(tr(value), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
    }
}
