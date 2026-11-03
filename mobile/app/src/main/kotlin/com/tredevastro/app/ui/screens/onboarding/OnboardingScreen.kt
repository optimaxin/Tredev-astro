package com.tredevastro.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material3.DatePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.BirthDetailsPatchBody
import com.tredevastro.app.network.BirthProfileStore
import com.tredevastro.app.network.NamePatchBody
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.PlaceAutocompleteField
import com.tredevastro.app.ui.components.birthFieldColors
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

private enum class Step { NAME, GENDER, DOB, TOB, POB, PROMO }

private val STEP_ORDER = listOf(Step.NAME, Step.GENDER, Step.DOB, Step.TOB, Step.POB, Step.PROMO)

/** The post-login "shandaar" wizard — one full page per field (name, gender,
 * DOB, optional TOB, POB), ending in a "first chat's free" promo page, then
 * into Home. Runs exactly once per install (BirthProfileStore.onboardingDone)
 * — a returning signed-in user whose account already has birth-details skips
 * straight to Home from NavGraph, never reaching this screen at all.
 * Gender has no backend field (mirrors the website's own free-Kundli form —
 * BirthDetailsForm.tsx's showGenderField is client-side-only), so it's saved
 * to BirthProfileStore only; name/DOB/TOB/POB are also PATCHed to the real
 * account (same backend the website writes to) when signed in — a guest
 * keeps them local-only, same trust level as the rest of guest mode. */
@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    var step by remember { mutableStateOf(Step.NAME) }
    var name by remember { mutableStateOf(BirthProfileStore.name ?: TokenStore.userName.orEmpty()) }
    var gender by remember { mutableStateOf<String?>(BirthProfileStore.gender) }
    var dobMillis by remember { mutableStateOf(BirthProfileStore.dobMillis) }
    var hour by remember { mutableStateOf(BirthProfileStore.hour) }
    var minute by remember { mutableStateOf(BirthProfileStore.minute) }
    var place by remember { mutableStateOf(BirthProfileStore.place ?: "") }
    var resolvedLat by remember { mutableStateOf(BirthProfileStore.latitude) }
    var resolvedLng by remember { mutableStateOf(BirthProfileStore.longitude) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var placeError by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val colors = LocalAppColors.current
    val stepIndex = STEP_ORDER.indexOf(step)

    fun goTo(s: Step) { step = s }

    fun persistAndFinish() {
        BirthProfileStore.name = name.trim()
        BirthProfileStore.gender = gender
        BirthProfileStore.dobMillis = dobMillis
        BirthProfileStore.hour = hour
        BirthProfileStore.minute = minute
        BirthProfileStore.place = place.trim()
        BirthProfileStore.latitude = resolvedLat
        BirthProfileStore.longitude = resolvedLng
        BirthProfileStore.onboardingDone = true

        // Best-effort account sync — same tolerance HomeBannerCarousel's
        // getActiveBanners() call has for a failed/offline request: the
        // wizard has already moved on to the promo page by the time this
        // resolves, so there's nothing useful to show an error for.
        if (TokenStore.isSignedIn) {
            scope.launch {
                try { ApiClient.service.updateMyName(NamePatchBody(name.trim())) } catch (e: Exception) { /* best-effort */ }
                val dob = dobMillis
                val lat = resolvedLat
                val lng = resolvedLng
                if (dob != null && lat != null && lng != null) {
                    try {
                        val cal = Calendar.getInstance().apply { timeInMillis = dob }
                        val dateStr = String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
                        val timeStr = String.format(Locale.US, "%02d:%02d", hour ?: 6, minute ?: 0)
                        val offsetMinutes = TimeZone.getDefault().getOffset(dob) / 60_000
                        ApiClient.service.updateMyBirthDetails(BirthDetailsPatchBody(dateStr, timeStr, place.trim(), lat, lng, offsetMinutes))
                    } catch (e: Exception) { /* best-effort */ }
                }
            }
        }
        goTo(Step.PROMO)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                if (stepIndex > 0 && step != Step.PROMO) {
                    IconButton(onClick = { goTo(STEP_ORDER[stepIndex - 1]) }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = colors.textPrimary)
                    }
                } else {
                    Spacer(modifier = Modifier.size(48.dp))
                }
                Spacer(modifier = Modifier.weight(1f))
                if (step != Step.PROMO) {
                    Text(tr("Step ${stepIndex + 1} of ${STEP_ORDER.size - 1}"), color = colors.textMuted, fontSize = 12.sp)
                }
                Spacer(modifier = Modifier.size(48.dp))
            }

            if (step != Step.PROMO) {
                val progress = (stepIndex + 1f) / (STEP_ORDER.size - 1)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp, bottom = 8.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(colors.bgSecondary),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .fillMaxSize()
                            .clip(RoundedCornerShape(999.dp))
                            .background(colors.goldPrimary),
                    )
                }
            }

            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    (slideInHorizontally(initialOffsetX = { it }) + fadeIn()) togetherWith
                        (slideOutHorizontally(targetOffsetX = { -it }) + fadeOut())
                },
                modifier = Modifier.weight(1f).fillMaxWidth(),
                label = "onboarding-step",
            ) { s ->
                when (s) {
                    Step.NAME -> NameStep(
                        name = name,
                        onNameChange = { name = it; nameError = null },
                        error = nameError,
                        onNext = {
                            if (name.trim().length < 2) nameError = "Please enter your name" else goTo(Step.GENDER)
                        },
                    )
                    Step.GENDER -> GenderStep(selected = gender, onSelect = { gender = it }, onNext = { goTo(Step.DOB) })
                    Step.DOB -> DobStep(dobMillis = dobMillis, onDobChange = { dobMillis = it }, onNext = { if (dobMillis != null) goTo(Step.TOB) })
                    Step.TOB -> TobStep(
                        hour = hour,
                        minute = minute,
                        onTimeChange = { h, m -> hour = h; minute = m },
                        onNext = { goTo(Step.POB) },
                        onSkip = { hour = null; minute = null; goTo(Step.POB) },
                    )
                    Step.POB -> PobStep(
                        place = place,
                        onPlaceChange = { place = it; resolvedLat = null; resolvedLng = null; placeError = null },
                        onResolved = { lat, lng -> resolvedLat = lat; resolvedLng = lng },
                        error = placeError,
                        onNext = {
                            if (place.trim().length < 2) placeError = "Please enter your place of birth" else persistAndFinish()
                        },
                    )
                    Step.PROMO -> PromoStep(onComplete = onComplete)
                }
            }
        }
    }
}

@Composable
private fun StepScaffold(
    title: String,
    subtitle: String,
    continueLabel: String = "Continue",
    onNext: () -> Unit,
    secondaryAction: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Spacer(modifier = Modifier.size(24.dp))
        Text(tr(title), color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 26.sp)
        Text(tr(subtitle), color = colors.textSecondary, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp, bottom = 28.dp))
        content()
        Spacer(modifier = Modifier.size(28.dp))
        GoldButton(text = tr(continueLabel), onClick = onNext)
        secondaryAction?.invoke()
        Spacer(modifier = Modifier.size(24.dp))
    }
}

@Composable
private fun NameStep(name: String, onNameChange: (String) -> Unit, error: String?, onNext: () -> Unit) {
    StepScaffold(title = "What should we call you?", subtitle = "Your name, as it'll appear on your Kundli.", onNext = onNext) {
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text(tr("Full name")) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = birthFieldColors(),
        )
        if (error != null) Text(tr(error), color = Color(0xFFC0392B), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun GenderStep(selected: String?, onSelect: (String) -> Unit, onNext: () -> Unit) {
    StepScaffold(title = "Which best describes you?", subtitle = "Helps us address you right — never shared or shown to anyone.", onNext = onNext) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("Male", "Female", "Other").forEach { option ->
                GenderOption(label = option, selected = selected == option, onClick = { onSelect(option) })
            }
        }
    }
}

@Composable
private fun GenderOption(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) colors.goldPrimary.copy(alpha = 0.15f) else colors.bgSecondary)
            .border(width = 1.dp, color = if (selected) colors.goldPrimary else Color.Transparent, shape = RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp),
    ) {
        Text(
            tr(label),
            color = if (selected) colors.goldPrimary else colors.textPrimary,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            fontSize = 15.sp,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DobStep(dobMillis: Long?, onDobChange: (Long) -> Unit, onNext: () -> Unit) {
    val pickerState = rememberDatePickerState(initialSelectedDateMillis = dobMillis)
    StepScaffold(title = "When were you born?", subtitle = "Your date of birth — the foundation of your Kundli.", onNext = {
        pickerState.selectedDateMillis?.let(onDobChange)
        onNext()
    }) {
        DatePicker(state = pickerState, showModeToggle = false, modifier = Modifier.fillMaxWidth())
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TobStep(hour: Int?, minute: Int?, onTimeChange: (Int, Int) -> Unit, onNext: () -> Unit, onSkip: () -> Unit) {
    val colors = LocalAppColors.current
    val pickerState = rememberTimePickerState(initialHour = hour ?: 6, initialMinute = minute ?: 0, is24Hour = false)
    StepScaffold(
        title = "What time were you born?",
        subtitle = "Optional, but the more precise your chart, the better — skip if you don't know it.",
        onNext = {
            onTimeChange(pickerState.hour, pickerState.minute)
            onNext()
        },
        secondaryAction = {
            OutlineGoldButton(text = tr("I don't know — skip this"), onClick = onSkip, modifier = Modifier.padding(top = 12.dp))
        },
    ) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            TimePicker(state = pickerState)
        }
    }
}

@Composable
private fun PobStep(place: String, onPlaceChange: (String) -> Unit, onResolved: (Double, Double) -> Unit, error: String?, onNext: () -> Unit) {
    StepScaffold(title = "Where were you born?", subtitle = "Your birth city — used to read your chart's houses correctly.", onNext = onNext) {
        PlaceAutocompleteField(value = place, onValueChange = onPlaceChange, onResolved = onResolved, modifier = Modifier.fillMaxWidth())
        if (error != null) Text(tr(error), color = Color(0xFFC0392B), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun PromoStep(onComplete: () -> Unit) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(84.dp)
                .clip(CircleShape)
                .background(colors.goldPrimary.copy(alpha = 0.18f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.CardGiftcard, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(42.dp))
        }
        Text(
            tr("Your First Chat is FREE!"),
            color = colors.textPrimary,
            fontFamily = NotoSerif,
            fontSize = 26.sp,
            modifier = Modifier.padding(top = 20.dp),
        )
        Text(
            tr("Talk to a real Vedic astrologer about your chart — on us, for your very first session."),
            color = colors.textSecondary,
            fontSize = 14.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(top = 10.dp, start = 12.dp, end = 12.dp),
        )
        GoldButton(text = tr("Let's Begin"), onClick = onComplete, modifier = Modifier.padding(top = 32.dp))
    }
}
