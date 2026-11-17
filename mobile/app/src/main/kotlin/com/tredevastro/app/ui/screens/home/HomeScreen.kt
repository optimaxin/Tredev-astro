package com.tredevastro.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.HOME_TOOLS
import com.tredevastro.app.data.SAMPLE_ASTROLOGERS
import com.tredevastro.app.data.Tool
import com.tredevastro.app.ui.components.AstrologerCard
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.components.StaggeredEntrance
import com.tredevastro.app.ui.components.ToastHost
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.YatraOne

@Composable
fun HomeScreen(
    onNavigate: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    var toastMessage by remember { mutableStateOf<String?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        text = "Namaste 🙏",
                        color = colors.textSecondary,
                        fontSize = 14.sp,
                    )
                    Text(
                        text = "What does the sky say today?",
                        color = colors.textPrimary,
                        fontFamily = YatraOne,
                        fontSize = 26.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    itemsIndexed(HOME_TOOLS) { index, tool ->
                        StaggeredEntrance(index = index) { entranceModifier ->
                            ToolTile(
                                tool = tool,
                                modifier = entranceModifier,
                                onClick = {
                                    val route = tool.route
                                    if (route != null) onNavigate(route) else toastMessage = "${tool.label} is coming soon"
                                },
                            )
                        }
                    }
                }
            }

            item {
                DailyPanchangCard(modifier = Modifier.padding(horizontal = 24.dp, vertical = 20.dp))
            }

            item {
                SectionHeader(
                    eyebrow = "Consult",
                    title = "Astrologers online now",
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                )
            }

            itemsIndexed(SAMPLE_ASTROLOGERS.filter { it.online }) { index, astrologer ->
                StaggeredEntrance(index = index) { entranceModifier ->
                    AstrologerCard(
                        astrologer = astrologer,
                        onConsult = { toastMessage = "Connecting you to ${astrologer.name}…" },
                        modifier = entranceModifier.padding(horizontal = 24.dp, vertical = 6.dp),
                    )
                }
            }
        }

        ToastHost(
            message = toastMessage,
            onDismiss = { toastMessage = null },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp, start = 24.dp, end = 24.dp),
        )
    }
}

@Composable
private fun ToolTile(tool: Tool, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.size(width = 92.dp, height = 96.dp), onClick = onClick) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(colors.goldPrimary.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(tool.icon, contentDescription = tool.label, tint = colors.goldPrimary, modifier = Modifier.size(20.dp))
            }
            Text(
                text = tool.label,
                color = colors.textSecondary,
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

@Composable
private fun DailyPanchangCard(modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.WbSunny, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(28.dp))
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Text("Today's Panchang", color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text("Tithi · Nakshatra · Rahu Kaal at a glance", color = colors.textSecondary, fontSize = 12.sp)
            }
            Icon(Icons.Filled.NightsStay, contentDescription = null, tint = colors.sacredAccent, modifier = Modifier.size(20.dp))
        }
    }
}
