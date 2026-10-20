package com.tredevastro.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * A vivid gold→terracotta gradient banner — the app's "cheerful" opener for
 * a screen, in place of a plain text header. Used at the top of Home,
 * Horoscope and Panchang.
 */
@Composable
fun HeroBanner(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    iconRes: Int = R.drawable.logo_mark,
    trailingContent: (@Composable () -> Unit)? = null,
    onBack: (() -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.linearGradient(listOf(colors.goldPrimary, colors.goldSoft, colors.sacredAccent)),
            ),
    ) {
        // Decorative overlapping circles for visual depth.
        Box(
            modifier = Modifier
                .size(140.dp)
                .align(Alignment.TopEnd)
                .background(Color.White.copy(alpha = 0.08f), CircleShape),
        )
        Box(
            modifier = Modifier
                .size(70.dp)
                .align(Alignment.BottomEnd)
                .padding(end = 24.dp, bottom = 4.dp)
                .background(Color.White.copy(alpha = 0.10f), CircleShape),
        )

        OrbitingSpark(modifier = Modifier.align(Alignment.TopEnd).padding(top = 34.dp, end = 50.dp))
        OrbitingSpark(modifier = Modifier.align(Alignment.CenterEnd).padding(end = 90.dp), periodMillis = 6600, orbitRadiusDp = 22f, sizeDp = 4.dp)

        if (trailingContent != null) {
            Box(modifier = Modifier.align(Alignment.TopEnd).padding(top = 14.dp, end = 14.dp)) { trailingContent() }
        }

        if (onBack != null) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(top = 10.dp, start = 10.dp)
                    .size(38.dp)
                    .background(Color.Black.copy(alpha = 0.28f), CircleShape),
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }

        Column(modifier = Modifier.fillMaxWidth().padding(18.dp).padding(top = if (trailingContent != null || onBack != null) 30.dp else 0.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        painter = painterResource(iconRes),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                    )
                }
                Column(modifier = Modifier.padding(start = 14.dp)) {
                    Text(tr(title), color = Color.White, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 24.sp)
                    Text(tr(subtitle), color = Color.White.copy(alpha = 0.85f), fontSize = 15.sp, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

/** A small drifting spark orbiting a fixed point — the "moving celestial
 * element" on the gold hero card. Twinkles (alpha pulse) while it drifts so
 * it reads as a star, not just a bouncing dot. */
@Composable
private fun OrbitingSpark(
    modifier: Modifier = Modifier,
    periodMillis: Int = 8000,
    orbitRadiusDp: Float = 34f,
    sizeDp: androidx.compose.ui.unit.Dp = 5.dp,
) {
    val transition = rememberInfiniteTransition(label = "spark-orbit")
    val angle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(periodMillis, easing = LinearEasing)),
        label = "spark-angle",
    )
    val twinkle by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(tween(periodMillis / 4, easing = LinearEasing), repeatMode = RepeatMode.Reverse),
        label = "spark-twinkle",
    )
    Box(
        modifier = modifier
            .offset {
                val radians = Math.toRadians(angle.toDouble())
                IntOffset((cos(radians) * orbitRadiusDp).roundToInt(), (sin(radians) * (orbitRadiusDp * 0.4f)).roundToInt())
            }
            .size(sizeDp)
            .background(Color.White.copy(alpha = twinkle), CircleShape),
    )
}
