package com.tredevastro.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.LaunchedEffect
import com.tredevastro.app.data.WalletStore
import com.tredevastro.app.ui.components.AppTopBar
import com.tredevastro.app.ui.components.BottomNavBar
import com.tredevastro.app.ui.screens.alltools.AllToolsScreen
import com.tredevastro.app.ui.screens.astrologers.AstrologersScreen
import com.tredevastro.app.ui.screens.auth.LoginScreen
import com.tredevastro.app.ui.screens.gemstone.GemstoneScreen
import com.tredevastro.app.ui.screens.tools.BabyNameScreen
import com.tredevastro.app.ui.screens.tools.ChineseZodiacScreen
import com.tredevastro.app.ui.screens.tools.FlamesScreen
import com.tredevastro.app.ui.screens.tools.KaalSarpDoshaScreen
import com.tredevastro.app.ui.screens.tools.LalKitabScreen
import com.tredevastro.app.ui.screens.tools.LuckyAttributesScreen
import com.tredevastro.app.ui.screens.tools.NakshatraFinderScreen
import com.tredevastro.app.ui.screens.tools.NumerologyHoroscopeScreen
import com.tredevastro.app.ui.screens.tools.NumerologyMatchScreen
import com.tredevastro.app.ui.screens.tools.NumerologyScreen
import com.tredevastro.app.ui.screens.tools.PitraDoshaScreen
import com.tredevastro.app.ui.screens.tools.RahuKetuTransitScreen
import com.tredevastro.app.ui.screens.home.HomeScreen
import com.tredevastro.app.ui.screens.horoscope.HoroscopeScreen
import com.tredevastro.app.ui.screens.kundli.KundliScreen
import com.tredevastro.app.ui.screens.kundlimatching.KundliMatchingScreen
import com.tredevastro.app.ui.screens.muhurat.AbhijitMuhuratScreen
import com.tredevastro.app.ui.screens.muhurat.ChoghadiyaScreen
import com.tredevastro.app.ui.screens.muhurat.MuhuratFinderScreen
import com.tredevastro.app.i18n.LocalHindi
import com.tredevastro.app.network.BirthProfileStore
import com.tredevastro.app.ui.screens.onboarding.OnboardingScreen
import com.tredevastro.app.ui.screens.panchang.PanchangScreen
import com.tredevastro.app.ui.screens.pooja.PoojaScreen
import com.tredevastro.app.ui.screens.sadesati.SadeSatiScreen
import com.tredevastro.app.ui.screens.profile.ProfileScreen
import com.tredevastro.app.ui.screens.splash.SplashScreen
import com.tredevastro.app.ui.screens.wallet.WalletScreen
import com.tredevastro.app.ui.screens.webview.WebViewScreen
import com.tredevastro.app.network.IntroStore
import com.tredevastro.app.ui.screens.intro.IntroWalkthroughScreen
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.ThemeMode

@Composable
fun TredevaAstroNavHost(
    themeMode: ThemeMode,
    onToggleTheme: () -> Unit,
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = BottomTab.entries.any { it.route == currentRoute }
    val colors = LocalAppColors.current
    var isHindi by remember { mutableStateOf(false) }

    fun goToTab(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    LaunchedEffect(currentRoute) {
        WalletStore.refresh()
    }

    CompositionLocalProvider(LocalHindi provides isHindi) {
    Scaffold(
        containerColor = colors.bgPrimary,
        topBar = {
            if (showBottomBar) {
                AppTopBar(
                    onProfileClick = { navController.navigate(Routes.PROFILE) },
                    onWalletClick = { navController.navigate(Routes.WALLET) },
                    isHindi = isHindi,
                    onToggleLanguage = { isHindi = it },
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(currentRoute = currentRoute, onSelect = { tab -> goToTab(tab.route) })
            }
        },
    ) { insets ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            modifier = Modifier.padding(insets),
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(
                    onFinished = {
                        val destination = when {
                            !IntroStore.introDone -> Routes.INTRO
                            com.tredevastro.app.network.TokenStore.isSignedIn -> Routes.HOME
                            else -> Routes.LOGIN
                        }
                        navController.navigate(destination) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.INTRO) {
                IntroWalkthroughScreen(
                    onFinish = {
                        val destination = if (com.tredevastro.app.network.TokenStore.isSignedIn) Routes.HOME else Routes.LOGIN
                        navController.navigate(destination) {
                            popUpTo(Routes.INTRO) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.LOGIN) {
                val afterAuth = {
                    val destination = if (BirthProfileStore.onboardingDone) Routes.HOME else Routes.ONBOARDING
                    navController.navigate(destination) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
                LoginScreen(onContinue = afterAuth, onGuest = afterAuth)
            }

            composable(Routes.ONBOARDING) {
                OnboardingScreen(
                    onComplete = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.ONBOARDING) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.HOME) {
                HomeScreen(
                    onNavigate = { route ->
                        if (BottomTab.entries.any { it.route == route }) goToTab(route) else navController.navigate(route)
                    },
                )
            }

            composable(Routes.KUNDLI) { KundliScreen() }

            composable(Routes.ASTROLOGERS) { AstrologersScreen() }

            composable(Routes.HOROSCOPE) { HoroscopeScreen() }

            composable(Routes.PANCHANG) { PanchangScreen(onBack = { navController.popBackStack() }) }

            composable(Routes.POOJA) {
                PoojaScreen(
                    onRequireLogin = { navController.navigate(Routes.LOGIN) { popUpTo(Routes.HOME) { inclusive = true } } },
                    onBrowsePandits = {
                        PendingAstrologerFilter.category = "Pooja"
                        goToTab(Routes.ASTROLOGERS)
                    },
                )
            }

            composable(Routes.SADE_SATI) { SadeSatiScreen(onBack = { navController.popBackStack() }) }

            composable(Routes.KUNDLI_MATCHING) { KundliMatchingScreen(onBack = { navController.popBackStack() }) }

            composable(Routes.GEMSTONE) { GemstoneScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.NAKSHATRA_FINDER) { NakshatraFinderScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.LUCKY) { LuckyAttributesScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.BABY_NAME) { BabyNameScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.LAL_KITAB) { LalKitabScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.KAAL_SARP) { KaalSarpDoshaScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.PITRA_DOSHA) { PitraDoshaScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.RAHU_KETU_TRANSIT) { RahuKetuTransitScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.NUMEROLOGY) { NumerologyScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.NUMEROLOGY_MATCH) { NumerologyMatchScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.FLAMES) { FlamesScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.CHINESE_ZODIAC) { ChineseZodiacScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.NUMEROLOGY_HOROSCOPE) { NumerologyHoroscopeScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.MUHURAT_FINDER) { MuhuratFinderScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.CHOGHADIYA) { ChoghadiyaScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.ABHIJIT_MUHURAT) { AbhijitMuhuratScreen(onBack = { navController.popBackStack() }) }

            composable(Routes.TREDEVASTORE) {
                WebViewScreen(url = "https://tredevastore.com/", title = "TredevaStore", onBack = { navController.popBackStack() })
            }

            composable(Routes.WALLET) {
                WalletScreen(
                    onBack = { navController.popBackStack() },
                    onSignIn = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.ALL_TOOLS) {
                AllToolsScreen(
                    onNavigate = { route ->
                        if (BottomTab.entries.any { it.route == route }) goToTab(route) else navController.navigate(route)
                    },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.PROFILE) {
                val goToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
                ProfileScreen(
                    themeMode = themeMode,
                    onToggleTheme = onToggleTheme,
                    onSignIn = goToLogin,
                    onSignOut = goToLogin,
                    onOpenWallet = { navController.navigate(Routes.WALLET) },
                )
            }
        }
    }
    }
}
