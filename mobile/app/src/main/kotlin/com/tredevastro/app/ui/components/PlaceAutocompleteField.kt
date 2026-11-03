package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.dto.PlaceSuggestionDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.theme.LocalAppColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Place-of-birth field with live suggestions as you type — ports the
 * website's LocationAutocomplete (debounced /place-suggest, then a
 * /place-resolve follow-up for AWS-sourced picks that only carry a placeId).
 * `onResolved` fires once real coordinates are known, so the caller can skip
 * its own geocode-on-submit call for whatever was picked here. */
@Composable
fun PlaceAutocompleteField(
    value: String,
    onValueChange: (String) -> Unit,
    onResolved: (latitude: Double, longitude: Double) -> Unit,
    modifier: Modifier = Modifier,
    label: String = tr("Place of birth"),
) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var suggestions by remember { mutableStateOf<List<PlaceSuggestionDto>>(emptyList()) }
    var resolving by remember { mutableStateOf(false) }

    LaunchedEffect(value) {
        val trimmed = value.trim()
        if (trimmed.length < 2) {
            suggestions = emptyList()
            return@LaunchedEffect
        }
        delay(300)
        suggestions = when (val result = safeApiCall { ApiClient.service.placeSuggest(trimmed) }) {
            is ApiResult.Success -> result.data
            is ApiResult.Failure -> emptyList()
        }
    }

    fun pick(s: PlaceSuggestionDto) {
        onValueChange(s.label)
        suggestions = emptyList()
        val lat = s.latitude
        val lng = s.longitude
        if (lat != null && lng != null) {
            onResolved(lat, lng)
            return
        }
        val placeId = s.placeId ?: return
        resolving = true
        scope.launch {
            when (val result = safeApiCall { ApiClient.service.resolvePlace(placeId) }) {
                is ApiResult.Success -> onResolved(result.data.latitude, result.data.longitude)
                is ApiResult.Failure -> Unit // typed label stays; submit-time geocode fallback still resolves it
            }
            resolving = false
        }
    }

    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            singleLine = true,
            trailingIcon = if (resolving) {
                { CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = colors.goldPrimary) }
            } else null,
            modifier = Modifier.fillMaxWidth(),
            colors = birthFieldColors(),
        )
        if (suggestions.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp)
                    .background(colors.surface, RoundedCornerShape(10.dp))
                    .border(1.dp, colors.borderStrong, RoundedCornerShape(10.dp)),
            ) {
                suggestions.forEach { s ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { pick(s) }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                    ) {
                        Icon(Icons.Filled.LocationOn, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(16.dp))
                        Text(s.label, color = colors.textPrimary, fontSize = 14.sp, modifier = Modifier.padding(start = 10.dp))
                    }
                }
            }
        }
    }
}
