package com.tredevastro.app.ui.screens.kundli

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.theme.LocalAppColors
import java.text.SimpleDateFormat
import java.util.Locale

private val ZODIAC_SIGNS = listOf(
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
)

private data class KundliPreview(val sun: String, val moon: String, val ascendant: String)

private fun previewFor(name: String, dobMillis: Long): KundliPreview {
    val seed = (name.hashCode() xor dobMillis.hashCode())
    fun sign(offset: Int) = ZODIAC_SIGNS[((seed + offset) % 12 + 12) % 12]
    return KundliPreview(sun = sign(0), moon = sign(4), ascendant = sign(8))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KundliScreen() {
    val colors = LocalAppColors.current
    var name by remember { mutableStateOf("") }
    var place by remember { mutableStateOf("") }
    var dobMillis by remember { mutableStateOf<Long?>(null) }
    var hour by remember { mutableStateOf<Int?>(null) }
    var minute by remember { mutableStateOf<Int?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var preview by remember { mutableStateOf<KundliPreview?>(null) }
    var selectedHouse by remember { mutableStateOf(1) }

    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }
    val canGenerate = name.isNotBlank() && dobMillis != null && place.isNotBlank()

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
        ) {
            SectionHeader(eyebrow = "Free Tool", title = "Generate Your Kundli")

            AnimatedContent(targetState = preview, label = "kundli-content") { current ->
                if (current == null) {
                    Column {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Full name") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
                            colors = kundliFieldColors(),
                        )

                        val currentDob = dobMillis
                        OutlinedTextField(
                            value = if (currentDob != null) dateFormatter.format(currentDob) else "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Date of birth") },
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
                            label = { Text("Time of birth (optional)") },
                            trailingIcon = {
                                IconButton(onClick = { showTimePicker = true }) {
                                    Icon(Icons.Filled.Schedule, contentDescription = "Pick time", tint = colors.goldPrimary)
                                }
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                            colors = kundliFieldColors(),
                        )

                        OutlinedTextField(
                            value = place,
                            onValueChange = { place = it },
                            label = { Text("Place of birth") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                            colors = kundliFieldColors(),
                        )

                        GoldButton(
                            text = "Generate Kundli",
                            onClick = { preview = previewFor(name, dobMillis ?: 0L) },
                            modifier = Modifier.padding(top = 24.dp),
                        )
                        if (!canGenerate) {
                            Text(
                                text = "Fill in your name, date and place of birth to continue.",
                                color = colors.textMuted,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                    }
                } else {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            PreviewChip(label = "Sun", value = current.sun, modifier = Modifier.weight(1f))
                            PreviewChip(label = "Moon", value = current.moon, modifier = Modifier.weight(1f))
                            PreviewChip(label = "Ascendant", value = current.ascendant, modifier = Modifier.weight(1f))
                        }

                        KundliChart(
                            onHouseSelected = { selectedHouse = it },
                            modifier = Modifier.padding(top = 24.dp),
                        )

                        Text(
                            text = "House $selectedHouse · tap any house to explore",
                            color = colors.goldPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 16.dp),
                        )
                        Text(
                            text = "Preview chart with placeholder placements — full ephemeris-based reading connects to the backend next.",
                            color = colors.textMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 4.dp),
                        )

                        OutlineGoldButton(
                            text = "Edit Details",
                            onClick = { preview = null },
                            modifier = Modifier.padding(top = 24.dp),
                        )
                    }
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
                    }) { Text("OK", color = colors.goldPrimary) }
                },
                dismissButton = {
                    TextButton(onClick = { showDatePicker = false }) { Text("Cancel", color = colors.textMuted) }
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
                    }) { Text("OK", color = colors.goldPrimary) }
                },
                dismissButton = {
                    TextButton(onClick = { showTimePicker = false }) { Text("Cancel", color = colors.textMuted) }
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

@Composable
private fun PreviewChip(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label.uppercase(), color = colors.textMuted, fontSize = 10.sp)
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
