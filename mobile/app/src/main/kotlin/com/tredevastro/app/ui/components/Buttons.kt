package com.tredevastro.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.graphicsLayer

/**
 * Ports `.btn-gold` from globals.css: a gold-to-soft-gold-to-gold-secondary
 * diagonal gradient with a slow light sweep, plus a tactile press scale.
 */
@Composable
fun GoldButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fillWidth: Boolean = true,
    compact: Boolean = false,
    leadingIcon: ImageVector? = null,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.96f else 1f, label = "gold-btn-scale")

    val shimmer = rememberInfiniteTransition(label = "gold-btn-shimmer")
    val sweep by shimmer.animateFloat(
        initialValue = -0.4f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart),
        label = "sweep",
    )

    Box(
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier.wrapContentWidth())
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(12.dp))
            .background(
                Brush.linearGradient(listOf(colors.goldPrimary, colors.goldSoft, colors.goldSecondary)),
            )
            .drawWithContent {
                drawContent()
                val bandWidth = size.width * 0.35f
                val x = sweep * size.width
                drawRect(
                    brush = Brush.linearGradient(
                        colors = listOf(Color.Transparent, Color.White.copy(alpha = 0.28f), Color.Transparent),
                        start = Offset(x - bandWidth, 0f),
                        end = Offset(x + bandWidth, size.height),
                    ),
                )
            }
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
            .padding(
                if (compact) PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                else PaddingValues(horizontal = 28.dp, vertical = 16.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (leadingIcon != null) {
                Icon(leadingIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(if (compact) 14.dp else 18.dp))
            }
            Text(
                text = tr(text),
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = if (compact) 13.sp else 15.sp,
            )
        }
    }
}

/** Ports `.btn-outline-gold` — transparent with a gold border, for secondary actions. */
@Composable
fun OutlineGoldButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fillWidth: Boolean = true,
    compact: Boolean = false,
    leadingIcon: ImageVector? = null,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.97f else 1f, label = "outline-btn-scale")
    val borderColor = if (pressed) colors.goldPrimary else colors.borderStrong

    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier.wrapContentWidth())
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(shape)
            .border(width = 1.dp, color = borderColor, shape = shape)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
            .padding(
                if (compact) PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                else PaddingValues(horizontal = 28.dp, vertical = 16.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (leadingIcon != null) {
                Icon(leadingIcon, contentDescription = null, tint = colors.textPrimary, modifier = Modifier.size(if (compact) 14.dp else 18.dp))
            }
            Text(text = tr(text), color = colors.textPrimary, fontWeight = FontWeight.Medium, fontSize = if (compact) 13.sp else 15.sp)
        }
    }
}

/** A fixed deep-navy solid button (Stitch: "Talk Now" / "Chat" — the Vedic
 * Sanctuary design's other primary action color, alongside gold). Always
 * navy regardless of theme, matching the mockups exactly. */
@Composable
fun DarkButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fillWidth: Boolean = true,
    compact: Boolean = false,
    leadingIcon: ImageVector? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.96f else 1f, label = "dark-btn-scale")

    Box(
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier.wrapContentWidth())
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(12.dp))
            .background(SanctuaryNavy)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
            .padding(
                if (compact) PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                else PaddingValues(horizontal = 28.dp, vertical = 16.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (leadingIcon != null) {
                Icon(leadingIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(if (compact) 14.dp else 18.dp))
            }
            Text(text = tr(text), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = if (compact) 13.sp else 15.sp)
        }
    }
}

/** A light tonal button (Stitch: "Call" next to the dark "Chat" button). */
@Composable
fun TonalButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fillWidth: Boolean = true,
    compact: Boolean = false,
    leadingIcon: ImageVector? = null,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.97f else 1f, label = "tonal-btn-scale")

    Box(
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier.wrapContentWidth())
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(12.dp))
            .background(colors.bgSecondary)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
            .padding(
                if (compact) PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                else PaddingValues(horizontal = 28.dp, vertical = 16.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (leadingIcon != null) {
                Icon(leadingIcon, contentDescription = null, tint = colors.textPrimary, modifier = Modifier.size(if (compact) 14.dp else 18.dp))
            }
            Text(text = tr(text), color = colors.textPrimary, fontWeight = FontWeight.Medium, fontSize = if (compact) 13.sp else 15.sp)
        }
    }
}

private val SanctuaryNavy = Color(0xFF182333)
