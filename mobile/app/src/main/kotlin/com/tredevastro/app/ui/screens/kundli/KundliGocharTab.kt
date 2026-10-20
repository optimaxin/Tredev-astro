package com.tredevastro.app.ui.screens.kundli

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.HoroscopeBody
import com.tredevastro.app.network.dto.DailyHoroscopeDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.i18n.tr

/** Ports the website's Gochar tab — the one tab that isn't in kundli-full at
 * all (KundliSection.tsx fetches it lazily on first visit): today's real
 * transits compared against the natal chart, once from the Lagna and once
 * from the Moon, via the same /daily-horoscope endpoint the standalone
 * Daily Horoscope tool uses. Also surfaces the Sade Sati / Rahu-Ketu
 * transit cards already sitting in kundli-full's doshas bundle. */
@Composable
internal fun KundliGocharTab(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val ascendantRashi = result.kundli.ascendant.rashi
    val moonRashi = result.kundli.planets.find { it.id == "moon" }?.rashi ?: ascendantRashi

    var fromLagna by remember { mutableStateOf<DailyHoroscopeDto?>(null) }
    var fromMoon by remember { mutableStateOf<DailyHoroscopeDto?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(ascendantRashi, moonRashi) {
        errorMessage = null
        when (val lagnaResult = safeApiCall { ApiClient.service.getDailyHoroscope(HoroscopeBody(ascendantRashi)) }) {
            is ApiResult.Success -> fromLagna = lagnaResult.data
            is ApiResult.Failure -> errorMessage = lagnaResult.message
        }
        when (val moonResult = safeApiCall { ApiClient.service.getDailyHoroscope(HoroscopeBody(moonRashi)) }) {
            is ApiResult.Success -> fromMoon = moonResult.data
            is ApiResult.Failure -> Unit
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        val sadeSati = result.doshas.sadeSati
        if (sadeSati.active) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                    Text(tr("Sade Sati is active"), color = colors.sacredAccent, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(
                        tr("Phase: ${sadeSati.phase?.replaceFirstChar { it.uppercase() } ?: "—"} · Saturn transiting ${sadeSati.saturnTransitRashi}"),
                        color = colors.textSecondary,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }
        val rk = result.doshas.rahuKetuTransit
        GlassCard(modifier = Modifier.fillMaxWidth().padding(top = if (sadeSati.active) 12.dp else 0.dp)) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(tr("Rahu-Ketu Transit"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    tr("Rahu in ${rk.rahuTransitRashi} (house ${rk.rahuHouseFromMoon} from Moon) · Ketu in ${rk.ketuTransitRashi} (house ${rk.ketuHouseFromMoon} from Moon)"),
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        if (errorMessage != null) {
            ErrorBlock(message = errorMessage ?: "", onRetry = {}, modifier = Modifier.padding(top = 16.dp))
        }

        val lagna = fromLagna
        val moon = fromMoon
        if (lagna == null) {
            LoadingBlock(modifier = Modifier.padding(top = 20.dp))
        } else {
            Text(tr("Today's Transits — from Lagna"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
            GocharGrid(natal = result.kundli.planets.associate { it.id to (it.rashi to it.house) }, transits = lagna.transits)

            if (moon != null) {
                Text(tr("Today's Transits — from Moon"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
                GocharGrid(natal = result.kundli.planets.associate { it.id to (it.rashi to it.house) }, transits = moon.transits)
            }
        }
    }
}

@Composable
private fun GocharGrid(natal: Map<String, Pair<String, Int>>, transits: List<com.tredevastro.app.network.dto.TransitDto>) {
    val colors = LocalAppColors.current
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            transits.forEach { t ->
                val name = PLANET_META[t.id]?.name ?: t.id.replaceFirstChar { it.uppercase() }
                val (natalRashi, natalHouse) = natal[t.id] ?: ("—" to 0)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(name, color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                    Text(tr("Natal: $natalRashi (H$natalHouse)"), color = colors.textMuted, fontSize = 11.sp, modifier = Modifier.weight(1.2f))
                    Text(
                        tr("Now: ${t.rashi} (H${t.house})${if (t.retrograde) " ℞" else ""}"),
                        color = colors.goldPrimary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1.2f),
                    )
                }
            }
        }
    }
}
