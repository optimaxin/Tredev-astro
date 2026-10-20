package com.tredevastro.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.navigation.BottomTab
import com.tredevastro.app.ui.theme.LocalAppColors

// Real illustrated icons (Extra/Icons) for every tab except Astrologers —
// no astrologer/consult illustration exists in that pack, and forcing a
// mismatched one would read worse than the plain people icon.
private fun iconResFor(tab: BottomTab): Int? = when (tab) {
    BottomTab.Home -> R.drawable.icon_home
    BottomTab.Astrologers -> null
    BottomTab.Kundli -> R.drawable.icon_kundli
    BottomTab.Horoscope -> R.drawable.icon_astrology
    BottomTab.Pooja -> R.drawable.icon_spirituality
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
            .background(colors.surface.copy(alpha = 0.98f))
            .border(width = 1.dp, color = colors.borderSubtle)
            .navigationBarsPadding()
            .padding(horizontal = 8.dp, vertical = 8.dp),
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
                    .weight(1f)
                    .clickable(interactionSource = interactionSource, indication = null) { onSelect(tab) }
                    .padding(vertical = 8.dp, horizontal = 2.dp),
            ) {
                val iconRes = iconResFor(tab)
                if (iconRes != null) {
                    Image(
                        painter = painterResource(iconRes),
                        contentDescription = tab.label,
                        colorFilter = ColorFilter.tint(tint),
                        modifier = Modifier
                            .height(30.dp)
                            .scale(scale),
                    )
                } else {
                    Icon(
                        imageVector = Icons.Outlined.Groups,
                        contentDescription = tab.label,
                        tint = tint,
                        modifier = Modifier
                            .height(30.dp)
                            .scale(scale),
                    )
                }
                Text(
                    text = tr(tab.label),
                    color = tint,
                    fontSize = 12.sp,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                    maxLines = 1,
                    softWrap = false,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
