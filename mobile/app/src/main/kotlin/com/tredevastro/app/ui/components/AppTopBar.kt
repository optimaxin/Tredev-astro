package com.tredevastro.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.data.WalletStore
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif

/** Header used on primary tabs — compact, modern, balanced layout. */
@Composable
fun AppTopBar(
    onProfileClick: () -> Unit,
    modifier: Modifier = Modifier,
    onWalletClick: (() -> Unit)? = null,
    isHindi: Boolean = false,
    onToggleLanguage: ((Boolean) -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    val balance = WalletStore.balance
    val displayBalance = when {
        balance != null -> "₹$balance"
        TokenStore.isSignedIn -> "₹0"
        else -> "₹—"
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.bgPrimary)
            .statusBarsPadding()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(R.drawable.logo_mark),
            contentDescription = null,
            modifier = Modifier.size(32.dp).clip(RoundedCornerShape(6.dp)),
        )
        Text(
            text = tr("TredevaAstro"),
            color = colors.goldPrimary,
            fontFamily = NotoSerif,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            modifier = Modifier.padding(start = 6.dp).weight(1f),
        )

        if (onWalletClick != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(colors.goldPrimary.copy(alpha = 0.12f))
                    .border(width = 0.8.dp, color = colors.goldPrimary.copy(alpha = 0.35f), shape = RoundedCornerShape(6.dp))
                    .clickable(onClick = onWalletClick)
                    .padding(horizontal = 7.dp, vertical = 4.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.AccountBalanceWallet,
                    contentDescription = "Wallet",
                    tint = colors.goldPrimary,
                    modifier = Modifier.size(13.dp),
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = displayBalance,
                    color = colors.goldPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp,
                )
            }
            Spacer(modifier = Modifier.width(6.dp))
        }

        if (onToggleLanguage != null) {
            LanguageToggle(
                isHindi = isHindi,
                onToggle = onToggleLanguage,
                modifier = Modifier
                    .background(colors.goldPrimary.copy(alpha = 0.10f), RoundedCornerShape(6.dp))
                    .border(width = 0.8.dp, color = colors.goldPrimary.copy(alpha = 0.25f), shape = RoundedCornerShape(6.dp)),
                selectedBg = colors.goldPrimary,
                selectedText = colors.surface,
                unselectedText = colors.textSecondary,
            )
            Spacer(modifier = Modifier.width(6.dp))
        }

        Icon(
            imageVector = Icons.Filled.Notifications,
            contentDescription = "Notifications",
            tint = colors.textSecondary,
            modifier = Modifier.size(19.dp),
        )

        Box(
            modifier = Modifier
                .padding(start = 6.dp)
                .size(28.dp)
                .background(colors.goldPrimary.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                .border(width = 0.8.dp, color = colors.goldPrimary.copy(alpha = 0.35f), shape = RoundedCornerShape(6.dp))
                .clickable(onClick = onProfileClick),
            contentAlignment = Alignment.Center,
        ) {
            val userInitial = TokenStore.userName?.firstOrNull()?.uppercaseChar()?.toString() ?: "G"
            Text(userInitial, color = colors.goldPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        }
    }
}
