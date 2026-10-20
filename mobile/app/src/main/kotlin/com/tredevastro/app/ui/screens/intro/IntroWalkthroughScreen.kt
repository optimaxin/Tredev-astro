package com.tredevastro.app.ui.screens.intro

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.IntroStore
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif

data class IntroSlide(
    val title: String,
    val subtitle: String,
    val iconRes: Int,
    val highlights: List<String>,
)

private val SLIDES = listOf(
    IntroSlide(
        title = "Accurate Vedic Kundli & Transits",
        subtitle = "Generate deeply personalized birth charts, divisional vargas, and planetary transit forecasts computed with real Swiss Ephemeris precision.",
        iconRes = R.drawable.logo_mark,
        highlights = listOf("Authentic Ephemeris", "Planetary Dashas", "Dosha & Remedies"),
    ),
    IntroSlide(
        title = "Talk to Verified Astrologers",
        subtitle = "Get one-on-one live guidance on Career, Marriage, Finance & Life through instant real-time chat or voice consultation.",
        iconRes = R.drawable.zodiac_aries,
        highlights = listOf("Top Verified Astrologers", "Real-Time Queue", "100% Confidential"),
    ),
    IntroSlide(
        title = "Authentic Pujas & Daily Panchang",
        subtitle = "Book experienced Vedic Pandits for auspicious home pujas, join live group rituals, and check real-time Choghadiya & Muhurat.",
        iconRes = R.drawable.icon_spirituality,
        highlights = listOf("Verified Pandits", "Live Group Rituals", "Daily Choghadiya"),
    ),
)

@Composable
fun IntroWalkthroughScreen(onFinish: () -> Unit) {
    val colors = LocalAppColors.current
    var currentIndex by remember { mutableIntStateOf(0) }

    fun completeIntro() {
        IntroStore.introDone = true
        onFinish()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
        ) {
            // Top Bar with brand & Skip button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painter = painterResource(R.drawable.logo_mark),
                        contentDescription = null,
                        modifier = Modifier.size(28.dp).clip(RoundedCornerShape(6.dp)),
                    )
                    Text(
                        text = tr("TredevaAstro"),
                        color = colors.goldPrimary,
                        fontFamily = NotoSerif,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }

                TextButton(
                    onClick = ::completeIntro,
                    modifier = Modifier.padding(0.dp),
                ) {
                    Text(
                        text = tr("Skip"),
                        color = colors.goldPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                    )
                }
            }

            Spacer(modifier = Modifier.weight(0.4f))

            // Animated Slide Content
            AnimatedContent(
                targetState = currentIndex,
                transitionSpec = {
                    if (targetState > initialState) {
                        (slideInHorizontally { width -> width } + fadeIn()) togetherWith
                            (slideOutHorizontally { width -> -width } + fadeOut())
                    } else {
                        (slideInHorizontally { width -> -width } + fadeIn()) togetherWith
                            (slideOutHorizontally { width -> width } + fadeOut())
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = "slide-animation",
            ) { page ->
                val slide = SLIDES[page]
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Central Emblem Graphic
                    Box(
                        modifier = Modifier
                            .size(110.dp)
                            .clip(CircleShape)
                            .background(Color.White)
                            .border(width = 2.dp, color = colors.goldPrimary.copy(alpha = 0.4f), shape = CircleShape)
                            .padding(12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Image(
                            painter = painterResource(slide.iconRes),
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                        )
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    Text(
                        text = tr(slide.title),
                        color = colors.textPrimary,
                        fontFamily = NotoSerif,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = tr(slide.subtitle),
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )

                    Spacer(modifier = Modifier.height(22.dp))

                    // Highlight Badges Card
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            slide.highlights.forEach { highlight ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.CheckCircle,
                                        contentDescription = null,
                                        tint = colors.goldPrimary,
                                        modifier = Modifier.size(16.dp),
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = tr(highlight),
                                        color = colors.textPrimary,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(0.6f))

            // Indicator Dots
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SLIDES.indices.forEach { index ->
                    val isSelected = index == currentIndex
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .height(6.dp)
                            .width(if (isSelected) 22.dp else 6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(if (isSelected) colors.goldPrimary else colors.goldPrimary.copy(alpha = 0.25f)),
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Action Buttons: Previous & Next / Get Started
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (currentIndex > 0) {
                    OutlineGoldButton(
                        text = tr("Previous"),
                        onClick = { currentIndex-- },
                        modifier = Modifier.weight(1f),
                    )
                }

                GoldButton(
                    text = tr(if (currentIndex == SLIDES.size - 1) "Get Started" else "Next"),
                    onClick = {
                        if (currentIndex < SLIDES.size - 1) {
                            currentIndex++
                        } else {
                            completeIntro()
                        }
                    },
                    modifier = Modifier.weight(if (currentIndex > 0) 1.2f else 1f),
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}
