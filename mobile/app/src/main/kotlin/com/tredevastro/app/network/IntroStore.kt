package com.tredevastro.app.network

import android.content.Context
import android.content.SharedPreferences

object IntroStore {
    private const val PREFS = "intro_prefs"
    private const val KEY_INTRO_DONE = "intro_completed"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    var introDone: Boolean
        get() = if (::prefs.isInitialized) prefs.getBoolean(KEY_INTRO_DONE, false) else false
        set(value) {
            if (::prefs.isInitialized) {
                prefs.edit().putBoolean(KEY_INTRO_DONE, value).apply()
            }
        }
}
