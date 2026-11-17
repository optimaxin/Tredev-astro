package com.tredevastro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tredevastro.app.navigation.TredevAstroNavHost
import com.tredevastro.app.ui.theme.ThemeMode
import com.tredevastro.app.ui.theme.TredevAstroTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var themeMode by remember { mutableStateOf(ThemeMode.Dark) }
            TredevAstroTheme(themeMode = themeMode) {
                TredevAstroNavHost(
                    themeMode = themeMode,
                    onToggleTheme = {
                        themeMode = if (themeMode == ThemeMode.Dark) ThemeMode.Light else ThemeMode.Dark
                    },
                )
            }
        }
    }
}
