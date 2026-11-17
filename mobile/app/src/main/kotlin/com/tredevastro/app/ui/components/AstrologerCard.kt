package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.Astrologer
import com.tredevastro.app.ui.theme.LocalAppColors

@Composable
fun AstrologerCard(
    astrologer: Astrologer,
    onConsult: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(
                            Brush.linearGradient(listOf(colors.goldPrimary, colors.sacredAccent)),
                            CircleShape,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = astrologer.name.split(" ").mapNotNull { it.firstOrNull() }.take(2).joinToString(""),
                        color = colors.bgPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                }
                if (astrologer.online) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .background(Color(0xFF50C878), CircleShape)
                            .border(width = 2.dp, color = colors.surfaceElevated, shape = CircleShape),
                    )
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 14.dp),
            ) {
                Text(astrologer.name, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(astrologer.specialty, color = colors.textSecondary, fontSize = 12.sp)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Filled.Star, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(14.dp))
                    Text("${astrologer.rating}", color = colors.goldPrimary, fontSize = 12.sp)
                    Text("· ${astrologer.experienceYears}y exp · ₹${astrologer.pricePerMinute}/min", color = colors.textMuted, fontSize = 12.sp)
                }
            }

            GoldButton(text = "Consult", onClick = onConsult, fillWidth = false, compact = true)
        }
    }
}
