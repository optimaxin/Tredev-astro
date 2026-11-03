package com.tredevastro.app.ui.screens.wallet

import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.tredevastro.app.data.WalletStore
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.network.WalletRechargeBody
import com.tredevastro.app.network.dto.PaymentOrderDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.birthFieldColors
import com.tredevastro.app.ui.theme.LocalAppColors
import kotlinx.coroutines.launch

private val QUICK_AMOUNTS = listOf(100, 500, 1000, 2000)

// Must match the deployed backend's CASHFREE_ENV (backend/app/core/config.ts) —
// the website's own checkout has this exact same gap (see paymentService.ts's
// DEFAULT_CASHFREE_MODE), since Cashfree's session id alone doesn't say which
// environment it belongs to.
private const val CASHFREE_MODE = "production"

@Composable
fun WalletScreen(onBack: () -> Unit, onSignIn: () -> Unit) {
    val colors = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val signedIn = TokenStore.isSignedIn

    var balance by remember { mutableStateOf<Int?>(WalletStore.balance) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var customAmount by remember { mutableStateOf("") }
    var checkoutOrder by remember { mutableStateOf<PaymentOrderDto?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableStateOf(0) }

    LaunchedEffect(reloadKey) {
        if (!signedIn) return@LaunchedEffect
        errorMessage = null
        when (val result = safeApiCall { ApiClient.service.getWalletBalance() }) {
            is ApiResult.Success -> {
                balance = result.data.balance
                WalletStore.balance = result.data.balance
            }
            is ApiResult.Failure -> errorMessage = result.message
        }
    }

    fun startRecharge(amount: Int) {
        if (amount < 100) {
            errorMessage = "Minimum top-up is ₹100"
            return
        }
        errorMessage = null
        statusMessage = null
        isLoading = true
        scope.launch {
            when (val result = safeApiCall { ApiClient.service.createWalletRechargeOrder(WalletRechargeBody(amount = amount)) }) {
                is ApiResult.Success -> checkoutOrder = result.data
                is ApiResult.Failure -> errorMessage = result.message
            }
            isLoading = false
        }
    }

    fun onCheckoutDone(paymentId: String) {
        checkoutOrder = null
        scope.launch {
            when (val result = safeApiCall { ApiClient.service.getPaymentStatus(paymentId) }) {
                is ApiResult.Success -> statusMessage = when (result.data.status) {
                    "PAID" -> "Payment successful — wallet updated."
                    "FAILED" -> "Payment failed or was cancelled."
                    else -> "Payment is still processing — check back in a moment."
                }
                is ApiResult.Failure -> statusMessage = null
            }
            reloadKey++
        }
    }

    val activeOrder = checkoutOrder
    if (activeOrder != null) {
        CashfreeOrRazorpayCheckout(order = activeOrder, onDone = { onCheckoutDone(activeOrder.paymentId) })
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            HeroBanner(title = "Wallet", subtitle = "Your prepaid consultation balance", onBack = onBack, modifier = Modifier.padding(bottom = 20.dp))

            if (!signedIn) {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                        Text(tr("Sign in to use your wallet"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Text(
                            tr("Your wallet balance is tied to your account, so it carries over across devices."),
                            color = colors.textSecondary,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
                        )
                        GoldButton(text = "Sign In", onClick = onSignIn)
                    }
                }
                return@Column
            }

            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                    Text(tr("Available Balance"), color = colors.textMuted, fontSize = 12.sp)
                    if (balance == null && errorMessage == null) {
                        LoadingBlock(modifier = Modifier.padding(top = 8.dp))
                    } else {
                        Text(
                            "₹${balance ?: 0}",
                            color = colors.goldPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 32.sp,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }

            if (statusMessage != null) {
                Text(
                    statusMessage ?: "",
                    color = colors.textPrimary,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }

            Text(
                tr("Add Money"),
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                modifier = Modifier.padding(top = 24.dp, bottom = 12.dp),
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                QUICK_AMOUNTS.forEach { amount ->
                    Text(
                        "₹$amount",
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .weight(1f)
                            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
                            .clickable(enabled = !isLoading) { startRecharge(amount) }
                            .padding(vertical = 12.dp),
                    )
                }
            }

            OutlinedTextField(
                value = customAmount,
                onValueChange = { customAmount = it.filter { c -> c.isDigit() } },
                label = { Text(tr("Custom amount (₹)")) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                colors = birthFieldColors(),
            )

            if (errorMessage != null) {
                ErrorBlock(message = errorMessage ?: "", onRetry = { reloadKey++ }, modifier = Modifier.padding(top = 12.dp))
            }

            if (isLoading) {
                LoadingBlock(modifier = Modifier.padding(top = 16.dp))
            } else {
                GoldButton(
                    text = "Add Money",
                    onClick = { startRecharge(customAmount.toIntOrNull() ?: 0) },
                    modifier = Modifier.padding(top = 16.dp),
                )
            }
        }
    }
}

@Composable
private fun CashfreeOrRazorpayCheckout(order: PaymentOrderDto, onDone: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            val url = request?.url?.toString() ?: return false
                            if (url.contains("payment_id=")) {
                                onDone()
                                return true
                            }
                            return false
                        }
                    }
                    val redirectUrl = order.redirectUrl
                    val sessionId = order.paymentSessionId
                    if (redirectUrl != null) {
                        loadUrl(redirectUrl)
                    } else if (sessionId != null) {
                        loadDataWithBaseURL("https://tredevaastro.com", cashfreeCheckoutHtml(sessionId, order.cashfreeMode ?: CASHFREE_MODE), "text/html", "utf-8", null)
                    }
                }
            },
        )
    }
}

private fun cashfreeCheckoutHtml(sessionId: String, mode: String = CASHFREE_MODE) = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    </head>
    <body style="margin:0;background:#faf5e9;">
        <script>
            var cashfree = Cashfree({ mode: "$mode" });
            cashfree.checkout({ paymentSessionId: "$sessionId", redirectTarget: "_self" });
        </script>
    </body>
    </html>
""".trimIndent()
