package com.tredevastro.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.navigation.BottomTab
import com.tredevastro.app.ui.theme.LocalAppColors

private fun iconFor(tab: BottomTab): ImageVector = when (tab) {
    BottomTab.Home -> Icons.Filled.Home
    BottomTab.Kundli -> Icons.Filled.AutoAwesome
    BottomTab.Astrologers -> Icons.Filled.Groups
    BottomTab.Profile -> Icons.Filled.Person
}

@Composable
fun BottomNavBar(
    currentRoute: String?,
    onSelect: (BottomTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp)
            .background(colors.surface.copy(alpha = 0.96f))
            .border(width = 1.dp, color = colors.borderSubtle)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BottomTab.entries.forEach { tab ->
            val selected = currentRoute == tab.route
            val tint = if (selected) colors.goldPrimary else colors.textMuted
            val scale by animateFloatAsState(if (selected) 1.08f else 1f, label = "tab-scale-${tab.route}")
            val interactionSource = remember { MutableInteractionSource() }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable(interactionSource = interactionSource, indication = null) { onSelect(tab) }
                    .padding(vertical = 8.dp, horizontal = 12.dp),
            ) {
                Icon(
                    imageVector = iconFor(tab),
                    contentDescription = tab.label,
                    tint = tint,
                    modifier = Modifier
                        .height(24.dp)
                        .scale(scale),
                )
                Text(
                    text = tab.label,
                    color = tint,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
