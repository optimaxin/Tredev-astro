package com.tredevastro.app.util

import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.BirthDetailsBody
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.BirthDetailsState
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Uses the lat/long a PlaceAutocompleteField pick already resolved, or falls
 * back to a submit-time geocode — same fallback the website's form makes
 * when its own autocomplete pick didn't happen. */
suspend fun BirthDetailsState.resolvedCoordinates(): ApiResult<Pair<Double, Double>> {
    val lat = resolvedLatitude
    val lng = resolvedLongitude
    if (lat != null && lng != null) return ApiResult.Success(lat to lng)
    return when (val geo = safeApiCall { ApiClient.service.geocode(place) }) {
        is ApiResult.Success -> ApiResult.Success(geo.data.latitude to geo.data.longitude)
        is ApiResult.Failure -> ApiResult.Failure(geo.message)
    }
}

/** Builds the request body every birth-chart endpoint expects, from a form
 * state plus a geocoded lat/long. No place->timezone lookup wired yet —
 * approximates with this device's own timezone, same simplification the
 * website's birth-details form makes by defaulting to one fixed zone. */
fun BirthDetailsState.toBirthDetailsBody(latitude: Double, longitude: Double): BirthDetailsBody {
    val dob = dobMillis ?: 0L
    val cal = Calendar.getInstance().apply { timeInMillis = dob }
    val dateStr = String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
    val timeStr = String.format(Locale.US, "%02d:%02d", hour ?: 6, minute ?: 0)
    val offsetMinutes = TimeZone.getDefault().getOffset(dob) / 60_000
    return BirthDetailsBody(
        date = dateStr,
        time = timeStr,
        timezoneOffsetMinutes = offsetMinutes,
        latitude = latitude,
        longitude = longitude,
    )
}
