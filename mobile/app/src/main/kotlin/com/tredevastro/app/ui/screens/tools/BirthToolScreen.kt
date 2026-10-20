package com.tredevastro.app.ui.screens.tools

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
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
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.dto.ApiEnvelope
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.BirthDetailsForm
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.rememberBirthDetailsState
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.util.resolvedCoordinates
import com.tredevastro.app.util.toBirthDetailsBody
import kotlinx.coroutines.launch

/** One engine for every "fill in your birth details, get a small result"
 * calculator (Nakshatra Finder, Lucky Color, Lal Kitab, Kaal Sarp Dosha,
 * Pitra Dosha, Rahu Ketu Transit, …) — each of those is a thin ~10-line
 * wrapper around this, supplying only its endpoint call and how to turn
 * the result into label/value rows. */
@Composable
fun <T> BirthToolScreen(
    title: String,
    subtitle: String,
    buttonText: String,
    onBack: () -> Unit,
    call: suspend (com.tredevastro.app.network.BirthDetailsBody) -> ApiEnvelope<T>,
    resultContent: @Composable (T) -> Unit,
) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val stateHolder = rememberBirthDetailsState()
    var state by stateHolder

    var result by remember { mutableStateOf<T?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val canGenerate = state.name.isNotBlank() && state.dobMillis != null && state.place.isNotBlank() && !isLoading

    fun generate() {
        errorMessage = null
        isLoading = true
        scope.launch {
            when (val geo = state.resolvedCoordinates()) {
                is ApiResult.Success -> {
                    val (lat, lng) = geo.data
                    val body = state.toBirthDetailsBody(lat, lng)
                    when (val res = safeApiCall { call(body) }) {
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
            HeroBanner(title = title, subtitle = subtitle, onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))

            val current = result
            if (current == null) {
                BirthDetailsForm(state = state, onStateChange = { state = it })
                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = buttonText, onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
                    if (!canGenerate) {
                        Text(
                            tr("Fill in your name, date and place of birth to continue."),
                            color = colors.textMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                    if (errorMessage != null) {
                        ErrorBlock(message = errorMessage ?: "", onRetry = { generate() })
                    }
                }
            } else {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        resultContent(current)
                    }
                }
                OutlineGoldButton(text = "Check Another", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}
