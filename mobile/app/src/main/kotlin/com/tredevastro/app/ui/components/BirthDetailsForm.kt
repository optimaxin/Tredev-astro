package com.tredevastro.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.unit.dp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors
import java.text.SimpleDateFormat
import java.util.Locale

data class BirthDetailsState(
    var name: String = "",
    var place: String = "",
    var dobMillis: Long? = null,
    var hour: Int? = null,
    var minute: Int? = null,
    // Set once a suggestion is picked/resolved in PlaceAutocompleteField, so
    // submit can skip its own geocode-on-submit call. Cleared whenever the
    // place text changes, since a stale resolution no longer matches it.
    var resolvedLatitude: Double? = null,
    var resolvedLongitude: Double? = null,
)

@Composable
fun rememberBirthDetailsState(): androidx.compose.runtime.MutableState<BirthDetailsState> =
    remember { mutableStateOf(BirthDetailsState()) }

/** The Name/DOB/TOB/Place fields shared by every birth-chart tool (Kundli,
 * Sade Sati, and both partners in Kundli Matching) — factored out once
 * three screens needed the same date/time-picker plumbing. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BirthDetailsForm(
    state: BirthDetailsState,
    onStateChange: (BirthDetailsState) -> Unit,
    modifier: Modifier = Modifier,
    namePlaceholder: String = "Full name",
) {
    val colors = LocalAppColors.current
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }

    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = state.name,
            onValueChange = { onStateChange(state.copy(name = it)) },
            label = { Text(tr(namePlaceholder)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = birthFieldColors(),
        )

        val dob = state.dobMillis
        OutlinedTextField(
            value = if (dob != null) dateFormatter.format(dob) else "",
            onValueChange = {},
            readOnly = true,
            label = { Text(tr("Date of birth")) },
            trailingIcon = {
                IconButton(onClick = { showDatePicker = true }) {
                    Icon(Icons.Filled.CalendarMonth, contentDescription = "Pick date", tint = colors.goldPrimary)
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            colors = birthFieldColors(),
        )

        val hour = state.hour
        OutlinedTextField(
            value = if (hour != null) String.format(Locale.getDefault(), "%02d:%02d", hour, state.minute ?: 0) else "",
            onValueChange = {},
            readOnly = true,
            label = { Text(tr("Time of birth")) },
            trailingIcon = {
                IconButton(onClick = { showTimePicker = true }) {
                    Icon(Icons.Filled.Schedule, contentDescription = "Pick time", tint = colors.goldPrimary)
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
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
                TextButton(onClick = {
                    onStateChange(state.copy(dobMillis = pickerState.selectedDateMillis))
                    showDatePicker = false
                }) { Text(tr("OK"), color = colors.goldPrimary) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(tr("Cancel"), color = colors.textMuted) }
            },
        ) {
            DatePicker(state = pickerState)
        }
    }

    if (showTimePicker) {
        val pickerState = rememberTimePickerState(initialHour = state.hour ?: 6, initialMinute = state.minute ?: 0, is24Hour = false)
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    onStateChange(state.copy(hour = pickerState.hour, minute = pickerState.minute))
                    showTimePicker = false
                }) { Text(tr("OK"), color = colors.goldPrimary) }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) { Text(tr("Cancel"), color = colors.textMuted) }
            },
            text = {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    TimePicker(state = pickerState)
                }
            },
        )
    }
}

@Composable
fun birthFieldColors() = OutlinedTextFieldDefaults.colors(
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
