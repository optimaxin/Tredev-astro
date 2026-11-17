package com.tredevastro.app.ui.screens.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.audio.TempleBellPlayer
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import kotlinx.coroutines.delay

/** First screen shown — an animated take on the sun/lotus emblem from the
 * website's logo, over the same cosmic-cloud backdrop, then hands off to
 * login. Opens with a synthesized temple-bell chime (TempleBellPlayer). */
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val colors = LocalAppColors.current
    val entrance = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        TempleBellPlayer.play()
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
            Image(
                painter = painterResource(R.drawable.ic_launcher_foreground),
                contentDescription = "TredevaAstro",
                modifier = Modifier
                    .size(140.dp)
                    .clip(CircleShape)
                    .graphicsLayer {
                        alpha = entrance.value
                        scaleX = 0.6f + 0.4f * entrance.value
                        scaleY = 0.6f + 0.4f * entrance.value
                    },
            )

            Text(
                text = tr("TredevaAstro"),
                color = colors.textPrimary,
                fontFamily = NotoSerif,
                fontSize = 34.sp,
                modifier = Modifier
                    .padding(top = 20.dp)
                    .graphicsLayer { alpha = entrance.value },
            )
            Text(
                text = tr("Ancient Wisdom, Modern Guidance"),
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
