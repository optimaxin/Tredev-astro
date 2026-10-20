package com.tredevastro.app.ui.screens.profile

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.ThemeMode
import com.tredevastro.app.ui.theme.NotoSerif

@Composable
fun ProfileScreen(
    themeMode: ThemeMode,
    onToggleTheme: () -> Unit,
    onSignIn: () -> Unit,
    onSignOut: () -> Unit,
    onOpenWallet: () -> Unit,
) {
    val colors = LocalAppColors.current
    var notificationsEnabled by remember { mutableStateOf(true) }
    val signedIn = TokenStore.isSignedIn
    val displayName = TokenStore.userName?.takeIf { it.isNotBlank() } ?: tr("Guest User")
    val displaySubtitle = if (signedIn) TokenStore.userEmail ?: "" else "Sign in to sync your Kundli & bookings"
    val initial = displayName.take(1).uppercase()

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(colors.goldPrimary.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initial, color = colors.goldPrimary, fontFamily = NotoSerif, fontSize = 26.sp)
                }
                Column(modifier = Modifier.padding(start = 16.dp)) {
                    Text(displayName, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
                    Text(tr(displaySubtitle), color = colors.textSecondary, fontSize = 12.sp)
                }
            }

            GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp), onClick = onOpenWallet) {
                SettingsRow(icon = Icons.Filled.AccountBalanceWallet, label = "Wallet", trailing = {
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = colors.textMuted)
                })
            }

            SectionHeader(
                eyebrow = "Settings",
                title = "Preferences",
                modifier = Modifier.padding(top = 24.dp, bottom = 16.dp),
            )

            GlassCard(modifier = Modifier.fillMaxWidth()) {
                SettingsRow(
                    icon = Icons.Filled.DarkMode,
                    label = "Dark theme",
                    trailing = {
                        Switch(
                            checked = themeMode == ThemeMode.Dark,
                            onCheckedChange = { onToggleTheme() },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.goldPrimary, checkedTrackColor = colors.goldPrimary.copy(alpha = 0.4f)),
                        )
                    },
                )
                SettingsDivider()
                SettingsRow(
                    icon = Icons.Filled.Notifications,
                    label = "Notifications",
                    trailing = {
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = { notificationsEnabled = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.goldPrimary, checkedTrackColor = colors.goldPrimary.copy(alpha = 0.4f)),
                        )
                    },
                )
                SettingsDivider()
                SettingsRow(
                    icon = Icons.Filled.Language,
                    label = "Language",
                    trailing = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(tr("English"), color = colors.textMuted, fontSize = 13.sp)
                            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = colors.textMuted)
                        }
                    },
                )
                SettingsDivider()
                SettingsRow(
                    icon = Icons.Filled.Info,
                    label = "About TredevaAstro",
                    trailing = { Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = colors.textMuted) },
                )
            }

            OutlineGoldButton(
                text = if (signedIn) "Sign Out" else "Sign In",
                onClick = if (signedIn) { { TokenStore.clear(); onSignOut() } } else onSignIn,
                modifier = Modifier.padding(top = 32.dp),
            )
        }
    }
}

@Composable
private fun SettingsRow(icon: ImageVector, label: String, trailing: @Composable () -> Unit) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(20.dp))
        Text(
            text = tr(label),
            color = colors.textPrimary,
            fontSize = 14.sp,
            modifier = Modifier.weight(1f).padding(start = 14.dp),
        )
        trailing()
    }
}

@Composable
private fun SettingsDivider() {
    val colors = LocalAppColors.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(1.dp)
            .background(colors.borderSubtle),
    )
}
