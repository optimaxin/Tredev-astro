package com.tredevastro.app.ui.screens.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.YatraOne
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.delay

/** First screen shown — an animated take on the sun/lotus emblem from the
 * website's logo, over the same cosmic-cloud backdrop, then hands off to
 * login. */
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val colors = LocalAppColors.current
    val entrance = remember { Animatable(0f) }
    val spin = rememberInfiniteTransition(label = "splash-spin")
    val rotation by spin.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(12000, easing = LinearEasing), RepeatMode.Restart),
        label = "rotation",
    )

    LaunchedEffect(Unit) {
        entrance.animateTo(1f, animationSpec = tween(700))
        delay(1400)
        onFinished()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .graphicsLayer {
                        alpha = entrance.value
                        scaleX = 0.6f + 0.4f * entrance.value
                        scaleY = 0.6f + 0.4f * entrance.value
                    },
                contentAlignment = Alignment.Center,
            ) {
                Canvas(modifier = Modifier.size(160.dp)) {
                    val ringRadius = size.minDimension / 2f * 0.92f
                    val center = Offset(size.width / 2f, size.height / 2f)

                    drawCircle(
                        color = colors.goldPrimary,
                        radius = ringRadius,
                        center = center,
                        style = Stroke(width = 2f),
                    )
                    drawCircle(
                        color = colors.goldSoft,
                        radius = ringRadius * 0.62f,
                        center = center,
                        style = Stroke(width = 1.5f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f, 6f))),
                    )

                    val sunRadius = ringRadius * 0.28f
                    val rayCount = 12
                    val rot = Math.toRadians(rotation.toDouble())
                    for (i in 0 until rayCount) {
                        val angle = rot + i * (2 * Math.PI / rayCount)
                        val inner = sunRadius * 1.15f
                        val outer = sunRadius * 1.85f
                        val start = Offset(
                            center.x + (inner * cos(angle)).toFloat(),
                            center.y + (inner * sin(angle)).toFloat(),
                        )
                        val end = Offset(
                            center.x + (outer * cos(angle)).toFloat(),
                            center.y + (outer * sin(angle)).toFloat(),
                        )
                        drawLine(color = colors.goldPrimary, start = start, end = end, strokeWidth = 3f)
                    }
                    drawCircle(color = colors.goldPrimary, radius = sunRadius, center = center)
                    drawCircle(color = colors.bgPrimary, radius = sunRadius * 0.45f, center = center)
                }
            }

            Text(
                text = "TredevAstro",
                color = colors.textPrimary,
                fontFamily = YatraOne,
                fontSize = 34.sp,
                modifier = Modifier
                    .padding(top = 20.dp)
                    .graphicsLayer { alpha = entrance.value },
            )
            Text(
                text = "Ancient Wisdom, Modern Guidance",
                color = colors.textSecondary,
                fontWeight = FontWeight.Light,
                fontSize = 13.sp,
                modifier = Modifier
                    .padding(top = 6.dp)
                    .graphicsLayer { alpha = entrance.value },
            )
        }
    }
}
