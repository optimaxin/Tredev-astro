package com.tredevastro.app.data

import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.dto.AstrologerDto
import com.tredevastro.app.network.safeApiCall

/** Mirrors backend/app/models/types.ts's AstrologerStatus, collapsed to the
 * three states the card's dot actually distinguishes (OFFLINE and AWAY both
 * read as "not available right now" to a client). */
enum class PresenceStatus { AVAILABLE, BUSY, OFFLINE }

private fun String.toPresence(): PresenceStatus = when (this) {
    "ONLINE_AVAILABLE" -> PresenceStatus.AVAILABLE
    "ONLINE_BUSY" -> PresenceStatus.BUSY
    else -> PresenceStatus.OFFLINE // OFFLINE, AWAY
}

/**
 * UI-shaped astrologer — mirrors the Stitch mockups
 * (Extra/stitch_tredev_mobile_app_design/consult_astrologers_light). Real
 * data comes from GET /api/astrologers/catalog (see [toUiModel]); [avatarUrl]
 * is null for a seed-roster astrologer that has no photo, in which case the
 * card falls back to initials.
 */
data class Astrologer(
    val id: Int,
    val name: String,
    val specialties: List<String>,
    val experienceYears: Int,
    val rating: Double,
    val pricePerMinute: Int,
    val originalPricePerMinute: Int? = null,
    val languages: List<String>,
    val presence: PresenceStatus = PresenceStatus.OFFLINE,
    val avatarUrl: String? = null,
)

/** The catalog endpoint itself has no live presence (that's the separate
 * GET /api/astrologers feed — see [fetchPresenceMap]), so [presence] is
 * passed in separately and merged by id. */
fun AstrologerDto.toUiModel(baseUrl: String, presence: PresenceStatus): Astrologer {
    val originalPrice = if (activeOfferPercent > 0) {
        (chatPrice / (1 - activeOfferPercent / 100.0)).toInt()
    } else {
        null
    }
    return Astrologer(
        id = id,
        name = name,
        specialties = expertise.take(2).ifEmpty { categories.take(2) },
        experienceYears = experienceYears,
        rating = rating,
        pricePerMinute = chatPrice,
        originalPricePerMinute = originalPrice,
        languages = languages,
        presence = presence,
        avatarUrl = avatar.takeIf { it.isNotBlank() }?.let { path ->
            if (path.startsWith("http")) path else baseUrl.trimEnd('/') + path
        },
    )
}

/** Live presence is best-effort — the catalog is still worth showing even if
 * this one feed is briefly unreachable, so failures just default to OFFLINE
 * dots rather than failing the whole screen. */
private suspend fun fetchPresenceMap(): Map<Int, PresenceStatus> =
    try {
        ApiClient.service.getAstrologerStates().associate { it.id to it.status.toPresence() }
    } catch (e: Exception) {
        emptyMap()
    }

/** Fetches the real catalog and maps it to the UI model in one call —
 * `category`/`consultationType` are the same server-side filters the
 * website's Astrologers page uses (GET /api/astrologers/catalog's
 * `category`/`consultationType` query params), not a client-side filter. */
suspend fun fetchAstrologers(category: String? = null, consultationType: String? = null): ApiResult<List<Astrologer>> {
    return when (val result = safeApiCall { ApiClient.service.getAstrologers(category = category, consultationType = consultationType) }) {
        is ApiResult.Success -> {
            val presenceMap = fetchPresenceMap()
            ApiResult.Success(result.data.map { it.toUiModel(ApiClient.BASE_URL, presenceMap[it.id] ?: PresenceStatus.OFFLINE) })
        }
        is ApiResult.Failure -> result
    }
}

/** Re-polls just the live presence feed and patches it into an already-loaded
 * list, so the dot stays current (website parity) without re-fetching the
 * heavier catalog — call this on a timer from the screen. */
suspend fun refreshPresence(current: List<Astrologer>): List<Astrologer> {
    val presenceMap = fetchPresenceMap()
    if (presenceMap.isEmpty()) return current
    return current.map { it.copy(presence = presenceMap[it.id] ?: PresenceStatus.OFFLINE) }
}

/** Shown only if GET /api/astrologers/catalog fails — so the screen never
 * renders fully empty on a flaky connection. */
val FALLBACK_ASTROLOGERS = listOf(
    Astrologer(
        id = -1,
        name = "Acharya Devraj",
        specialties = listOf("Vedic Jyotish", "Nadi Shastra"),
        experienceYears = 18,
        rating = 4.96,
        pricePerMinute = 25,
        originalPricePerMinute = 35,
        languages = listOf("English", "Hindi"),
        presence = PresenceStatus.AVAILABLE,
    ),
    Astrologer(
        id = -2,
        name = "Dr. Gayatri Devi",
        specialties = listOf("Tarot Reader", "Career Guidance"),
        experienceYears = 14,
        rating = 4.90,
        pricePerMinute = 31,
        languages = listOf("English", "Marathi"),
        presence = PresenceStatus.AVAILABLE,
    ),
    Astrologer(
        id = -3,
        name = "Acharya Ramesh Pillai",
        specialties = listOf("Vastu", "Nadi Shastra"),
        experienceYears = 30,
        rating = 4.9,
        pricePerMinute = 32,
        languages = listOf("English", "Tamil"),
        presence = PresenceStatus.OFFLINE,
    ),
)
