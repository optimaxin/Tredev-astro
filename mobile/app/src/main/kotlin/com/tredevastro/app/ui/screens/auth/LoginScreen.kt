package com.tredevastro.app.ui.screens.auth

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import android.app.Activity
import com.tredevastro.app.data.auth.AuthException
import com.tredevastro.app.data.auth.AuthRepository
import com.tredevastro.app.data.auth.FirebaseSignIn
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.YatraOne

@Composable
fun LoginScreen(
    onContinue: () -> Unit,
    onGuest: () -> Unit,
) {
    val colors = LocalAppColors.current
    val entrance = remember { Animatable(0f) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var verificationId by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Runs one sign-in attempt: turns any failure into a visible message, and on success hands off to the app.
    fun attempt(block: suspend () -> String) {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            try {
                AuthRepository.loginWithFirebase(context, block())
                onContinue()
            } catch (e: kotlin.coroutines.cancellation.CancellationException) {
                throw e
            } catch (e: androidx.credentials.exceptions.GetCredentialCancellationException) {
                // user closed the Google sheet — not an error
            } catch (e: Exception) {
                error = if (e is AuthException) e.message else e.localizedMessage ?: "Sign-in failed."
            } finally {
                busy = false
            }
        }
    }
    // 10-digit numbers are treated as Indian; anything starting with + is used as typed.
    fun e164(raw: String): String {
        val t = raw.filter { it.isDigit() || it == '+' }
        return if (t.startsWith("+")) t else "+91" + t.removePrefix("0")
    }

    LaunchedEffect(Unit) { entrance.animateTo(1f, animationSpec = tween(600)) }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp)
                .graphicsLayer {
                    alpha = entrance.value
                    translationY = (1f - entrance.value) * 40f
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "TredevAstro",
                color = colors.textPrimary,
                fontFamily = YatraOne,
                fontSize = 30.sp,
            )
            Text(
                text = "Sign in to save your Kundli & consultations",
                color = colors.textSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 36.dp),
            )

            val sent = verificationId
            OutlinedTextField(
                value = if (sent == null) phone else code,
                onValueChange = { v -> if (sent == null) phone = v else code = v.filter { it.isDigit() }.take(6) },
                placeholder = { Text(if (sent == null) "Phone number (+91…)" else "6-digit OTP", color = colors.textMuted) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = colors.textPrimary,
                    unfocusedTextColor = colors.textPrimary,
                    focusedBorderColor = colors.goldPrimary,
                    unfocusedBorderColor = colors.borderStrong,
                    focusedContainerColor = colors.surface.copy(alpha = 0.4f),
                    unfocusedContainerColor = colors.surface.copy(alpha = 0.4f),
                    cursorColor = colors.goldPrimary,
                ),
            )

            error?.let {
                Text(it, color = androidx.compose.ui.graphics.Color(0xFFE57373), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }

            GoldButton(
                text = when {
                    busy -> "Please wait…"
                    sent == null -> "Send OTP"
                    else -> "Verify & Continue"
                },
                onClick = {
                    if (sent == null) {
                        if (phone.count { it.isDigit() } < 8) { error = "Enter a valid phone number."; return@GoldButton }
                        if (busy) return@GoldButton
                        busy = true; error = null
                        scope.launch {
                            try { verificationId = FirebaseSignIn.sendOtp(context as Activity, e164(phone)) }
                            catch (e: kotlin.coroutines.cancellation.CancellationException) { throw e }
                            catch (e: Exception) { error = e.localizedMessage ?: "Could not send OTP." }
                            finally { busy = false }
                        }
                    } else if (code.length != 6) {
                        error = "Enter the 6-digit code."
                    } else {
                        attempt { FirebaseSignIn.verifyOtp(sent, code) }
                    }
                },
                modifier = Modifier.padding(top = 16.dp),
            )
            if (sent != null) {
                OutlineGoldButton(
                    text = "Change number",
                    onClick = { verificationId = null; code = ""; error = null },
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Row(
                modifier = Modifier.padding(vertical = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
                Text(
                    text = "  or  ",
                    color = colors.textMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Light,
                )
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
            }

            OutlineGoldButton(text = "Continue with Google", onClick = { attempt { FirebaseSignIn.google(context as Activity) } })
            OutlineGoldButton(text = "Continue as Guest", onClick = onGuest, modifier = Modifier.padding(top = 8.dp))
        }
    }
}
