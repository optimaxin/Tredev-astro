package com.tredevastro.app.navigation

object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val HOME = "home"
    const val KUNDLI = "kundli"
    const val ASTROLOGERS = "astrologers"
    const val PROFILE = "profile"
}

/** The four tabs shown once the visitor is past splash/login. */
enum class BottomTab(val route: String, val label: String) {
    Home(Routes.HOME, "Home"),
    Kundli(Routes.KUNDLI, "Kundli"),
    Astrologers(Routes.ASTROLOGERS, "Astrologers"),
    Profile(Routes.PROFILE, "Profile"),
}
