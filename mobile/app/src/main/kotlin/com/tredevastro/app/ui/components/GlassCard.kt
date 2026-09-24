package com.tredevastro.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.tredevastro.app.ui.theme.LocalAppColors

/** Ports `.card-cosmos` / `.card-human` — a translucent gold-bordered surface. */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed = if (onClick != null) interactionSource.collectIsPressedAsState().value else false
    val scale by animateFloatAsState(if (pressed) 0.98f else 1f, label = "card-scale")
    val shape = RoundedCornerShape(16.dp)

    val clickableModifier = if (onClick != null) {
        Modifier.clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
    } else {
        Modifier
    }

    Column(
        modifier = modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(shape)
            .background(colors.surfaceElevated.copy(alpha = 0.72f))
            .border(width = 1.dp, color = if (pressed) colors.borderStrong else colors.borderSubtle, shape = shape)
            .then(clickableModifier),
        content = content,
    )
}
