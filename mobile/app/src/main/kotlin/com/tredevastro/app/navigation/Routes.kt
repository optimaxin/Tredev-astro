package com.tredevastro.app.navigation

object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val HOME = "home"
    const val KUNDLI = "kundli"
    const val ASTROLOGERS = "astrologers"
    const val HOROSCOPE = "horoscope"
    const val PANCHANG = "panchang"
    const val PROFILE = "profile"
    const val SADE_SATI = "sade_sati"
    const val KUNDLI_MATCHING = "kundli_matching"
    const val ALL_TOOLS = "all_tools"
    const val GEMSTONE = "gemstone"
    const val NAKSHATRA_FINDER = "nakshatra_finder"
    const val LUCKY = "lucky"
    const val BABY_NAME = "baby_name"
    const val LAL_KITAB = "lal_kitab"
    const val KAAL_SARP = "kaal_sarp"
    const val PITRA_DOSHA = "pitra_dosha"
    const val RAHU_KETU_TRANSIT = "rahu_ketu_transit"
    const val NUMEROLOGY = "numerology"
    const val NUMEROLOGY_MATCH = "numerology_match"
    const val FLAMES = "flames"
    const val CHINESE_ZODIAC = "chinese_zodiac"
    const val NUMEROLOGY_HOROSCOPE = "numerology_horoscope"
    const val MUHURAT_FINDER = "muhurat_finder"
    const val CHOGHADIYA = "choghadiya"
    const val ABHIJIT_MUHURAT = "abhijit_muhurat"
    const val TREDEVASTORE = "tredevastore"
    const val WALLET = "wallet"
    const val POOJA = "pooja"
    const val ONBOARDING = "onboarding"
    const val INTRO = "intro"
}

/** The five tabs shown once the visitor is past splash/login — matches the
 * Stitch mockups' bottom nav (Extra/stitch_tredev_mobile_app_design). Panchang
 * stays reachable from Home/All Tools; Pooja takes its bottom-nav slot. */
enum class BottomTab(val route: String, val label: String) {
    Home(Routes.HOME, "Home"),
    Astrologers(Routes.ASTROLOGERS, "Astrologers"),
    Kundli(Routes.KUNDLI, "Kundli"),
    Horoscope(Routes.HOROSCOPE, "Horoscope"),
    Pooja(Routes.POOJA, "Pooja"),
}

/** A category to seed the Astrologers screen's filter with, set right before
 * navigating there and consumed once — mirrors the website's AppContext
 * `astrologerFilter`/`setAstrologerFilter` (set by Pooja's "Book a Pandit"
 * tab, reset after the Astrologers screen reads it once). */
object PendingAstrologerFilter {
    var category: String? = null
}
