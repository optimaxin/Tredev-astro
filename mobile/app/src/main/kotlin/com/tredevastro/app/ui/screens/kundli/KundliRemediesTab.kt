package com.tredevastro.app.ui.screens.kundli

import androidx.compose.foundation.background
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
import com.tredevastro.app.network.dto.GemstoneResultDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.RudrakshaResultDto
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.i18n.tr

/** Ports the website's Remedies tab: the 3 gemstone recommendations plus
 * Rudraksha — same data the Gemstone tool already models, just embedded
 * here from kundli-full instead of a fresh /kundli-full-lite-style call.
 * (The site's Remedies tab also shows a client-computed Vastu reading —
 * getVastuChartReading() in vastuKundli.ts, not sourced from the API —
 * that's deferred, not faked, until it's ported separately.) */
@Composable
internal fun KundliRemediesTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(modifier = modifier.fillMaxWidth()) {
        Text(tr("Gemstone Recommendations"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(bottom = 10.dp))
        RemedyGemstoneCard(gemstone = result.gemstones.life)
        RemedyGemstoneCard(gemstone = result.gemstones.lucky, modifier = Modifier.padding(top = 10.dp))
        RemedyGemstoneCard(gemstone = result.gemstones.fortune, modifier = Modifier.padding(top = 10.dp))

        Text(tr("Rudraksha"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        RemedyRudrakshaCard(rudraksha = result.rudraksha)
    }
}

@Composable
private fun RemedyGemstoneCard(gemstone: GemstoneResultDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                gemstone.purpose,
                color = colors.goldPrimary,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.background(colors.goldPrimary.copy(alpha = 0.1f), RoundedCornerShape(999.dp)).padding(horizontal = 10.dp, vertical = 4.dp),
            )
            Text("${gemstone.gemstone} (${gemstone.sanskritName})", color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(top = 8.dp))
            Text(
                tr("Ruling planet: ${gemstone.rulingPlanet.replaceFirstChar { it.uppercase() }} · Metal: ${gemstone.metal} · Finger: ${gemstone.finger}"),
                color = colors.textSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(tr("Mantra: ${gemstone.mantra}"), color = colors.textSecondary, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
            Text(gemstone.reason, color = colors.textMuted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

@Composable
private fun RemedyRudrakshaCard(rudraksha: RudrakshaResultDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(tr("${rudraksha.mukhi} Mukhi Rudraksha"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Text(
                tr("Ruling planet: ${rudraksha.rulingPlanet.replaceFirstChar { it.uppercase() }} · Deity: ${rudraksha.deity}"),
                color = colors.textSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(rudraksha.benefits.joinToString(" · "), color = colors.goldPrimary, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            Text(rudraksha.howToWear, color = colors.textMuted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
            if (rudraksha.precautions.isNotEmpty()) {
                Text(
                    tr("Precautions: ${rudraksha.precautions.joinToString(", ")}"),
                    color = colors.textMuted,
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
