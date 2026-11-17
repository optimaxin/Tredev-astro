package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.dto.PanchangDto
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import com.tredevastro.app.util.formatIsoTime24h
import com.tredevastro.app.util.formatWindow24h

/** The Home preview of today's Panchang — real live data (same call the
 * Panchang tab makes), condensed into the hero-row + sun/moon + one
 * highlight shape the full tab uses, so this doesn't drift into its own
 * different-looking design again. */
@Composable
fun PanchangCard(panchang: PanchangDto?, onViewFull: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.WbSunny, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(18.dp))
                Text(
                    tr("Today's Panchang"),
                    color = colors.textPrimary,
                    fontFamily = NotoSerif,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    modifier = Modifier.weight(1f).padding(start = 8.dp),
                )
                Text(
                    tr("View Full"),
                    color = colors.goldPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable(onClick = onViewFull),
                )
            }

            if (panchang == null) {
                Text(tr("Loading…"), color = colors.textMuted, fontSize = 13.sp, modifier = Modifier.padding(top = 16.dp))
                return@Column
            }

            Row(modifier = Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                HeroMiniTile(label = tr("Tithi"), value = panchang.tithi.name, modifier = Modifier.weight(1f))
                HeroMiniTile(label = tr("Nakshatra"), value = panchang.nakshatra.name, modifier = Modifier.weight(1f))
                HeroMiniTile(label = tr("Moon Rashi"), value = panchang.moonRashi, modifier = Modifier.weight(1f))
            }

            Row(modifier = Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                SunTimeTile(icon = Icons.Filled.WbSunny, label = tr("Sunrise"), time = formatIsoTime24h(panchang.sunrise), modifier = Modifier.weight(1f))
                SunTimeTile(icon = Icons.Filled.NightsStay, label = tr("Sunset"), time = formatIsoTime24h(panchang.sunset), modifier = Modifier.weight(1f))
            }

            panchang.abhijitMuhurat?.let {
                PanchangHighlightRow(
                    dotColor = Color(0xFF50C878),
                    title = tr("Abhijit Muhurat"),
                    subtitle = tr("Supreme Auspicious Window"),
                    time = formatWindow24h(it),
                    tint = Color(0xFF50C878),
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
            panchang.rahuKaal?.let {
                PanchangHighlightRow(
                    dotColor = colors.sacredAccent,
                    title = tr("Rahu Kaal"),
                    subtitle = tr("Avoid Major Decisions"),
                    time = formatWindow24h(it),
                    tint = colors.sacredAccent,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun HeroMiniTile(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = colors.textMuted, fontSize = 10.sp)
        Text(value, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun SunTimeTile(icon: ImageVector, label: String, time: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(16.dp))
        Column(modifier = Modifier.padding(start = 8.dp)) {
            Text(label, color = colors.textMuted, fontSize = 10.sp)
            Text(time, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun PanchangHighlightRow(
    dotColor: Color,
    title: String,
    subtitle: String,
    time: String,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(tint.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.size(7.dp).background(dotColor, CircleShape))
        Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
            Text(title, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Text(subtitle, color = colors.textMuted, fontSize = 10.sp)
        }
        Text(time, color = colors.textPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}
