package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

/** A generic label/value tile grid — the shared rendering for every simple
 * calculator result (Lucky Attributes, Kaal Sarp Dosha, Numerology, …) so
 * each new tool only has to supply its own label/value pairs, not a whole
 * bespoke layout. */
@Composable
fun KeyValueGrid(rows: List<Pair<String, String>>, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        rows.chunked(2).forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (label, value) -> KeyValueTile(label = label, value = value, modifier = Modifier.weight(1f)) }
                if (row.size == 1) Box(modifier = Modifier.weight(1f))
            }
            Box(modifier = Modifier.size(10.dp))
        }
    }
}

@Composable
private fun KeyValueTile(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .background(colors.bgSecondary, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(tr(label), color = colors.textMuted, fontSize = 11.sp)
        Text(tr(value), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(top = 2.dp))
    }
}
