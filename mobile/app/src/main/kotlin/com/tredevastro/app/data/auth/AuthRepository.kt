package com.tredevastro.app.data.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.tredevastro.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class AuthException(message: String) : Exception(message)

data class Session(val accessToken: String, val refreshToken: String, val name: String)

/**
 * Exchanges a Firebase ID token for our own session via POST /api/auth/firebase
 * (backend/app/api/auth.routes.ts) and keeps the tokens in encrypted storage.
 * Response shape: { success, data: { user, accessToken, refreshToken } } or { success:false, error:{message} }.
 */
object AuthRepository {
    private const val PREFS = "auth"
    private var prefs: android.content.SharedPreferences? = null

    private fun prefs(context: Context) = prefs ?: EncryptedSharedPreferences.create(
        context.applicationContext, PREFS,
        MasterKey.Builder(context.applicationContext).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    ).also { prefs = it }

    fun session(context: Context): Session? {
        val p = prefs(context)
        val access = p.getString("access", null) ?: return null
        val refresh = p.getString("refresh", null) ?: return null
        return Session(access, refresh, p.getString("name", "") ?: "")
    }

    suspend fun loginWithFirebase(context: Context, idToken: String): Session = withContext(Dispatchers.IO) {
        val data = post("/api/auth/firebase", JSONObject().put("idToken", idToken))
        val s = Session(
            accessToken = data.getString("accessToken"),
            refreshToken = data.getString("refreshToken"),
            name = data.optJSONObject("user")?.optString("name").orEmpty(),
        )
        prefs(context).edit().putString("access", s.accessToken).putString("refresh", s.refreshToken).putString("name", s.name).apply()
        s
    }

    suspend fun signOut(context: Context) = withContext(Dispatchers.IO) {
        val refresh = session(context)?.refreshToken
        prefs(context).edit().clear().apply()
        com.google.firebase.auth.FirebaseAuth.getInstance().signOut()
        // Best effort: revoke server-side, but local sign-out must work offline.
        if (refresh != null) runCatching { post("/api/auth/logout", JSONObject().put("refreshToken", refresh)) }
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        val conn = try {
            (URL(BuildConfig.API_BASE_URL + path).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        } catch (e: Exception) {
            throw AuthException("Could not reach the server.")
        }
        try {
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
            val json = runCatching { JSONObject(stream?.bufferedReader()?.readText().orEmpty()) }.getOrNull()
            if (json?.optBoolean("success") != true) {
                throw AuthException(json?.optJSONObject("error")?.optString("message")?.takeIf { it.isNotBlank() } ?: "Sign-in failed (${conn.responseCode}).")
            }
            return json.getJSONObject("data")
        } catch (e: AuthException) {
            throw e
        } catch (e: Exception) {
            throw AuthException("Could not reach the server.")
        } finally {
            conn.disconnect()
        }
    }
}
