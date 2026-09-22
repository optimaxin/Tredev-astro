package com.tredevastro.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import kotlinx.coroutines.delay

/**
 * Ports the site's `.animate-fade-up` scroll-reveal — a fade + rise-in,
 * staggered by list position so cards/rows arrive one after another instead
 * of popping in all at once.
 */
@Composable
fun StaggeredEntrance(
    index: Int,
    modifier: Modifier = Modifier,
    content: @Composable (Modifier) -> Unit,
) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(60L * index)
        progress.animateTo(1f, animationSpec = tween(420))
    }
    content(
        modifier.graphicsLayer {
            alpha = progress.value
            translationY = (1f - progress.value) * 32f
        },
    )
}
