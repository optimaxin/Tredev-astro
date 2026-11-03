package com.tredevastro.app.network

import android.content.Context
import android.content.SharedPreferences

/** The onboarding wizard's collected profile — plain SharedPreferences, same
 * trust level as TokenStore. Gender has no backend field at all (mirrors the
 * website's own free-Kundli form, where it's client-side-only — see
 * BirthDetailsForm.tsx's showGenderField), so it lives here only; name/DOB/
 * TOB/POB are also mirrored to the real account via PATCH /me/birth-details
 * and /me/name once the wizard finishes, for a signed-in (non-guest) user. */
object BirthProfileStore {
    private const val PREFS = "birth_profile_prefs"
    private const val KEY_ONBOARDING_DONE = "onboarding_done"
    private const val KEY_NAME = "profile_name"
    private const val KEY_GENDER = "profile_gender"
    private const val KEY_DOB_MILLIS = "profile_dob_millis"
    private const val KEY_HOUR = "profile_hour"
    private const val KEY_MINUTE = "profile_minute"
    private const val KEY_PLACE = "profile_place"
    private const val KEY_LATITUDE = "profile_latitude"
    private const val KEY_LONGITUDE = "profile_longitude"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    var onboardingDone: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING_DONE, false)
        set(value) = prefs.edit().putBoolean(KEY_ONBOARDING_DONE, value).apply()

    var name: String?
        get() = prefs.getString(KEY_NAME, null)
        set(value) = prefs.edit().putString(KEY_NAME, value).apply()

    /** "Male" / "Female" / "Other" — see OnboardingScreen's GenderStep. */
    var gender: String?
        get() = prefs.getString(KEY_GENDER, null)
        set(value) = prefs.edit().putString(KEY_GENDER, value).apply()

    var dobMillis: Long?
        get() = prefs.getLong(KEY_DOB_MILLIS, -1L).takeIf { it >= 0 }
        set(value) = prefs.edit().putLong(KEY_DOB_MILLIS, value ?: -1L).apply()

    var hour: Int?
        get() = prefs.getInt(KEY_HOUR, -1).takeIf { it >= 0 }
        set(value) = prefs.edit().putInt(KEY_HOUR, value ?: -1).apply()

    var minute: Int?
        get() = prefs.getInt(KEY_MINUTE, -1).takeIf { it >= 0 }
        set(value) = prefs.edit().putInt(KEY_MINUTE, value ?: -1).apply()

    var place: String?
        get() = prefs.getString(KEY_PLACE, null)
        set(value) = prefs.edit().putString(KEY_PLACE, value).apply()

    // Stored as strings, not Float — a Float's ~7 significant digits isn't
    // enough headroom for a 6-decimal-place lat/long without rounding error.
    var latitude: Double?
        get() = prefs.getString(KEY_LATITUDE, null)?.toDoubleOrNull()
        set(value) = prefs.edit().putString(KEY_LATITUDE, value?.toString()).apply()

    var longitude: Double?
        get() = prefs.getString(KEY_LONGITUDE, null)?.toDoubleOrNull()
        set(value) = prefs.edit().putString(KEY_LONGITUDE, value?.toString()).apply()
}
