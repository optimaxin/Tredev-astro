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
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.YogaResultDto
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.i18n.tr

/** Ports the website's Predictions tab: Ascendant Predictions (description
 * + Personality/Physical/Health/Career/Relationship + Do's/Don'ts) and the
 * Yoga Combinations cards — all from kundli-full's ascendantPredictions/yogas. */
@Composable
internal fun KundliPredictionsTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val p = result.ascendantPredictions

    Column(modifier = modifier.fillMaxWidth()) {
        Text(tr("Ascendant Predictions"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(bottom = 10.dp))
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                Text(tr(p.description), color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp)
            }
        }

        listOf(
            "Personality" to p.personality,
            "Physical" to p.physical,
            "Health" to p.health,
            "Career" to p.career,
            "Relationship" to p.relationship,
        ).forEach { (title, text) -> PredictionParagraph(title = title, text = text, modifier = Modifier.padding(top = 10.dp)) }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DosDontsList(title = "Do's", items = p.dos, tint = androidx.compose.ui.graphics.Color(0xFF50C878), modifier = Modifier.weight(1f))
            DosDontsList(title = "Don'ts", items = p.donts, tint = colors.sacredAccent, modifier = Modifier.weight(1f))
        }

        Text(tr("Yoga Combinations"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
        result.yogas.forEach { yoga -> YogaCard(yoga = yoga, modifier = Modifier.padding(bottom = 10.dp)) }
    }
}

@Composable
private fun PredictionParagraph(title: String, text: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(tr(title), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Text(tr(text), color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun DosDontsList(title: String, items: List<String>, tint: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(tr(title), color = tint, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            items.forEach { item ->
                Text(tr("• $item"), color = colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
            }
        }
    }
}

@Composable
private fun YogaCard(yoga: YogaResultDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val tint = if (yoga.present) androidx.compose.ui.graphics.Color(0xFF50C878) else colors.textMuted
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(yoga.name, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    tr(if (yoga.present) "FORMED" else "NOT FORMED"),
                    color = tint,
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp,
                    modifier = Modifier.background(tint.copy(alpha = 0.12f), RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Text(tr(yoga.description), color = colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
        }
    }
}
