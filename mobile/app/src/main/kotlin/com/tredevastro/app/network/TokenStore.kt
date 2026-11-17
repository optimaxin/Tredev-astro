package com.tredevastro.app.network

import android.content.Context
import android.content.SharedPreferences

/** Holds the signed-in session — plain SharedPreferences, same trust level
 * as any other on-device app data (no biometric/keystore wrapping yet). Init
 * once from Application/Activity startup before any authenticated call. */
object TokenStore {
    private const val PREFS = "auth_prefs"
    private const val KEY_ACCESS = "access_token"
    private const val KEY_REFRESH = "refresh_token"
    private const val KEY_NAME = "user_name"
    private const val KEY_EMAIL = "user_email"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) = prefs.edit().putString(KEY_ACCESS, value).apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) = prefs.edit().putString(KEY_REFRESH, value).apply()

    var userName: String?
        get() = prefs.getString(KEY_NAME, null)
        set(value) = prefs.edit().putString(KEY_NAME, value).apply()

    var userEmail: String?
        get() = prefs.getString(KEY_EMAIL, null)
        set(value) = prefs.edit().putString(KEY_EMAIL, value).apply()

    val isSignedIn: Boolean get() = accessToken != null

    fun save(accessToken: String, refreshToken: String, name: String, email: String) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.userName = name
        this.userEmail = email
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}
