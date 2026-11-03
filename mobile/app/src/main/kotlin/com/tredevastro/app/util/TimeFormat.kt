package com.tredevastro.app.util

import com.tredevastro.app.network.dto.TimeWindowDto
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

private val ISO_FORMAT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
}

// The website's homepage Panchang card uses 24-hour time (hindiTime24); its
// separate Choghadiya/Muhurat calculator pages use 12-hour AM/PM (formatIst).
// The app's Panchang screen matches the homepage card, so 24-hour is the
// shared default here.
private val LOCAL_TIME_24H = SimpleDateFormat("HH:mm", Locale.getDefault())

fun formatIsoTime24h(iso: String?): String {
    if (iso == null) return "—"
    return try {
        LOCAL_TIME_24H.format(ISO_FORMAT.parse(iso) ?: return "—")
    } catch (e: Exception) {
        "—"
    }
}

fun formatWindow24h(window: TimeWindowDto?): String {
    if (window == null) return "—"
    return "${formatIsoTime24h(window.start)} – ${formatIsoTime24h(window.end)}"
}

private val LOCAL_DATE = SimpleDateFormat("d MMM yyyy", Locale.getDefault())

// Dasha/transit period boundaries (vimshottariDasha.ts, yoginiDasha.ts) are
// plain "YYYY-MM-DD" strings, not full ISO datetimes with a time component —
// a different shape from the ISO_FORMAT above, which needs its own parser.
private val DASHA_DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.US)

/** Dasha/transit period boundaries are full dates, not times-of-day — used
 * by the Kundli Timeline tab's Mahadasha/Yogini Dasha tables. */
fun formatIsoDate(iso: String?): String {
    if (iso == null) return "—"
    return try {
        LOCAL_DATE.format(DASHA_DATE_FORMAT.parse(iso) ?: return "—")
    } catch (e: Exception) {
        "—"
    }
}
