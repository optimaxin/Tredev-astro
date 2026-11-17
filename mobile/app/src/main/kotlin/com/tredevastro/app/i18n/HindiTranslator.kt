package com.tredevastro.app.i18n

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Real on-device English→Hindi translation (ML Kit Translate — the "Google
 * Translate" the user asked for; no API key/billing, unlike Cloud
 * Translation API, and it keeps working offline once the Hindi model has
 * downloaded once). Backs the top bar's EN/हिं toggle: every [tr] call
 * through this, app-wide, is this one translator + one in-memory cache, so
 * a repeated label (e.g. "Continue" on every onboarding step) only ever
 * gets translated once per process. */
private object HindiTranslator {
    private val translator = Translation.getClient(
        TranslatorOptions.Builder()
            .setSourceLanguage(TranslateLanguage.ENGLISH)
            .setTargetLanguage(TranslateLanguage.HINDI)
            .build(),
    )
    private val cache = ConcurrentHashMap<String, String>()
    @Volatile private var modelReady = false

    suspend fun translate(text: String): String {
        cache[text]?.let { return it }
        return try {
            if (!modelReady) {
                translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).awaitTask()
                modelReady = true
            }
            translator.translate(text).awaitTask().also { cache[text] = it }
        } catch (e: Exception) {
            text // offline / model download failed — fall back to English rather than show nothing
        }
    }
}

private suspend fun <T> com.google.android.gms.tasks.Task<T>.awaitTask(): T = suspendCancellableCoroutine { cont ->
    addOnSuccessListener { cont.resume(it) }
    addOnFailureListener { cont.resumeWithException(it) }
}

internal suspend fun translateToHindi(text: String): String = HindiTranslator.translate(text)
