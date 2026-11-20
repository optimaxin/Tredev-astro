package com.tredevastro.app.ui.screens.muhurat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.PanchangBody
import com.tredevastro.app.network.dto.ChoghadiyaSegmentDto
import com.tredevastro.app.network.dto.PanchangDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.BirthDetailsState
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.PlaceAutocompleteField
import com.tredevastro.app.ui.components.birthFieldColors
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.util.formatIsoTime24h
import com.tredevastro.app.util.formatWindow24h
import com.tredevastro.app.util.resolvedCoordinates
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** Date field for "which date's Panchang" — Muhurat Finder / Choghadiya /
 * Abhijit Muhurat only need a date + place, not a full birth-details form. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateAndPlaceFields(state: BirthDetailsState, onStateChange: (BirthDetailsState) -> Unit, modifier: Modifier = Modifier) {
    var showDatePicker by remember { mutableStateOf(false) }
    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }

    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = state.dobMillis?.let { dateFormatter.format(it) } ?: "",
            onValueChange = {},
            readOnly = true,
            label = { Text(tr("Date")) },
            trailingIcon = {
                IconButton(onClick = { showDatePicker = true }) {
                    Icon(Icons.Filled.CalendarMonth, contentDescription = "Pick date", tint = LocalAppColors.current.goldPrimary)
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = birthFieldColors(),
        )
        PlaceAutocompleteField(
            value = state.place,
            onValueChange = { onStateChange(state.copy(place = it, resolvedLatitude = null, resolvedLongitude = null)) },
            onResolved = { lat, lng -> onStateChange(state.copy(resolvedLatitude = lat, resolvedLongitude = lng)) },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
    }

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = state.dobMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = { onStateChange(state.copy(dobMillis = pickerState.selectedDateMillis)); showDatePicker = false }) {
                    Text(tr("OK"), color = LocalAppColors.current.goldPrimary)
                }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(tr("Cancel"), color = LocalAppColors.current.textMuted) } },
        ) {
            DatePicker(state = pickerState)
        }
    }
}

private fun Long.toDateStr(): String {
    val cal = Calendar.getInstance().apply { timeInMillis = this@toDateStr }
    return String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
}

/** One engine for every "look up the Panchang for a date and place, then
 * show one slice of it" tool. Muhurat Finder, Choghadiya and Abhijit Muhurat
 * all read from the same /panchang response the Panchang tab does (backend's
 * calculatePanchang already computes all three) — only the default
 * date/place and which fields get rendered differ per screen. */
@Composable
private fun PanchangLookupScreen(
    title: String,
    subtitle: String,
    buttonText: String,
    onBack: () -> Unit,
    resultContent: @Composable (PanchangDto) -> Unit,
) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var state by remember {
        mutableStateOf(
            BirthDetailsState(
                place = "New Delhi, India",
                dobMillis = System.currentTimeMillis(),
                resolvedLatitude = 28.6139,
                resolvedLongitude = 77.2090,
            ),
        )
    }
    var result by remember { mutableStateOf<PanchangDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val canGenerate = state.dobMillis != null && state.place.isNotBlank() && !isLoading

    fun generate() {
        val dob = state.dobMillis ?: return
        errorMessage = null
        isLoading = true
        scope.launch {
            when (val geo = state.resolvedCoordinates()) {
                is ApiResult.Success -> {
                    val (lat, lng) = geo.data
                    when (val res = safeApiCall { ApiClient.service.getPanchang(PanchangBody(dob.toDateStr(), lat, lng)) }) {
                        is ApiResult.Success -> result = res.data
                        is ApiResult.Failure -> errorMessage = res.message
                    }
                }
                is ApiResult.Failure -> errorMessage = "Couldn't find \"${state.place}\" — ${geo.message}"
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = tr(title), subtitle = tr(subtitle), onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))

            DateAndPlaceFields(state = state, onStateChange = { state = it })

            if (isLoading) {
                LoadingBlock(modifier = Modifier.padding(top = 16.dp))
            } else {
                GoldButton(text = tr(buttonText), onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                if (!canGenerate) {
                    Text(tr("Pick a date and place to continue."), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                }
                if (errorMessage != null) {
                    ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                }
            }

            val current = result
            if (current != null) {
                GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                    Column(modifier = Modifier.padding(18.dp)) { resultContent(current) }
                }
            }
        }
    }
}

@Composable
fun MuhuratFinderScreen(onBack: () -> Unit) = PanchangLookupScreen(
    title = "Muhurat Finder",
    subtitle = "Auspicious windows for any date and place",
    buttonText = "Find Muhurats",
    onBack = onBack,
) { p ->
    MuhuratRow(title = "Abhijit Muhurat", time = formatWindow24h(p.abhijitMuhurat))
    MuhuratRow(title = "Vijaya Muhurat", time = formatWindow24h(p.vijayaMuhurat), modifier = Modifier.padding(top = 8.dp))
    MuhuratRow(title = "Amrit Kaal", time = formatWindow24h(p.amritKaal), modifier = Modifier.padding(top = 8.dp))
    Text(
        tr("Inauspicious — avoid for new beginnings"),
        color = LocalAppColors.current.sacredAccent,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
    )
    MuhuratRow(title = "Rahu Kaal", time = formatWindow24h(p.rahuKaal), tint = LocalAppColors.current.sacredAccent)
    MuhuratRow(title = "Yamaganda Kaal", time = formatWindow24h(p.yamagandaKaal), tint = LocalAppColors.current.sacredAccent, modifier = Modifier.padding(top = 8.dp))
    MuhuratRow(title = "Gulika Kaal", time = formatWindow24h(p.gulikaKaal), tint = LocalAppColors.current.sacredAccent, modifier = Modifier.padding(top = 8.dp))
}

@Composable
fun AbhijitMuhuratScreen(onBack: () -> Unit) = PanchangLookupScreen(
    title = "Abhijit Muhurat",
    subtitle = "The most auspicious moment of the day",
    buttonText = "Find Abhijit Muhurat",
    onBack = onBack,
) { p ->
    MuhuratRow(title = "Abhijit Muhurat", time = formatWindow24h(p.abhijitMuhurat))
    Text(
        tr("Falls at solar noon — the middle of the 8th muhurta (of 15) between sunrise and sunset — considered auspicious for starting anything important, except on Wednesdays."),
        color = LocalAppColors.current.textMuted,
        fontSize = 12.sp,
        lineHeight = 17.sp,
        modifier = Modifier.padding(top = 12.dp),
    )
    Text(
        tr("Sunrise ${formatIsoTime24h(p.sunrise)} · Sunset ${formatIsoTime24h(p.sunset)}"),
        color = LocalAppColors.current.textSecondary,
        fontSize = 12.sp,
        modifier = Modifier.padding(top = 12.dp),
    )
}

@Composable
fun ChoghadiyaScreen(onBack: () -> Unit) = PanchangLookupScreen(
    title = "Choghadiya",
    subtitle = "8 day + 8 night auspicious/inauspicious segments",
    buttonText = "Find Choghadiya",
    onBack = onBack,
) { p ->
    val choghadiya = p.choghadiya
    if (choghadiya == null) {
        Text(tr("Choghadiya isn't available for this date/place (no sunrise found)."), color = LocalAppColors.current.textMuted, fontSize = 13.sp)
    } else {
        Text(tr("Day"), color = LocalAppColors.current.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        choghadiya.day.forEach { seg -> ChoghadiyaRow(seg = seg, modifier = Modifier.padding(top = 8.dp)) }
        Text(tr("Night"), color = LocalAppColors.current.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 16.dp))
        choghadiya.night.forEach { seg -> ChoghadiyaRow(seg = seg, modifier = Modifier.padding(top = 8.dp)) }
    }
}

@Composable
private fun MuhuratRow(title: String, time: String, tint: Color = LocalAppColors.current.goldPrimary, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().background(tint.copy(alpha = 0.08f), RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(tr(title), color = LocalAppColors.current.textPrimary, fontWeight = FontWeight.Medium, fontSize = 12.sp)
        Text(time, color = LocalAppColors.current.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ChoghadiyaRow(seg: ChoghadiyaSegmentDto, modifier: Modifier = Modifier) {
    val tint = if (seg.auspicious) Color(0xFF50C878) else LocalAppColors.current.sacredAccent
    Row(
        modifier = modifier.fillMaxWidth().background(tint.copy(alpha = 0.08f), RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(tr(seg.name), color = LocalAppColors.current.textPrimary, fontWeight = FontWeight.Medium, fontSize = 12.sp)
        Text("${formatIsoTime24h(seg.start)} – ${formatIsoTime24h(seg.end)}", color = tint, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}
