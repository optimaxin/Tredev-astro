package com.tredevastro.app.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.produceState

/** Set once, at the NavHost root, from the top bar's EN/हिं toggle
 * (see NavGraph.kt) — read by [tr] anywhere further down the tree. */
val LocalHindi = compositionLocalOf { false }

/** Drop-in wrapper for any literal UI string: `Text(tr("Home"))` instead of
 * `Text("Home")`. Shows the English original immediately, then swaps to the
 * Hindi translation once ML Kit's on-device model resolves it (HindiTranslator
 * caches by exact string, so repeated labels across screens — "Continue",
 * "Home", etc. — only ever get translated once per process). No-ops (returns
 * [text] unchanged) when the toggle is off, or for blank/already-short
 * non-text tokens like "₹" that aren't worth a translation round-trip. */
@Composable
fun tr(text: String): String {
    val hindi = LocalHindi.current
    if (!hindi || text.isBlank()) return text
    val state = produceState(initialValue = text, text, hindi) {
        value = translateToHindi(text)
    }
    return state.value
}
