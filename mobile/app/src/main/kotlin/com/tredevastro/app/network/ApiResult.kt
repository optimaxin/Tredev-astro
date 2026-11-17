package com.tredevastro.app.network

import com.tredevastro.app.network.dto.ApiEnvelope
import kotlinx.coroutines.delay
import java.io.IOException
import java.net.SocketTimeoutException

sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Failure(val message: String) : ApiResult<Nothing>
}

/** Unwraps a `{ success, data, error }` envelope into an [ApiResult],
 * turning both a `success: false` response and a thrown network/parse
 * exception into the same [ApiResult.Failure] shape a screen can render.
 *
 * A timeout on the FIRST attempt almost always just means Render's free
 * tier is still cold-booting the backend (it sleeps after ~15 min idle) —
 * that single retry is what was showing up to every screen as a visible
 * "retry" error on a cold start, since one 60s window isn't always enough.
 * Retrying once here, silently, gives a cold boot up to two windows before
 * a screen ever has to show an error. */
suspend fun <T> safeApiCall(call: suspend () -> ApiEnvelope<T>): ApiResult<T> {
    suspend fun attempt(): ApiResult<T>? = try {
        val envelope = call()
        val data = envelope.data
        if (envelope.success && data != null) {
            ApiResult.Success(data)
        } else {
            ApiResult.Failure(envelope.error?.message ?: "Something went wrong")
        }
    } catch (e: SocketTimeoutException) {
        null
    } catch (e: IOException) {
        ApiResult.Failure("Couldn't reach TredevaAstro. Check your connection and try again.")
    } catch (e: Exception) {
        ApiResult.Failure(e.message ?: "Something went wrong")
    }

    attempt()?.let { return it }
    delay(1500)
    return attempt() ?: ApiResult.Failure("The server is waking up (it sleeps when idle) — please try again in a few seconds.")
}
