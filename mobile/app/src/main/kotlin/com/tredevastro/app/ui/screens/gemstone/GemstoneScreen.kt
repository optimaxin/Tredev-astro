package com.tredevastro.app.ui.screens.gemstone

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.dto.GemstoneResultDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.RudrakshaResultDto
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
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.util.resolvedCoordinates
import com.tredevastro.app.util.toBirthDetailsBody
import kotlinx.coroutines.launch

/** Gemstone & Rudraksha recommendations — there's no standalone endpoint for
 * this, so it calls the same /kundli-full the Kundli screen does and shows
 * just the gemstones/rudraksha slice of that response. */
@Composable
fun GemstoneScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val stateHolder = rememberBirthDetailsState()
    var state by stateHolder

    var result by remember { mutableStateOf<KundliFullDto?>(null) }
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
                    when (val res = safeApiCall { ApiClient.service.getKundliFull(body) }) {
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
            HeroBanner(
                title = tr("Gemstone & Rudraksha"),
                subtitle = tr("Your classical remedial recommendations"),
                onBack = onBack,
                modifier = Modifier.padding(bottom = 20.dp),
            )

            val current = result
            if (current == null) {
                BirthDetailsForm(state = state, onStateChange = { state = it })

                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = tr("Find My Gemstones"), onClick = { generate() }, modifier = Modifier.padding(top = 20.dp))
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
                GemstoneCard(gemstone = current.gemstones.life)
                GemstoneCard(gemstone = current.gemstones.lucky, modifier = Modifier.padding(top = 12.dp))
                GemstoneCard(gemstone = current.gemstones.fortune, modifier = Modifier.padding(top = 12.dp))
                RudrakshaCard(rudraksha = current.rudraksha, modifier = Modifier.padding(top = 12.dp))
                OutlineGoldButton(text = tr("Check Another"), onClick = { result = null }, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
private fun GemstoneCard(gemstone: GemstoneResultDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Row(modifier = Modifier.fillMaxWidth()) {
                Text(
                    gemstone.purpose,
                    color = colors.goldPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(colors.goldPrimary.copy(alpha = 0.1f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
            Text(
                "${gemstone.gemstone} (${gemstone.sanskritName})",
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
                modifier = Modifier.padding(top = 10.dp),
            )
            Text(
                tr("Ruling planet: ${gemstone.rulingPlanet.replaceFirstChar { it.uppercase() }} · Metal: ${gemstone.metal} · Finger: ${gemstone.finger}"),
                color = colors.textSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                tr("Mantra: ${gemstone.mantra}"),
                color = colors.textSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
            Text(
                gemstone.reason,
                color = colors.textMuted,
                fontSize = 12.sp,
                lineHeight = 17.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

@Composable
private fun RudrakshaCard(rudraksha: RudrakshaResultDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text(
                tr("${rudraksha.mukhi} Mukhi Rudraksha"),
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
            )
            Text(
                tr("Ruling planet: ${rudraksha.rulingPlanet.replaceFirstChar { it.uppercase() }} · Deity: ${rudraksha.deity}"),
                color = colors.textSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                rudraksha.benefits.joinToString(" · "),
                color = colors.goldPrimary,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
            Text(
                rudraksha.howToWear,
                color = colors.textMuted,
                fontSize = 12.sp,
                lineHeight = 17.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}
