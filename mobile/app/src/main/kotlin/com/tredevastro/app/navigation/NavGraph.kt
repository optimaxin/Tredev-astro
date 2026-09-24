package com.tredevastro.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.tredevastro.app.ui.components.BottomNavBar
import com.tredevastro.app.ui.screens.astrologers.AstrologersScreen
import com.tredevastro.app.ui.screens.auth.LoginScreen
import com.tredevastro.app.ui.screens.home.HomeScreen
import com.tredevastro.app.ui.screens.kundli.KundliScreen
import com.tredevastro.app.ui.screens.profile.ProfileScreen
import com.tredevastro.app.ui.screens.splash.SplashScreen
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.ThemeMode

@Composable
fun TredevAstroNavHost(
    themeMode: ThemeMode,
    onToggleTheme: () -> Unit,
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = BottomTab.entries.any { it.route == currentRoute }
    val colors = LocalAppColors.current

    fun goToTab(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        containerColor = colors.bgPrimary,
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(currentRoute = currentRoute, onSelect = { tab -> goToTab(tab.route) })
            }
        },
    ) { insets ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            modifier = Modifier.padding(bottom = insets.calculateBottomPadding()),
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(
                    onFinished = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.LOGIN) {
                val goHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
                LoginScreen(onContinue = goHome, onGuest = goHome)
            }

            composable(Routes.HOME) {
                HomeScreen(onNavigate = { route -> goToTab(route) })
            }

            composable(Routes.KUNDLI) { KundliScreen() }

            composable(Routes.ASTROLOGERS) { AstrologersScreen() }

            composable(Routes.PROFILE) {
                ProfileScreen(
                    themeMode = themeMode,
                    onToggleTheme = onToggleTheme,
                    onSignIn = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    },
                )
            }
        }
    }
}
