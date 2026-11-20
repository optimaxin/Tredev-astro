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
import com.tredevastro.app.network.dto.AntardashaPeriodDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.MahadashaPeriodDto
import com.tredevastro.app.network.dto.YoginiPeriodDto
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.util.formatIsoDate
import com.tredevastro.app.i18n.tr

private fun lordName(lord: String) = PLANET_META[lord.lowercase()]?.name ?: lord.replaceFirstChar { it.uppercase() }

/** Ports the website's Timeline tab: current Mahadasha (with its active
 * Antardasha + matched prediction text), current Yogini Dasha, and the
 * three doshas — all straight from kundli-full, no extra calls needed. */
@Composable
internal fun KundliTimelineTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current

    Column(modifier = modifier.fillMaxWidth()) {
        Text(tr("Vimshottari Mahadasha"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(bottom = 10.dp))
        val activeMahadasha = result.mahadashaTimeline.filter { it.active }
        if (activeMahadasha.isEmpty()) {
            Text(tr("No active Mahadasha found."), color = colors.textMuted, fontSize = 12.sp)
        }
        activeMahadasha.forEach { period ->
            MahadashaCard(period = period, predictionText = result.dashaPredictions.find { it.lord == period.lord }?.text)
        }

        Text(tr("Yogini Dasha"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        val activeYogini = result.yoginiDashaTimeline.filter { it.active }
        if (activeYogini.isEmpty()) {
            Text(tr("No active Yogini period found."), color = colors.textMuted, fontSize = 12.sp)
        }
        activeYogini.forEach { period -> YoginiCard(period = period) }

        Text(tr("Doshas"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        val doshas = result.doshas
        DoshaRow(
            label = "Kaal Sarp Dosha",
            present = doshas.kaalSarp.isKaalSarp,
            detail = tr("Rahu in ${doshas.kaalSarp.rahuRashi} · Ketu in ${doshas.kaalSarp.ketuRashi}"),
        )
        DoshaRow(
            label = "Sade Sati",
            present = doshas.sadeSati.active,
            detail = if (doshas.sadeSati.active) tr("Phase: ${doshas.sadeSati.phase?.replaceFirstChar { it.uppercase() } ?: "—"}") else tr("Not currently active"),
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun MahadashaCard(period: MahadashaPeriodDto, predictionText: String?) {
    val colors = LocalAppColors.current
    GlassCard(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(tr("${lordName(period.lord)} Mahadasha"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    tr("ACTIVE"),
                    color = colors.textPrimary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.background(colors.goldPrimary.copy(alpha = 0.15f), RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Text("${formatIsoDate(period.startsAt)} – ${formatIsoDate(period.endsAt)}", color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            if (predictionText != null) {
                Text(tr(predictionText), color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 10.dp))
            }
            val activeAntardasha = period.antardashas.filter { it.active }
            activeAntardasha.forEach { ad -> AntardashaRow(ad) }
        }
    }
}

@Composable
private fun AntardashaRow(ad: AntardashaPeriodDto) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 10.dp).background(colors.bgSecondary, RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(tr("${lordName(ad.lord)} Antardasha"), color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text("${formatIsoDate(ad.startsAt)} – ${formatIsoDate(ad.endsAt)}", color = colors.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun YoginiCard(period: YoginiPeriodDto) {
    val colors = LocalAppColors.current
    GlassCard(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(tr("${period.yogini} (Lord: ${lordName(period.lord)})"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text("${formatIsoDate(period.startsAt)} – ${formatIsoDate(period.endsAt)}", color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun DoshaRow(label: String, present: Boolean, detail: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val tint = if (present) colors.sacredAccent else androidx.compose.ui.graphics.Color(0xFF50C878)
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(tr(label), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    tr(if (present) "PRESENT" else "NOT PRESENT"),
                    color = tint,
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp,
                    modifier = Modifier.background(tint.copy(alpha = 0.12f), RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Text(detail, color = colors.textSecondary, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
}
