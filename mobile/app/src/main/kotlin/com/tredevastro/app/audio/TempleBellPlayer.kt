package com.tredevastro.app.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

/** A synthesized temple bell (ghanti) — ports the website's Pooja section's
 * playTempleBell() (Web Audio inharmonic partials) to Android's AudioTrack,
 * since there's no audio asset to bundle/license: 6 sine partials at
 * inharmonic ratios of a 285 Hz fundamental, each decaying at its own rate,
 * so the "clang" shimmers and thins out rather than reading as a pure tone.
 * Played once, on app launch (SplashScreen). */
object TempleBellPlayer {
    private const val SAMPLE_RATE = 44100
    private val PARTIAL_RATIOS = doubleArrayOf(1.0, 1.5, 2.0, 2.4, 3.0, 4.2)
    private const val FUNDAMENTAL_HZ = 285.0
    private const val MASTER_GAIN = 0.32

    fun play() {
        Thread {
            try {
                val samples = render()
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build(),
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(SAMPLE_RATE)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build(),
                    )
                    .setBufferSizeInBytes(samples.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(samples, 0, samples.size)
                track.play()
                Thread.sleep((samples.size * 1000L) / SAMPLE_RATE + 200)
                track.release()
            } catch (e: Exception) {
                // Audio unsupported/blocked on this device — the chime is
                // decorative, never worth surfacing an error for.
            }
        }.start()
    }

    private fun render(): ShortArray {
        val maxDuration = PARTIAL_RATIOS.indices.maxOf { 2.2 + it * 0.2 + 0.1 }
        val totalSamples = (maxDuration * SAMPLE_RATE).toInt()
        val mix = DoubleArray(totalSamples)
        PARTIAL_RATIOS.forEachIndexed { i, ratio ->
            val freq = FUNDAMENTAL_HZ * ratio
            val gain0 = 1.0 / (i + 1)
            val decay = 2.2 + i * 0.2
            val activeSamples = min(((decay + 0.1) * SAMPLE_RATE).toInt(), totalSamples)
            for (s in 0 until activeSamples) {
                val t = s / SAMPLE_RATE.toDouble()
                val envelopeT = min(t, decay)
                val gain = gain0 * (0.001 / gain0).pow(envelopeT / decay)
                mix[s] += gain * sin(2 * Math.PI * freq * t)
            }
        }
        return ShortArray(totalSamples) { i ->
            (mix[i] * MASTER_GAIN * Short.MAX_VALUE).coerceIn(-32768.0, 32767.0).toInt().toShort()
        }
    }
}
