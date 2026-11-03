package com.tredevastro.app.ui.screens.tools

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.ChineseZodiacBody
import com.tredevastro.app.network.DateOnlyBody
import com.tredevastro.app.network.FlamesBody
import com.tredevastro.app.network.NameDateBody
import com.tredevastro.app.network.NumerologyMatchBody
import com.tredevastro.app.network.dto.NumerologyProfileDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.KeyValueGrid
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.birthFieldColors
import com.tredevastro.app.ui.theme.LocalAppColors
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** Just the date-of-birth field + picker dialog — shared by every screen
 * below that needs a DOB, with or without a name field alongside it. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DobField(dobMillis: Long?, onDobChange: (Long?) -> Unit, modifier: Modifier = Modifier) {
    var showDatePicker by remember { mutableStateOf(false) }
    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }

    OutlinedTextField(
        value = if (dobMillis != null) dateFormatter.format(dobMillis) else "",
        onValueChange = {},
        readOnly = true,
        label = { Text(tr("Date of birth")) },
        trailingIcon = {
            IconButton(onClick = { showDatePicker = true }) {
                Icon(Icons.Filled.CalendarMonth, contentDescription = "Pick date", tint = LocalAppColors.current.goldPrimary)
            }
        },
        singleLine = true,
        modifier = modifier.fillMaxWidth(),
        colors = birthFieldColors(),
    )

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = dobMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = { onDobChange(pickerState.selectedDateMillis); showDatePicker = false }) {
                    Text(tr("OK"), color = LocalAppColors.current.goldPrimary)
                }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(tr("Cancel"), color = LocalAppColors.current.textMuted) } },
        ) {
            DatePicker(state = pickerState)
        }
    }
}

/** A name + date-of-birth field pair — lighter than [com.tredevastro.app.ui.components.BirthDetailsForm]
 * since numerology only needs the name and DOB, not time or place. */
@Composable
private fun NameDobFields(
    name: String,
    onNameChange: (String) -> Unit,
    dobMillis: Long?,
    onDobChange: (Long?) -> Unit,
    modifier: Modifier = Modifier,
    namePlaceholder: String = "Full name",
) {
    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text(tr(namePlaceholder)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = birthFieldColors(),
        )
        DobField(dobMillis = dobMillis, onDobChange = onDobChange, modifier = Modifier.padding(top = 12.dp))
    }
}

private fun Long.toDateStr(): String {
    val cal = Calendar.getInstance().apply { timeInMillis = this@toDateStr }
    return String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
}

private fun numerologyRows(p: NumerologyProfileDto) = listOf(
    "Life Path Number" to "${p.lifePathNumber}",
    "Destiny Number" to "${p.destinyNumber}",
    "Soul Urge Number" to "${p.soulUrgeNumber}",
    "Personality Number" to "${p.personalityNumber}",
)

/** My Numerology / Life Path Number / Name Numerology all land here — same
 * calculation, same convention the website's own tool routing already uses
 * (several menu labels pointing at one page when they're the same tool). */
@Composable
fun NumerologyScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var dobMillis by remember { mutableStateOf<Long?>(null) }
    var result by remember { mutableStateOf<NumerologyProfileDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val canGenerate = name.isNotBlank() && dobMillis != null && !isLoading

    fun generate() {
        val dob = dobMillis ?: return
        errorMessage = null
        isLoading = true
        scope.launch {
            when (val res = safeApiCall { ApiClient.service.getNumerology(NameDateBody(name, dob.toDateStr())) }) {
                is ApiResult.Success -> result = res.data
                is ApiResult.Failure -> errorMessage = res.message
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = "Numerology", subtitle = "Your core numbers from name and birth date", onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))
            val current = result
            if (current == null) {
                NameDobFields(name = name, onNameChange = { name = it }, dobMillis = dobMillis, onDobChange = { dobMillis = it })
                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = "Calculate My Numbers", onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                    if (!canGenerate) Text(tr("Fill in your name and date of birth to continue."), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                    if (errorMessage != null) ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                }
            } else {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) { KeyValueGrid(numerologyRows(current)) }
                }
                OutlineGoldButton(text = "Check Another", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
fun NumerologyMatchScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var name1 by remember { mutableStateOf("") }
    var dob1 by remember { mutableStateOf<Long?>(null) }
    var name2 by remember { mutableStateOf("") }
    var dob2 by remember { mutableStateOf<Long?>(null) }
    var result by remember { mutableStateOf<com.tredevastro.app.network.dto.NumerologyMatchResultDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val canGenerate = name1.isNotBlank() && dob1 != null && name2.isNotBlank() && dob2 != null && !isLoading

    fun generate() {
        val d1 = dob1 ?: return
        val d2 = dob2 ?: return
        errorMessage = null
        isLoading = true
        scope.launch {
            val body = NumerologyMatchBody(
                person1 = com.tredevastro.app.network.NameDateBody(name1, d1.toDateStr()),
                person2 = com.tredevastro.app.network.NameDateBody(name2, d2.toDateStr()),
            )
            when (val res = safeApiCall { ApiClient.service.getNumerologyMatch(body) }) {
                is ApiResult.Success -> result = res.data
                is ApiResult.Failure -> errorMessage = res.message
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = "Numerology Match", subtitle = "Compare two people's core numbers", onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))
            val current = result
            if (current == null) {
                NameDobFields(name = name1, onNameChange = { name1 = it }, dobMillis = dob1, onDobChange = { dob1 = it }, namePlaceholder = "Person 1 name")
                NameDobFields(
                    name = name2, onNameChange = { name2 = it }, dobMillis = dob2, onDobChange = { dob2 = it },
                    namePlaceholder = "Person 2 name", modifier = Modifier.padding(top = 20.dp),
                )
                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = "Check Compatibility", onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                    if (!canGenerate) Text(tr("Fill in both people's name and date of birth to continue."), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                    if (errorMessage != null) ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                }
            } else {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text("$name1", color = colors.goldPrimary, fontSize = 13.sp)
                        KeyValueGrid(numerologyRows(current.person1))
                        Text("$name2", color = colors.goldPrimary, fontSize = 13.sp, modifier = Modifier.padding(top = 14.dp))
                        KeyValueGrid(numerologyRows(current.person2))
                        KeyValueGrid(
                            listOf(
                                "Life Path Affinity" to current.lifePathAffinity.replaceFirstChar { it.uppercase() },
                                "Destiny Affinity" to current.destinyAffinity.replaceFirstChar { it.uppercase() },
                                "Soul Urge Affinity" to current.soulUrgeAffinity.replaceFirstChar { it.uppercase() },
                            ),
                            modifier = Modifier.padding(top = 14.dp),
                        )
                    }
                }
                OutlineGoldButton(text = "Check Another Pair", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
fun FlamesScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var name1 by remember { mutableStateOf("") }
    var name2 by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<com.tredevastro.app.network.dto.FlamesOutcomeDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val canGenerate = name1.isNotBlank() && name2.isNotBlank() && !isLoading

    fun generate() {
        errorMessage = null
        isLoading = true
        scope.launch {
            when (val res = safeApiCall { ApiClient.service.getFlames(FlamesBody(name1, name2)) }) {
                is ApiResult.Success -> result = res.data
                is ApiResult.Failure -> errorMessage = res.message
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = "FLAMES", subtitle = "Friends, Love, Affection, Marriage, Enemies, Siblings", onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))
            val current = result
            if (current == null) {
                androidx.compose.material3.OutlinedTextField(
                    value = name1, onValueChange = { name1 = it }, label = { Text(tr("Your name")) },
                    singleLine = true, modifier = Modifier.fillMaxWidth(), colors = birthFieldColors(),
                )
                androidx.compose.material3.OutlinedTextField(
                    value = name2, onValueChange = { name2 = it }, label = { Text(tr("Their name")) },
                    singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 12.dp), colors = birthFieldColors(),
                )
                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = "Reveal FLAMES", onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                    if (!canGenerate) Text(tr("Fill in both names to continue."), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                    if (errorMessage != null) ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                }
            } else {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        KeyValueGrid(listOf("Result" to current.result, "Landed On" to current.letter))
                    }
                }
                OutlineGoldButton(text = "Check Another", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

/** Chinese Zodiac and Numerology Horoscope both only need a date of birth —
 * one shared engine for both, parametrized by which endpoint + rows to show. */
@Composable
private fun DateOnlyToolScreen(
    title: String,
    subtitle: String,
    buttonText: String,
    onBack: () -> Unit,
    call: suspend (Long) -> ApiResult<List<Pair<String, String>>>,
) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var dobMillis by remember { mutableStateOf<Long?>(null) }
    var result by remember { mutableStateOf<List<Pair<String, String>>?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val canGenerate = dobMillis != null && !isLoading

    fun generate() {
        val dob = dobMillis ?: return
        errorMessage = null
        isLoading = true
        scope.launch {
            when (val res = call(dob)) {
                is ApiResult.Success -> result = res.data
                is ApiResult.Failure -> errorMessage = res.message
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = title, subtitle = subtitle, onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))
            val current = result
            if (current == null) {
                DobField(dobMillis = dobMillis, onDobChange = { dobMillis = it })
                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = buttonText, onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                    if (!canGenerate) Text(tr("Pick a date of birth to continue."), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                    if (errorMessage != null) ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                }
            } else {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) { KeyValueGrid(current) }
                }
                OutlineGoldButton(text = "Check Another", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
fun ChineseZodiacScreen(onBack: () -> Unit) = DateOnlyToolScreen(
    title = "Chinese Zodiac",
    subtitle = "Your animal and element by birth year",
    buttonText = "Find My Chinese Zodiac",
    onBack = onBack,
    call = { dob ->
        val year = Calendar.getInstance().apply { timeInMillis = dob }.get(Calendar.YEAR)
        safeApiCall { ApiClient.service.getChineseZodiac(ChineseZodiacBody(year)) }.let { result ->
            when (result) {
                is ApiResult.Success -> ApiResult.Success(
                    listOf(
                        "Animal" to result.data.animal,
                        "Element" to result.data.element,
                        "Label" to result.data.label,
                    ),
                )
                is ApiResult.Failure -> result
            }
        }
    },
)

@Composable
fun NumerologyHoroscopeScreen(onBack: () -> Unit) = DateOnlyToolScreen(
    title = "Numerology Horoscope",
    subtitle = "Your current Personal Year, Month and Day numbers",
    buttonText = "Find My Personal Cycle",
    onBack = onBack,
    call = { dob ->
        safeApiCall { ApiClient.service.getNumerologyHoroscope(DateOnlyBody(dob.toDateStr())) }.let { result ->
            when (result) {
                is ApiResult.Success -> ApiResult.Success(
                    listOf(
                        "Personal Year" to "${result.data.personalYear}",
                        "Personal Month" to "${result.data.personalMonth}",
                        "Personal Day" to "${result.data.personalDay}",
                    ),
                )
                is ApiResult.Failure -> result
            }
        }
    },
)
