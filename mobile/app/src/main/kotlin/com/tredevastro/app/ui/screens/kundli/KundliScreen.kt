package com.tredevastro.app.ui.screens.kundli

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.data.rashiIndexOf
import com.tredevastro.app.data.rulingGrahaFor
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.BirthDetailsBody
import com.tredevastro.app.network.dto.GeocodeDto
import com.tredevastro.app.network.dto.KundliDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.PlaceAutocompleteField
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.util.formatIsoTime24h
import com.tredevastro.app.util.formatWindow24h
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

private val PLANET_ABBR = mapOf(
    "sun" to "Su", "moon" to "Mo", "mars" to "Ma", "mercury" to "Me",
    "jupiter" to "Ju", "venus" to "Ve", "saturn" to "Sa", "rahu" to "Ra", "ketu" to "Ke",
)

internal fun houseToPlanets(kundli: KundliDto): Map<Int, List<String>> {
    return kundli.planets
        .mapNotNull { p -> PLANET_ABBR[p.id]?.let { p.house to it } }
        .groupBy({ it.first }, { it.second })
}

/** house->abbr map for any generic {id, rashi, house} planet list — the
 * shape every varga/chandra/bhavChalit chart shares. */
internal fun vargaHouseToPlanets(planets: List<com.tredevastro.app.network.dto.VargaPlanetDto>): Map<Int, List<String>> =
    planets.mapNotNull { p -> PLANET_ABBR[p.id]?.let { p.house to it } }.groupBy({ it.first }, { it.second })

internal enum class KundliTab(val label: String) {
    OVERVIEW("Overview"),
    CHARTS("Charts"),
    GOCHAR("Gochar"),
    TIMELINE("Timeline"),
    PREDICTIONS("Predictions"),
    REMEDIES("Remedies"),
    ADVANCED("Advanced"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KundliScreen() {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var place by remember { mutableStateOf("") }
    var resolvedLat by remember { mutableStateOf<Double?>(null) }
    var resolvedLng by remember { mutableStateOf<Double?>(null) }
    var dobMillis by remember { mutableStateOf<Long?>(null) }
    var hour by remember { mutableStateOf<Int?>(null) }
    var minute by remember { mutableStateOf<Int?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }

    var result by remember { mutableStateOf<KundliFullDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedHouse by remember { mutableStateOf(1) }
    var birthTimezoneOffsetMinutes by remember { mutableStateOf(330) }

    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }
    val canGenerate = name.isNotBlank() && dobMillis != null && place.isNotBlank() && !isLoading

    fun generate() {
        val dob = dobMillis ?: return
        errorMessage = null
        isLoading = true
        scope.launch {
            val lat = resolvedLat
            val lng = resolvedLng
            val geocodeResult = if (lat != null && lng != null) {
                ApiResult.Success(GeocodeDto(latitude = lat, longitude = lng, displayName = place))
            } else {
                safeApiCall { ApiClient.service.geocode(place) }
            }
            when (geocodeResult) {
                is ApiResult.Success -> {
                    val cal = Calendar.getInstance().apply { timeInMillis = dob }
                    val dateStr = String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
                    val timeStr = String.format(Locale.US, "%02d:%02d", hour ?: 6, minute ?: 0)
                    // No place->timezone lookup wired yet — approximates with this
                    // device's own timezone, same simplification the website's
                    // birth-details form makes by defaulting to one fixed zone.
                    val offsetMinutes = TimeZone.getDefault().getOffset(dob) / 60_000
                    val body = BirthDetailsBody(
                        date = dateStr,
                        time = timeStr,
                        timezoneOffsetMinutes = offsetMinutes,
                        latitude = geocodeResult.data.latitude,
                        longitude = geocodeResult.data.longitude,
                    )
                    when (val fullResult = safeApiCall { ApiClient.service.getKundliFull(body) }) {
                        is ApiResult.Success -> {
                            result = fullResult.data
                            resolvedLat = geocodeResult.data.latitude
                            resolvedLng = geocodeResult.data.longitude
                            birthTimezoneOffsetMinutes = offsetMinutes
                        }
                        is ApiResult.Failure -> errorMessage = fullResult.message
                    }
                }
                is ApiResult.Failure -> errorMessage = "Couldn't find \"$place\" — ${geocodeResult.message}"
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
        ) {
            SectionHeader(eyebrow = tr("Free Tool"), title = tr("Generate Your Kundli"))

            AnimatedContent(targetState = result, label = "kundli-content") { current ->
                if (current == null) {
                    Column {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text(tr("Full name")) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
                            colors = kundliFieldColors(),
                        )

                        val currentDob = dobMillis
                        OutlinedTextField(
                            value = if (currentDob != null) dateFormatter.format(currentDob) else "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(tr("Date of birth")) },
                            trailingIcon = {
                                IconButton(onClick = { showDatePicker = true }) {
                                    Icon(Icons.Filled.CalendarMonth, contentDescription = "Pick date", tint = colors.goldPrimary)
                                }
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                            colors = kundliFieldColors(),
                        )

                        val currentHour = hour
                        OutlinedTextField(
                            value = if (currentHour != null) String.format(Locale.getDefault(), "%02d:%02d", currentHour, minute ?: 0) else "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(tr("Time of birth (optional)")) },
                            trailingIcon = {
                                IconButton(onClick = { showTimePicker = true }) {
                                    Icon(Icons.Filled.Schedule, contentDescription = "Pick time", tint = colors.goldPrimary)
                                }
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                            colors = kundliFieldColors(),
                        )

                        PlaceAutocompleteField(
                            value = place,
                            onValueChange = { place = it; resolvedLat = null; resolvedLng = null },
                            onResolved = { lat, lng -> resolvedLat = lat; resolvedLng = lng },
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                        )

                        if (isLoading) {
                            LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                        } else {
                            GoldButton(
                                text = tr("Generate Kundli"),
                                onClick = { generate() },
                                modifier = Modifier.padding(top = 24.dp),
                            )
                            if (!canGenerate) {
                                Text(
                                    text = tr("Fill in your name, date and place of birth to continue."),
                                    color = colors.textMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 8.dp),
                                )
                            }
                            if (errorMessage != null) {
                                ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                            }
                        }
                    }
                } else {
                    KundliResult(
                        result = current,
                        profile = BirthProfile(
                            name = name, dobMillis = dobMillis ?: 0L, hour = hour, minute = minute, place = place,
                            latitude = resolvedLat, longitude = resolvedLng, timezoneOffsetMinutes = birthTimezoneOffsetMinutes,
                        ),
                        selectedHouse = selectedHouse,
                        onHouseSelected = { selectedHouse = it },
                        onEditDetails = { result = null },
                    )
                }
            }
        }

        if (showDatePicker) {
            val state = rememberDatePickerState(initialSelectedDateMillis = dobMillis)
            DatePickerDialog(
                onDismissRequest = { showDatePicker = false },
                confirmButton = {
                    TextButton(onClick = {
                        dobMillis = state.selectedDateMillis
                        showDatePicker = false
                    }) { Text(tr("OK"), color = colors.goldPrimary) }
                },
                dismissButton = {
                    TextButton(onClick = { showDatePicker = false }) { Text(tr("Cancel"), color = colors.textMuted) }
                },
            ) {
                DatePicker(state = state)
            }
        }

        if (showTimePicker) {
            val state = rememberTimePickerState(
                initialHour = hour ?: 6,
                initialMinute = minute ?: 0,
                is24Hour = false,
            )
            androidx.compose.material3.AlertDialog(
                onDismissRequest = { showTimePicker = false },
                confirmButton = {
                    TextButton(onClick = {
                        hour = state.hour
                        minute = state.minute
                        showTimePicker = false
                    }) { Text(tr("OK"), color = colors.goldPrimary) }
                },
                dismissButton = {
                    TextButton(onClick = { showTimePicker = false }) { Text(tr("Cancel"), color = colors.textMuted) }
                },
                text = {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        TimePicker(state = state)
                    }
                },
            )
        }
    }
}

/** Name/DOB/TOB/place the visitor entered — carried alongside the API
 * result purely for display (PDF cover page, birth-details tile) since the
 * kundli-full response itself never echoes back what was typed. */
internal data class BirthProfile(
    val name: String,
    val dobMillis: Long,
    val hour: Int?,
    val minute: Int?,
    val place: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val timezoneOffsetMinutes: Int = 330,
)

@Composable
private fun KundliResult(
    result: KundliFullDto,
    profile: BirthProfile,
    selectedHouse: Int,
    onHouseSelected: (Int) -> Unit,
    onEditDetails: () -> Unit,
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val kundli = result.kundli
    val panchang = result.panchang
    val ascendantRashi = kundli.ascendant.rashi
    val sunRashi = kundli.planets.find { it.id == "sun" }?.rashi ?: "—"
    val moonRashi = kundli.planets.find { it.id == "moon" }?.rashi ?: "—"
    var activeTab by remember { mutableStateOf(KundliTab.OVERVIEW) }
    var isExportingPdf by remember { mutableStateOf(false) }

    Column {
        SectionHeader(eyebrow = tr("Ready"), title = tr("Your Kundli"), modifier = Modifier.padding(top = 4.dp))

        KundliTabRow(selected = activeTab, onSelect = { activeTab = it }, modifier = Modifier.padding(top = 16.dp))

        when (activeTab) {
            KundliTab.OVERVIEW -> Column(modifier = Modifier.padding(top = 4.dp)) {
                LazyRow(
                    modifier = Modifier.padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(
                        listOf(
                            "Ascendant" to ascendantRashi,
                            "Moon Sign" to moonRashi,
                            "Sun Sign" to sunRashi,
                            "Nakshatra" to panchang.nakshatra.name,
                            "Tithi" to panchang.tithi.name,
                        ),
                    ) { (label, value) -> PreviewChip(label = label, value = value) }
                }

                GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp)) {
                        KundliChart(
                            onHouseSelected = onHouseSelected,
                            ascendantRashiIndex = remember(kundli) { rashiIndexOf(kundli.ascendant.rashi) },
                            housePlanets = remember(kundli) { houseToPlanets(kundli) },
                        )
                        Text(
                            text = tr("House $selectedHouse · Moon Nakshatra: ${kundli.moonNakshatra.name} (pada ${kundli.moonNakshatra.pada})"),
                            color = colors.goldPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 18.dp, start = 18.dp, end = 18.dp),
                        )
                        Text(
                            text = tr("Real planetary positions from Lahiri sidereal ephemeris — tap any house to explore."),
                            color = colors.textMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 4.dp, start = 18.dp, end = 18.dp),
                        )
                    }
                }

                SectionHeader(eyebrow = tr("At Birth"), title = tr("Panchang at Birth"), modifier = Modifier.padding(top = 28.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    PanchangAtBirthGrid(result = result, ascendantRashi = ascendantRashi, modifier = Modifier.padding(18.dp))
                }

                SectionHeader(eyebrow = tr("Interpretation"), title = tr("What Your Chart Means"), modifier = Modifier.padding(top = 28.dp))
                AnalysisSection(result = result, modifier = Modifier.padding(top = 16.dp))

                SectionHeader(eyebrow = tr("Classical Attributes"), title = tr("Avakhada Chakra"), modifier = Modifier.padding(top = 28.dp))
                GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    AvakhadaGrid(result = result, modifier = Modifier.padding(18.dp))
                }
            }
            KundliTab.CHARTS -> KundliChartsTab(result = result, modifier = Modifier.padding(top = 20.dp))
            KundliTab.GOCHAR -> KundliGocharTab(result = result, modifier = Modifier.padding(top = 20.dp))
            KundliTab.TIMELINE -> KundliTimelineTab(result = result, modifier = Modifier.padding(top = 20.dp))
            KundliTab.PREDICTIONS -> KundliPredictionsTab(result = result, modifier = Modifier.padding(top = 20.dp))
            KundliTab.REMEDIES -> KundliRemediesTab(result = result, modifier = Modifier.padding(top = 20.dp))
            KundliTab.ADVANCED -> KundliAdvancedTab(result = result, modifier = Modifier.padding(top = 20.dp))
        }

        if (isExportingPdf) {
            LoadingBlock(modifier = Modifier.padding(top = 28.dp))
        } else {
            GoldButton(
                text = tr("Download Kundli Report (PDF)"),
                onClick = {
                    isExportingPdf = true
                    scope.launch {
                        exportKundliPdf(context, result, profile)
                        isExportingPdf = false
                    }
                },
                modifier = Modifier.padding(top = 28.dp),
            )
        }
        OutlineGoldButton(
            text = tr("Edit Details"),
            onClick = onEditDetails,
            modifier = Modifier.padding(top = 12.dp),
        )
    }
}

@Composable
private fun KundliTabRow(selected: KundliTab, onSelect: (KundliTab) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    LazyRow(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(KundliTab.entries.toList()) { tab ->
            val active = tab == selected
            Text(
                tr(tab.label),
                color = if (active) androidx.compose.ui.graphics.Color(0xFF15100A) else colors.textSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .background(if (active) colors.goldPrimary else colors.bgSecondary, RoundedCornerShape(999.dp))
                    .clickable { onSelect(tab) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
private fun PanchangAtBirthGrid(result: KundliFullDto, ascendantRashi: String, modifier: Modifier = Modifier) {
    val p = result.panchang
    val fields = listOf(
        "Tithi" to p.tithi.name,
        "Nakshatra" to tr("${p.nakshatra.name} (Pada ${p.nakshatra.pada})"),
        "Yoga" to p.yoga,
        "Karana" to p.karana,
        "Sunrise" to formatIsoTime24h(p.sunrise),
        "Sunset" to formatIsoTime24h(p.sunset),
        "Rahu Kalam" to formatWindow24h(p.rahuKaal),
        "Yamaganda" to formatWindow24h(p.yamagandaKaal),
        "Gulika Kalam" to formatWindow24h(p.gulikaKaal),
        "Abhijit Muhurat" to formatWindow24h(p.abhijitMuhurat),
        "Vara" to p.vara,
        "Nakshatra Lord" to p.nakshatra.lord,
        "Moon Rashi" to p.moonRashi,
        "Ascendant Lord" to rulingGrahaFor(ascendantRashi),
    )
    GridOfTiles(fields = fields, modifier = modifier)
}

@Composable
private fun AvakhadaGrid(result: KundliFullDto, modifier: Modifier = Modifier) {
    val a = result.avakhada
    val fields = listOf(
        "Varna" to a.varna,
        "Vashya" to a.vashya,
        "Yoni" to a.yoni,
        "Gana" to a.gana,
        "Nadi" to a.nadi,
        "Paya" to a.paya,
        "Tatva" to a.tatva,
        "Sign Lord" to a.signLord,
        "Nakshatra Lord" to a.nakshatraLord,
        "Charan" to "${a.pada}",
    )
    GridOfTiles(fields = fields, modifier = modifier)
}

@Composable
private fun GridOfTiles(fields: List<Pair<String, String>>, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        fields.chunked(2).forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (label, value) -> InfoTile(label = label, value = value, modifier = Modifier.weight(1f)) }
                if (row.size == 1) Box(modifier = Modifier.weight(1f))
            }
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(10.dp))
        }
    }
}

@Composable
private fun InfoTile(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(tr(label), color = colors.textMuted, fontSize = 10.sp)
        Text(value, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun AnalysisSection(result: KundliFullDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val analysis = result.analysis
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            AnalysisParagraph(title = "Ascendant", text = analysis.lagna)
            AnalysisParagraph(title = "Moon", text = analysis.moon, modifier = Modifier.padding(top = 14.dp))
            analysis.planets.forEach { p ->
                val name = PLANET_META[p.id]?.name ?: p.id
                AnalysisParagraph(title = name, text = p.text, modifier = Modifier.padding(top = 14.dp))
            }
        }
    }
}

@Composable
private fun AnalysisParagraph(title: String, text: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(modifier = modifier) {
        Text(tr(title), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        Text(tr(text), color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun PreviewChip(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(tr(label).uppercase(), color = colors.textMuted, fontSize = 9.sp)
            Text(value, color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun kundliFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = LocalAppColors.current.textPrimary,
    unfocusedTextColor = LocalAppColors.current.textPrimary,
    focusedBorderColor = LocalAppColors.current.goldPrimary,
    unfocusedBorderColor = LocalAppColors.current.borderStrong,
    focusedLabelColor = LocalAppColors.current.goldPrimary,
    unfocusedLabelColor = LocalAppColors.current.textMuted,
    focusedContainerColor = LocalAppColors.current.surface.copy(alpha = 0.4f),
    unfocusedContainerColor = LocalAppColors.current.surface.copy(alpha = 0.4f),
    cursorColor = LocalAppColors.current.goldPrimary,
)
