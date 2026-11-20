package com.tredevastro.app.ui.screens.horoscope

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.HOUSE_MEANINGS
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.data.ZODIAC_SIGNS
import com.tredevastro.app.data.ZodiacSign
import com.tredevastro.app.data.ordinal
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.HoroscopeBody
import com.tredevastro.app.network.HoroscopePeriodBody
import com.tredevastro.app.network.dto.TransitDto
import com.tredevastro.app.network.dto.UpcomingTransitDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.DarkButton
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif

// Exact port of web/frontend/src/pages/calculators/CalculatorPages.tsx's
// HoroscopePage() — same periods, same forecast categories/houses, same
// benefic/malefic sets, same period->planet-subset rules. Kept in sync by
// hand; there's no shared token source between the web and native apps.

private data class PeriodTab(val key: String, val label: String, val apiPeriod: String?)

private val PERIODS = listOf(
    PeriodTab("daily", "Daily", null),
    PeriodTab("weekly", "Weekly", "weekly"),
    PeriodTab("weekly-love", "Weekly Love", "weekly"),
    PeriodTab("monthly", "Monthly", "monthly"),
    PeriodTab("half-year", "Half-Year", "half-year"),
    PeriodTab("full-year", "Full Year", "full-year"),
)

private data class ForecastCategory(val label: String, val emoji: String, val houses: List<Int>)

private val FORECAST_CATEGORIES = listOf(
    ForecastCategory("Love & Relationships", "💞", listOf(5, 7)),
    ForecastCategory("Career & Growth", "💼", listOf(10)),
    ForecastCategory("Health & Wellness", "🌿", listOf(1, 6)),
    ForecastCategory("Finance & Gains", "💰", listOf(2, 11)),
)

private val NATURAL_BENEFIC = setOf("jupiter", "venus", "moon")
private val NATURAL_MALEFIC = setOf("saturn", "mars", "sun", "rahu", "ketu")

private val PERIOD_RELEVANT_PLANETS: Map<String, List<String>?> = mapOf(
    "daily" to null,
    "weekly" to listOf("sun", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"),
    "weekly-love" to listOf("sun", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"),
    "monthly" to listOf("sun", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"),
    "half-year" to listOf("mars", "jupiter", "saturn", "rahu", "ketu"),
    "full-year" to listOf("mars", "jupiter", "saturn", "rahu", "ketu"),
)

private val FORECAST_HEADING = mapOf(
    "daily" to "Today's Forecast",
    "weekly" to "This Week's Forecast",
    "weekly-love" to "This Week's Forecast",
    "monthly" to "This Month's Forecast",
    "half-year" to "This Half-Year's Forecast",
    "full-year" to "This Year's Forecast",
)

private val RASHI_ORDER = ZODIAC_SIGNS.map { it.eng }

private fun houseFromRashi(rashiEng: String, moonRashiIndex0: Int): Int {
    val idx = RASHI_ORDER.indexOf(rashiEng)
    if (idx == -1) return 0
    return ((idx - moonRashiIndex0 + 12) % 12) + 1
}

private fun buildForecastReading(
    houses: List<Int>,
    transits: List<TransitDto>,
    upcoming: List<UpcomingTransitDto>,
    moonRashiIndex0: Int,
): String {
    val inPlay = transits.filter { it.house in houses }
    val currentSentences = inPlay.map { t ->
        val meta = PLANET_META[t.id]
        val name = meta?.name ?: t.id
        val quality = meta?.quality?.lowercase() ?: ""
        val retro = if (t.retrograde) " (retrograde — go slow here)" else ""
        "$name in your ${ordinal(t.house)} house brings $quality$retro."
    }
    val upcomingSentences = upcoming
        .map { it to houseFromRashi(it.toRashi, moonRashiIndex0) }
        .filter { (_, house) -> house in houses }
        .map { (ev, house) ->
            val meta = PLANET_META[ev.planetId]
            "${meta?.name ?: ev.planetId} enters your ${ordinal(house)} house around ${ev.date.take(10)}."
        }
    val sentences = currentSentences + upcomingSentences
    return if (sentences.isNotEmpty()) sentences.joinToString(" ") else "Nothing major here right now."
}

private data class HoroscopeData(
    val moonSignRashi: String,
    val date: String,
    val transits: List<TransitDto>,
    val upcomingTransits: List<UpcomingTransitDto> = emptyList(),
)

@Composable
fun HoroscopeScreen() {
    val colors = LocalAppColors.current
    var selectedSignIndex by remember { mutableIntStateOf(0) }
    var periodIndex by remember { mutableIntStateOf(0) }
    val sign = ZODIAC_SIGNS[selectedSignIndex]
    val period = PERIODS[periodIndex]

    var data by remember { mutableStateOf<HoroscopeData?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableStateOf(0) }
    var breakdownExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(sign.eng, period.key, reloadKey) {
        data = null
        errorMessage = null
        val result = if (period.apiPeriod == null) {
            safeApiCall { ApiClient.service.getDailyHoroscope(HoroscopeBody(sign.eng)) }
        } else {
            safeApiCall { ApiClient.service.getHoroscopePeriod(HoroscopePeriodBody(sign.eng, period.apiPeriod)) }
        }
        when (result) {
            is ApiResult.Success -> {
                val value = result.data
                data = if (value is com.tredevastro.app.network.dto.HoroscopePeriodDto) {
                    HoroscopeData(value.moonSignRashi, value.date, value.transits, value.upcomingTransits)
                } else {
                    val daily = value as com.tredevastro.app.network.dto.DailyHoroscopeDto
                    HoroscopeData(daily.moonSignRashi, daily.date, daily.transits)
                }
            }
            is ApiResult.Failure -> errorMessage = result.message
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        ) {
            item {
                HeroBanner(
                    title = tr("Free Horoscopes"),
                    subtitle = tr("Real transits, read against your Moon Sign"),
                    iconRes = ZODIAC_SIGNS[selectedSignIndex].iconRes,
                    modifier = Modifier.padding(bottom = 16.dp),
                )
            }

            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text(tr("RASHI RASHIPHAL"), color = colors.goldPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
                    Text("✦ ❖ ✦", color = colors.goldPrimary, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                    Text(
                        tr("Real, freshly-computed planetary transits, read against your Moon Sign — not a canned prediction."),
                        color = colors.textSecondary,
                        fontSize = 12.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
                    )
                }
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                    items(PERIODS.size) { index ->
                        val tab = PERIODS[index]
                        val selected = index == periodIndex
                        Text(
                            tr(tab.label),
                            color = if (selected) colors.bgPrimary else colors.textSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (selected) colors.goldPrimary else Color.Transparent)
                                .clickable { periodIndex = index; breakdownExpanded = false }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                }
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                    items(ZODIAC_SIGNS.size) { index ->
                        SignChip(sign = ZODIAC_SIGNS[index], selected = index == selectedSignIndex, onClick = { selectedSignIndex = index })
                    }
                }
            }

            item { SignDetailCard(sign = sign, modifier = Modifier.padding(bottom = 16.dp)) }

            val current = data
            if (current == null) {
                if (errorMessage != null) {
                    item { ErrorBlock(message = errorMessage ?: "", onRetry = { reloadKey++ }) }
                } else {
                    item { LoadingBlock() }
                }
            } else {
                item {
                    Text(
                        tr("Real planetary transits for ${current.date}, counted as houses from ${sign.eng} (treated as your Moon Sign) — the standard Vedic approach for rashi-based predictions."),
                        color = colors.textSecondary,
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(bottom = 14.dp),
                    )
                }

                item {
                    val relevant = PERIOD_RELEVANT_PLANETS[period.key]
                    val forecastTransits = if (relevant != null) current.transits.filter { it.id in relevant } else current.transits
                    Column(modifier = Modifier.padding(bottom = 16.dp)) {
                        Text(
                            tr(FORECAST_HEADING[period.key] ?: "Forecast"),
                            color = colors.goldPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 10.dp),
                        )
                        FORECAST_CATEGORIES.chunked(2).forEach { row ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                row.forEach { cat ->
                                    ForecastCard(
                                        category = cat,
                                        text = buildForecastReading(cat.houses, forecastTransits, current.upcomingTransits, selectedSignIndex),
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                            androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(10.dp))
                        }
                    }
                }

                item {
                    Column(modifier = Modifier.padding(bottom = 16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { breakdownExpanded = !breakdownExpanded },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                tr("Full technical transit breakdown"),
                                color = colors.goldPrimary,
                                fontSize = 13.sp,
                                modifier = Modifier.weight(1f),
                            )
                            Icon(
                                if (breakdownExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                                contentDescription = null,
                                tint = colors.goldPrimary,
                            )
                        }
                        if (breakdownExpanded) {
                            val sorted = remember(current) { current.transits.sortedBy { it.house } }
                            Column(modifier = Modifier.padding(top = 10.dp)) {
                                sorted.forEach { t -> TransitRow(transit = t) }
                            }
                            if (current.upcomingTransits.isNotEmpty()) {
                                Text(
                                    tr("Upcoming Sign Changes This Period"),
                                    color = colors.goldPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(top = 18.dp, bottom = 8.dp),
                                )
                                current.upcomingTransits.forEach { ev -> UpcomingRow(event = ev) }
                            }
                            Text(
                                tr("Dot colors show each planet's classical natural temperament (green = benefic, red = malefic, grey = neutral) — a fixed classical property of the planet itself, not a verdict on today specifically."),
                                color = colors.textMuted,
                                fontSize = 11.sp,
                                lineHeight = 16.sp,
                                modifier = Modifier.padding(top = 14.dp),
                            )
                        }
                    }
                }

                item { AstrologerCtaCard() }
            }
        }
    }
}

@Composable
private fun SignChip(sign: ZodiacSign, selected: Boolean, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(if (selected) colors.goldPrimary.copy(alpha = 0.15f) else colors.surface),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(sign.iconRes),
                contentDescription = sign.eng,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(38.dp),
            )
        }
        Text(
            sign.eng,
            color = if (selected) colors.goldPrimary else colors.textMuted,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun SignDetailCard(sign: ZodiacSign, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text(tr(sign.sanskrit), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
            Text(tr("${sign.eng} Moon Sign"), color = colors.textSecondary, fontSize = 12.sp)

            Row(modifier = Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SpecBox(label = "Ruling Graha", value = sign.rulingGraha, modifier = Modifier.weight(1f))
                SpecBox(label = "Element", value = sign.element, modifier = Modifier.weight(1f))
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .background(colors.bgSecondary, RoundedCornerShape(10.dp))
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                ) {
                    Text(tr("Traditional Key"), color = colors.textMuted, fontSize = 10.sp)
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                        Image(painter = painterResource(sign.iconRes), contentDescription = null, modifier = Modifier.size(14.dp))
                        Text(tr("Rashi"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SpecBox(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Text(tr(label), color = colors.textMuted, fontSize = 10.sp)
        Text(tr(value), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun ForecastCard(category: ForecastCategory, text: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .background(colors.goldPrimary.copy(alpha = 0.05f), RoundedCornerShape(8.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(category.emoji, fontSize = 15.sp)
            Text(tr(category.label), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, modifier = Modifier.padding(start = 6.dp))
        }
        Text(tr(text), color = colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
private fun TransitRow(transit: TransitDto) {
    val colors = LocalAppColors.current
    val meta = PLANET_META[transit.id]
    val dotColor = when {
        transit.id in NATURAL_BENEFIC -> Color(0xFF4CAF7D)
        transit.id in NATURAL_MALEFIC -> Color(0xFFC85A5A)
        else -> Color(0xFF9A9A9A)
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(modifier = Modifier.padding(top = 6.dp).size(8.dp).background(dotColor, CircleShape))
        Column(modifier = Modifier.weight(1f).padding(start = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (meta?.iconRes != null) {
                    Image(painter = painterResource(meta.iconRes), contentDescription = null, modifier = Modifier.size(16.dp))
                } else {
                    Text(meta?.symbol ?: "", color = colors.textPrimary, fontSize = 14.sp)
                }
                Text(
                    tr("${meta?.name ?: transit.id} in ${transit.rashi}"),
                    color = colors.textPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(start = 6.dp),
                )
                if (transit.retrograde) {
                    Text(
                        tr("℞ Retrograde"),
                        color = Color(0xFFC85A5A),
                        fontSize = 10.sp,
                        modifier = Modifier
                            .padding(start = 6.dp)
                            .background(Color(0xFFC85A5A).copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 6.dp, vertical = 1.dp),
                    )
                }
            }
            Text(
                tr("${ordinal(transit.house)} house — ${HOUSE_MEANINGS[transit.house] ?: ""}"),
                color = colors.textMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun UpcomingRow(event: UpcomingTransitDto) {
    val colors = LocalAppColors.current
    val meta = PLANET_META[event.planetId]
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f, fill = false)) {
            if (meta?.iconRes != null) {
                Image(painter = painterResource(meta.iconRes), contentDescription = null, modifier = Modifier.size(14.dp))
            } else {
                Text(meta?.symbol ?: "", color = colors.textPrimary, fontSize = 12.sp)
            }
            Text(
                "${meta?.name ?: event.planetId}: ${event.fromRashi} → ${event.toRashi}",
                color = colors.textPrimary,
                fontSize = 12.sp,
                modifier = Modifier.padding(start = 6.dp),
            )
        }
        Text(event.date.take(10), color = colors.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun AstrologerCtaCard(modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(44.dp).background(colors.goldPrimary.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("A", color = colors.goldPrimary, fontWeight = FontWeight.Bold, fontFamily = NotoSerif, fontSize = 18.sp)
            }
            Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(tr("Want a full reading?"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(tr("Talk to a live Vedic astrologer"), color = colors.textMuted, fontSize = 11.sp)
            }
            DarkButton(text = tr("Talk"), onClick = {}, fillWidth = false, compact = true, leadingIcon = Icons.Filled.Call)
        }
    }
}
