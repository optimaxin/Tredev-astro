package com.tredevastro.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import com.tredevastro.app.navigation.TredevaAstroNavHost
import com.tredevastro.app.network.BirthProfileStore
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.notifications.startPromoNotifications
import com.tredevastro.app.ui.theme.ThemeMode
import com.tredevastro.app.ui.theme.TredevaAstroTheme

class MainActivity : ComponentActivity() {
    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { startPromoNotifications(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        TokenStore.init(this)
        BirthProfileStore.init(this)
        com.tredevastro.app.network.IntroStore.init(this)
        startNotifications()
        enableEdgeToEdge()
        setContent {
            var themeMode by remember { mutableStateOf(ThemeMode.Light) }
            TredevaAstroTheme(themeMode = themeMode) {
                TredevaAstroNavHost(
                    themeMode = themeMode,
                    onToggleTheme = {
                        themeMode = if (themeMode == ThemeMode.Dark) ThemeMode.Light else ThemeMode.Dark
                    },
                )
            }
        }
    }

    private fun startNotifications() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            startPromoNotifications(this)
        } else {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
