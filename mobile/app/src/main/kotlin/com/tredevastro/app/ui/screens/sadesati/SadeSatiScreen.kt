package com.tredevastro.app.ui.screens.sadesati

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
import androidx.compose.material3.Text
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
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.dto.SadeSatiDto
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

@Composable
fun SadeSatiScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val stateHolder = rememberBirthDetailsState()
    var state by stateHolder

    var result by remember { mutableStateOf<SadeSatiDto?>(null) }
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
                    when (val res = safeApiCall { ApiClient.service.getSadeSati(body) }) {
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

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        ) {
            HeroBanner(
                title = "Sade Sati Report",
                subtitle = "Saturn's 7.5-year transit through your Moon sign",
                onBack = onBack,
                modifier = Modifier.padding(bottom = 20.dp),
            )

            val current = result
            if (current == null) {
                BirthDetailsForm(state = state, onStateChange = { state = it })

                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = "Check Sade Sati", onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
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
                SadeSatiResultCard(result = current)
                OutlineGoldButton(text = "Check Another", onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
private fun SadeSatiResultCard(result: SadeSatiDto) {
    val colors = LocalAppColors.current
    val tint = if (result.active) colors.sacredAccent else Color(0xFF50C878)
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(tr("Sade Sati Status"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Text(
                    tr(if (result.active) "ACTIVE" else "NOT ACTIVE"),
                    color = tint,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .background(tint.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }

            if (result.active && result.phase != null) {
                Text(
                    tr("Phase: ${result.phase.replaceFirstChar { it.uppercase() }}"),
                    color = colors.goldPrimary,
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }

            Text(
                tr("Your Moon Rashi: ${result.moonRashi}"),
                color = colors.textSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                tr("Saturn is currently transiting: ${result.saturnTransitRashi}"),
                color = colors.textSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                tr("Sade Sati occurs when Saturn transits the 12th, 1st, or 2nd sign from your natal Moon — a ~7.5-year cycle traditionally split into rising, peak, and setting phases."),
                color = colors.textMuted,
                fontSize = 11.sp,
                lineHeight = 16.sp,
                modifier = Modifier.padding(top = 14.dp),
            )
        }
    }
}
