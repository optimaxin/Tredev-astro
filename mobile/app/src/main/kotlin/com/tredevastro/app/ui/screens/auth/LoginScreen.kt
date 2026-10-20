package com.tredevastro.app.ui.screens.auth

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.tredevastro.app.R
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.FirebaseLoginBody
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import com.tredevastro.app.i18n.tr
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

private enum class LoginMode { START, PHONE_INPUT, OTP_INPUT }

@Composable
fun LoginScreen(
    onContinue: () -> Unit,
    onGuest: () -> Unit,
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val activity = context as Activity
    val scope = rememberCoroutineScope()
    val entrance = remember { Animatable(0f) }

    var mode by remember { mutableStateOf(LoginMode.START) }
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var verificationId by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { entrance.animateTo(1f, animationSpec = tween(600)) }

    val googleSignInClient = remember {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    fun exchangeFirebaseToken(firebaseIdToken: String) {
        isLoading = true
        errorMessage = null
        scope.launch {
            when (val result = safeApiCall { ApiClient.service.loginWithFirebase(FirebaseLoginBody(firebaseIdToken)) }) {
                is ApiResult.Success -> {
                    val auth = result.data
                    TokenStore.save(auth.accessToken, auth.refreshToken, auth.user.name, auth.user.email)
                    onContinue()
                }
                is ApiResult.Failure -> errorMessage = result.message
            }
            isLoading = false
        }
    }

    fun onFirebaseCredentialResult(credentialTask: com.google.android.gms.tasks.Task<com.google.firebase.auth.AuthResult>) {
        credentialTask
            .addOnSuccessListener { authResult ->
                authResult.user?.getIdToken(false)
                    ?.addOnSuccessListener { tokenResult -> exchangeFirebaseToken(tokenResult.token ?: "") }
                    ?.addOnFailureListener { e -> isLoading = false; errorMessage = e.message ?: "Could not complete sign-in" }
            }
            .addOnFailureListener { e -> isLoading = false; errorMessage = e.message ?: "Sign-in failed" }
    }

    val googleLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val googleIdToken = account.idToken
            if (googleIdToken == null) {
                errorMessage = "Google sign-in didn't return a token"
                return@rememberLauncherForActivityResult
            }
            isLoading = true
            errorMessage = null
            val credential = GoogleAuthProvider.getCredential(googleIdToken, null)
            onFirebaseCredentialResult(FirebaseAuth.getInstance().signInWithCredential(credential))
        } catch (e: ApiException) {
            errorMessage = "Google sign-in failed (code ${e.statusCode})"
        }
    }

    fun sendOtp() {
        val digits = phone.filter { it.isDigit() }
        if (digits.length != 10) {
            errorMessage = "Enter a valid 10-digit phone number"
            return
        }
        errorMessage = null
        isLoading = true
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                isLoading = true
                onFirebaseCredentialResult(FirebaseAuth.getInstance().signInWithCredential(credential))
            }
            override fun onVerificationFailed(e: FirebaseException) {
                isLoading = false
                errorMessage = e.message ?: "Could not send OTP"
            }
            override fun onCodeSent(id: String, token: PhoneAuthProvider.ForceResendingToken) {
                isLoading = false
                verificationId = id
                mode = LoginMode.OTP_INPUT
            }
        }
        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber("+91$digits")
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    fun verifyOtp() {
        val id = verificationId ?: return
        if (otp.length < 6) {
            errorMessage = "Enter the 6-digit code"
            return
        }
        errorMessage = null
        isLoading = true
        val credential = PhoneAuthProvider.getCredential(id, otp)
        onFirebaseCredentialResult(FirebaseAuth.getInstance().signInWithCredential(credential))
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = colors.textPrimary,
        unfocusedTextColor = colors.textPrimary,
        focusedBorderColor = colors.goldPrimary,
        unfocusedBorderColor = colors.borderStrong,
        focusedContainerColor = colors.surface.copy(alpha = 0.4f),
        unfocusedContainerColor = colors.surface.copy(alpha = 0.4f),
        cursorColor = colors.goldPrimary,
    )

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        if (mode != LoginMode.START) {
            IconButton(
                onClick = {
                    errorMessage = null
                    mode = if (mode == LoginMode.OTP_INPUT) LoginMode.PHONE_INPUT else LoginMode.START
                },
                modifier = Modifier.padding(top = 8.dp, start = 8.dp),
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = colors.textPrimary)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp)
                .graphicsLayer {
                    alpha = entrance.value
                    translationY = (1f - entrance.value) * 40f
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(text = tr("TredevaAstro"), color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 30.sp)

            when (mode) {
                LoginMode.START -> {
                    Text(
                        text = tr("Sign in to save your Kundli & consultations"),
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp, bottom = 36.dp),
                    )

                    GoldButton(
                        text = tr("Continue with Phone Number"),
                        onClick = { errorMessage = null; mode = LoginMode.PHONE_INPUT },
                    )
                    OutlineGoldButton(
                        text = tr("Continue with Google"),
                        onClick = { errorMessage = null; googleLauncher.launch(googleSignInClient.signInIntent) },
                        modifier = Modifier.padding(top = 12.dp),
                    )

                    if (errorMessage != null) {
                        ErrorBlock(message = errorMessage ?: "", onRetry = {}, modifier = Modifier.padding(top = 16.dp))
                    }
                    if (isLoading) {
                        LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                    }
                }

                LoginMode.PHONE_INPUT -> {
                    Text(
                        text = tr("Enter your phone number to get a one-time code"),
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it.filter { c -> c.isDigit() }.take(10) },
                        placeholder = { Text(tr("Phone number"), color = colors.textMuted) },
                        leadingIcon = { Text(tr("+91"), color = colors.textPrimary, modifier = Modifier.padding(start = 8.dp)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = fieldColors,
                    )
                    if (errorMessage != null) {
                        ErrorBlock(message = errorMessage ?: "", onRetry = { sendOtp() }, modifier = Modifier.padding(top = 16.dp))
                    }
                    if (isLoading) {
                        LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                    } else {
                        GoldButton(text = tr("Send OTP"), onClick = { sendOtp() }, modifier = Modifier.padding(top = 16.dp))
                    }
                }

                LoginMode.OTP_INPUT -> {
                    Text(
                        text = tr("Enter the 6-digit code sent to +91${phone}"),
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                    )
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { otp = it.filter { c -> c.isDigit() }.take(6) },
                        placeholder = { Text(tr("6-digit OTP"), color = colors.textMuted) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = fieldColors,
                    )
                    if (errorMessage != null) {
                        ErrorBlock(message = errorMessage ?: "", onRetry = { verifyOtp() }, modifier = Modifier.padding(top = 16.dp))
                    }
                    if (isLoading) {
                        LoadingBlock(modifier = Modifier.padding(top = 16.dp))
                    } else {
                        GoldButton(text = tr("Verify & Continue"), onClick = { verifyOtp() }, modifier = Modifier.padding(top = 16.dp))
                    }
                }
            }

            Row(modifier = Modifier.padding(vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
                Text(text = tr("  or  "), color = colors.textMuted, fontSize = 12.sp, fontWeight = FontWeight.Light)
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
            }

            OutlineGoldButton(text = tr("Continue as Guest"), onClick = onGuest)
        }
    }
}
