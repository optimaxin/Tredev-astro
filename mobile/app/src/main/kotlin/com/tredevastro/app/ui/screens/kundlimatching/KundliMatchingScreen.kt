package com.tredevastro.app.ui.screens.kundlimatching

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.KundliMatchingBody
import com.tredevastro.app.network.dto.DoshaVerdictDto
import com.tredevastro.app.network.dto.KootaDto
import com.tredevastro.app.network.dto.KundliMatchingReportDto
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
import com.tredevastro.app.ui.theme.NotoSerif
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.util.resolvedCoordinates
import com.tredevastro.app.util.toBirthDetailsBody
import kotlinx.coroutines.launch

@Composable
fun KundliMatchingScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val brideHolder = rememberBirthDetailsState()
    val groomHolder = rememberBirthDetailsState()
    var bride by brideHolder
    var groom by groomHolder

    var result by remember { mutableStateOf<KundliMatchingReportDto?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val canGenerate = bride.name.isNotBlank() && bride.dobMillis != null && bride.place.isNotBlank() &&
        groom.name.isNotBlank() && groom.dobMillis != null && groom.place.isNotBlank() && !isLoading

    fun generate() {
        errorMessage = null
        isLoading = true
        scope.launch {
            val brideGeo = bride.resolvedCoordinates()
            val groomGeo = groom.resolvedCoordinates()
            if (brideGeo is ApiResult.Success && groomGeo is ApiResult.Success) {
                val (brideLat, brideLng) = brideGeo.data
                val (groomLat, groomLng) = groomGeo.data
                val body = KundliMatchingBody(
                    bride = bride.toBirthDetailsBody(brideLat, brideLng),
                    groom = groom.toBirthDetailsBody(groomLat, groomLng),
                )
                when (val res = safeApiCall { ApiClient.service.getKundliMatching(body) }) {
                    is ApiResult.Success -> result = res.data
                    is ApiResult.Failure -> errorMessage = res.message
                }
            } else {
                val failure = (brideGeo as? ApiResult.Failure) ?: (groomGeo as? ApiResult.Failure)
                errorMessage = "Couldn't resolve a place — ${failure?.message ?: "please check both cities"}"
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(
                title = tr("Kundli Matching"),
                subtitle = tr("Ashtakoot Guna Milan — 36-point Vedic compatibility"),
                onBack = onBack,
                modifier = Modifier.padding(bottom = 20.dp),
            )

            val current = result
            if (current == null) {
                Text(tr("Bride's Details"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(bottom = 10.dp))
                BirthDetailsForm(state = bride, onStateChange = { bride = it }, namePlaceholder = tr("Bride's full name"))

                Text(tr("Groom's Details"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp))
                BirthDetailsForm(state = groom, onStateChange = { groom = it }, namePlaceholder = tr("Groom's full name"))

                if (isLoading) {
                    LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                } else {
                    GoldButton(text = tr("Check Compatibility"), onClick = { generate() }, modifier = Modifier.padding(top = 24.dp))
                    if (!canGenerate) {
                        Text(
                            tr("Fill in both partners' name, date and place of birth to continue."),
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
                MatchingResult(result = current)
                OutlineGoldButton(text = tr("Check Another Match"), onClick = { result = null }, modifier = Modifier.padding(top = 24.dp))
            }
        }
    }
}

@Composable
private fun MatchingResult(result: KundliMatchingReportDto) {
    val colors = LocalAppColors.current
    Column {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .background(colors.goldPrimary.copy(alpha = 0.12f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${result.gunMilan.totalPoints}", color = colors.goldPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.Bold, fontSize = 28.sp)
                        Text(tr("/ ${result.gunMilan.maxPoints}"), color = colors.textMuted, fontSize = 11.sp)
                    }
                }
                Text(
                    result.finalAssessment.grade,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(top = 12.dp),
                )
                Text(
                    tr("Total Milan Score"),
                    color = colors.textMuted,
                    fontSize = 11.sp,
                )
            }
        }

        Text(tr("Ashtakoota Breakdown"), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, modifier = Modifier.padding(top = 24.dp, bottom = 12.dp))
        result.gunMilan.kootas.forEachIndexed { index, koota ->
            KootaRow(index = index + 1, koota = koota, modifier = Modifier.padding(bottom = 10.dp))
        }

        Text(tr("Dosha Check"), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, modifier = Modifier.padding(top = 12.dp, bottom = 12.dp))
        DoshaCard(label = "Bhakoot Dosha", verdict = result.bhakoot, modifier = Modifier.padding(bottom = 10.dp))
        DoshaCard(label = "Nadi Dosha", verdict = result.nadi)

        if (result.finalAssessment.reasoning.isNotEmpty()) {
            GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                    Text(tr("Astrologer's Verdict"), color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    result.finalAssessment.reasoning.forEach { line ->
                        Text("• $line", color = colors.textSecondary, fontSize = 12.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun KootaRow(index: Int, koota: KootaDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("$index. ${koota.name}", color = colors.textPrimary, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                Text(
                    tr("${koota.points} / ${koota.maxPoints} Pts"),
                    color = colors.goldPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(colors.goldPrimary.copy(alpha = 0.1f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
            val fraction = if (koota.maxPoints > 0) koota.points.toFloat() / koota.maxPoints else 0f
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .height(5.dp)
                    .background(colors.bgSecondary, RoundedCornerShape(999.dp)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction.coerceIn(0f, 1f))
                        .height(5.dp)
                        .background(colors.goldPrimary, RoundedCornerShape(999.dp)),
                )
            }
        }
    }
}

@Composable
private fun DoshaCard(label: String, verdict: DoshaVerdictDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val tint = if (verdict.status == "Absent") androidx.compose.ui.graphics.Color(0xFF50C878) else colors.sacredAccent
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(tr(label), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(
                    tr(verdict.status),
                    color = tint,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    modifier = Modifier
                        .background(tint.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Text(verdict.reason, color = colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
            if (verdict.cancellation != "Not applicable" && verdict.cancellation != "None") {
                Text(tr("Cancellation: ${verdict.cancellation}"), color = colors.goldPrimary, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}
