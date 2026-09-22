package com.tredevastro.app.data

/**
 * Placeholder catalog — mirrors the shape of the site's astrologer cards
 * (web/frontend/src/sections/Astrologers) so the real `/api/astrologers`
 * response can drop in later without reshaping this screen.
 */
data class Astrologer(
    val name: String,
    val specialty: String,
    val experienceYears: Int,
    val rating: Double,
    val pricePerMinute: Int,
    val online: Boolean,
)

val SAMPLE_ASTROLOGERS = listOf(
    Astrologer("Acharya Devraj", "Vedic • Kundli Milan", 22, 4.9, 25, online = true),
    Astrologer("Pandit Shivani Joshi", "Tarot • Numerology", 14, 4.8, 18, online = true),
    Astrologer("Acharya Ramesh Pillai", "Vastu • Nadi", 30, 4.9, 32, online = false),
    Astrologer("Guru Meera Nair", "Vedic • Palmistry", 11, 4.7, 15, online = true),
    Astrologer("Acharya Vikram Sinha", "Prashna • Remedies", 18, 4.6, 20, online = false),
)
