package com.tredevastro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tredevastro.app.navigation.TredevaAstroNavHost
import com.tredevastro.app.network.BirthProfileStore
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.ui.theme.ThemeMode
import com.tredevastro.app.ui.theme.TredevaAstroTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        TokenStore.init(this)
        BirthProfileStore.init(this)
        com.tredevastro.app.network.IntroStore.init(this)
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
}
