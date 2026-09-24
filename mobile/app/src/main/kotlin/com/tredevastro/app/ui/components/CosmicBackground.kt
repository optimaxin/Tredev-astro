package com.tredevastro.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import com.tredevastro.app.ui.theme.LocalAppColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue

/**
 * Port of the website's `.cosmic-clouds-underlay` — three soft, slow-drifting
 * glow blobs behind the content. No blur filter (keeps it minSdk 24-safe);
 * the glow itself comes from radial-gradient falloff, same as the CSS version.
 */
@Composable
fun CosmicBackground(modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val transition = rememberInfiniteTransition(label = "cosmic-clouds")
    val drift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 26000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "drift",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            fun blob(cx: Float, cy: Float, radius: Float, color: androidx.compose.ui.graphics.Color) {
                drawIntoCanvas {
                    val brush = Brush.radialGradient(
                        colors = listOf(color, color.copy(alpha = 0f)),
                        center = Offset(cx, cy),
                        radius = radius,
                    )
                    drawCircle(brush = brush, radius = radius, center = Offset(cx, cy))
                }
            }

            blob(
                cx = w * (0.2f + 0.08f * drift),
                cy = h * (0.05f - 0.05f * drift),
                radius = w * 0.7f,
                color = colors.cloudSaffron,
            )
            blob(
                cx = w * (0.85f - 0.1f * drift),
                cy = h * (0.75f + 0.1f * drift),
                radius = w * 0.8f,
                color = colors.cloudIndigo,
            )
            blob(
                cx = w * (0.05f + 0.12f * drift),
                cy = h * (0.5f - 0.08f * drift),
                radius = w * 0.6f,
                color = colors.cloudMaroon,
            )
        }
    }
}
