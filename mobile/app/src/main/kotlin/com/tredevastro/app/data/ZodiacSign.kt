package com.tredevastro.app.data

import com.tredevastro.app.R

/** Mirrors the RASHIS table in web/frontend/src/pages/calculators/CalculatorPages.tsx's
 * HoroscopePage() exactly — same Sanskrit names, same ruling graha/element,
 * same order. `eng` is what's sent to POST /daily-horoscope. */
data class ZodiacSign(
    val sanskrit: String,
    val eng: String,
    val element: String,
    val rulingGraha: String,
    val iconRes: Int,
)

val ZODIAC_SIGNS = listOf(
    ZodiacSign("Mesha", "Aries", "Fire", "Mars", R.drawable.zodiac_aries),
    ZodiacSign("Vrishabha", "Taurus", "Earth", "Venus", R.drawable.zodiac_taurus),
    ZodiacSign("Mithuna", "Gemini", "Air", "Mercury", R.drawable.zodiac_gemini),
    ZodiacSign("Karka", "Cancer", "Water", "Moon", R.drawable.zodiac_cancer),
    ZodiacSign("Simha", "Leo", "Fire", "Sun", R.drawable.zodiac_leo),
    ZodiacSign("Kanya", "Virgo", "Earth", "Mercury", R.drawable.zodiac_virgo),
    ZodiacSign("Tula", "Libra", "Air", "Venus", R.drawable.zodiac_libra),
    ZodiacSign("Vrischika", "Scorpio", "Water", "Mars", R.drawable.zodiac_scorpio),
    ZodiacSign("Dhanu", "Sagittarius", "Fire", "Jupiter", R.drawable.zodiac_sagittarius),
    ZodiacSign("Makara", "Capricorn", "Earth", "Saturn", R.drawable.zodiac_capricorn),
    ZodiacSign("Kumbha", "Aquarius", "Air", "Saturn", R.drawable.zodiac_aquarius),
    ZodiacSign("Meena", "Pisces", "Water", "Jupiter", R.drawable.zodiac_pisces),
)

/** Ascendant/sign lord lookup — same ruling-graha table, used to label
 * "Ascendant Lord" in the Kundli's Panchang-at-Birth grid. */
fun rulingGrahaFor(rashiEng: String): String = ZODIAC_SIGNS.find { it.eng == rashiEng }?.rulingGraha ?: "—"

/** 0-based rashi index (Aries=0 ... Pisces=11) — the North Indian chart
 * needs this to work out which sign-number occupies each fixed house
 * position, same as web/frontend's chart component. */
fun rashiIndexOf(eng: String): Int = ZODIAC_SIGNS.indexOfFirst { it.eng == eng }.coerceAtLeast(0)
