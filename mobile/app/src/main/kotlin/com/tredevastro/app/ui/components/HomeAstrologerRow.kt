package com.tredevastro.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.Astrologer
import com.tredevastro.app.ui.theme.LocalAppColors

/** The condensed astrologer picker for Home — photo, name, "Book Now", one
 * horizontal scrolling row. The full detail card (rating, chips, Call/Chat)
 * stays on the dedicated Astrologers tab; a scanning row of simple cards is
 * what this screen's older/non-technical audience needs here. */
@Composable
fun HomeAstrologerRow(astrologers: List<Astrologer>, onBookNow: (Astrologer) -> Unit, modifier: Modifier = Modifier) {
    LazyRow(modifier = modifier, contentPadding = PaddingValues(end = 8.dp)) {
        items(astrologers) { astrologer ->
            HomeAstrologerCard(astrologer = astrologer, onBookNow = { onBookNow(astrologer) }, modifier = Modifier.padding(end = 12.dp))
        }
    }
}

@Composable
private fun HomeAstrologerCard(astrologer: Astrologer, onBookNow: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.width(130.dp)) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AvatarBadge(name = astrologer.name, imageUrl = astrologer.avatarUrl, size = 64.dp)
            androidx.compose.material3.Text(
                astrologer.name,
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 10.dp),
            )
            GoldButton(
                text = "Book Now",
                onClick = onBookNow,
                compact = true,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}
