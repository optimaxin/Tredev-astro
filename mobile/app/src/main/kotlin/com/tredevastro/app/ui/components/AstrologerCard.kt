package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.Astrologer
import com.tredevastro.app.data.PresenceStatus
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

private val PresenceStatus.dotColor: Color
    get() = when (this) {
        PresenceStatus.AVAILABLE -> Color(0xFF50C878) // green — online, free to consult now
        PresenceStatus.BUSY -> Color(0xFFE8A93C) // amber — online, with another client
        PresenceStatus.OFFLINE -> Color(0xFF9CA3AF) // grey — offline/away
    }

/** Ports the astrologer card from the Stitch "Consult Astrologers" mockup:
 * avatar + rating pill, specialty chips, experience/language info chips, and
 * either a price (busy: a waiting-queue button) — the whole card is tappable
 * via [onConsult], since the screen's own Chat/Call toggle above already
 * picked which kind of consult this list (and so this tap) means; a
 * redundant per-card Call/Chat button pair would just repeat that choice. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AstrologerCard(
    astrologer: Astrologer,
    onConsult: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    GlassCard(onClick = onConsult, modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(contentAlignment = Alignment.BottomEnd) {
                    AvatarBadge(name = astrologer.name, imageUrl = astrologer.avatarUrl, size = 56.dp)
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .background(astrologer.presence.dotColor, CircleShape)
                            .border(width = 2.dp, color = colors.surface, shape = CircleShape),
                    )
                }

                Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            tr(astrologer.name),
                            color = colors.textPrimary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            modifier = Modifier.weight(1f, fill = false),
                        )
                        RatingPill(rating = astrologer.rating, modifier = Modifier.padding(start = 8.dp))
                    }
                    Row(
                        modifier = Modifier.padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        astrologer.specialties.forEach { specialty -> Chip(text = specialty) }
                    }
                }
            }

            FlowRow(
                modifier = Modifier.padding(top = 12.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                InfoChip(text = "${astrologer.experienceYears} Years Experience")
                InfoChip(text = astrologer.languages.joinToString(", ") { it.replaceFirstChar(Char::uppercase) })
            }

            when (astrologer.presence) {
                PresenceStatus.AVAILABLE -> Row(
                    modifier = Modifier.padding(top = 14.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Text("₹${astrologer.pricePerMinute}", color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text(tr("/min"), color = colors.textMuted, fontSize = 12.sp, modifier = Modifier.padding(start = 2.dp, bottom = 2.dp))
                    if (astrologer.originalPricePerMinute != null) {
                        Text(
                            tr("₹${astrologer.originalPricePerMinute}/min"),
                            color = colors.textMuted,
                            fontSize = 11.sp,
                            textDecoration = TextDecoration.LineThrough,
                            modifier = Modifier.padding(start = 8.dp),
                        )
                    }
                }
                PresenceStatus.BUSY -> Row(
                    modifier = Modifier.padding(top = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = tr("Busy with another client"),
                        color = colors.sacredAccent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f),
                    )
                    TonalButton(text = "Join Waiting Queue", onClick = onConsult, fillWidth = false, compact = true, leadingIcon = Icons.Filled.Schedule)
                }
                PresenceStatus.OFFLINE -> Text(
                    text = tr("Currently offline"),
                    color = colors.textMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 14.dp),
                )
            }
        }
    }
}

@Composable
private fun RatingPill(rating: Double, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .background(colors.goldPrimary.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(Icons.Filled.Star, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(12.dp))
        Text("$rating", color = colors.goldPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
    }
}

@Composable
private fun Chip(text: String) {
    val colors = LocalAppColors.current
    Text(
        text = tr(text),
        color = colors.textSecondary,
        fontSize = 11.sp,
        modifier = Modifier
            .background(colors.bgSecondary, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

@Composable
private fun InfoChip(text: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Text(
        text = tr(text),
        color = colors.textSecondary,
        fontSize = 11.sp,
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    )
}
