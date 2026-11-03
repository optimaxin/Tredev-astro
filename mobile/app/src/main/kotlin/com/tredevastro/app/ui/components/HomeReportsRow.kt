package com.tredevastro.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.Tool
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

/** The "Reports" strip — one horizontally scrolling row, per product
 * direction (older/non-technical users read a single scanning line more
 * easily than a wrapped grid). */
@Composable
fun HomeReportsRow(reports: List<Tool>, onClick: (Tool) -> Unit, modifier: Modifier = Modifier) {
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(end = 8.dp),
    ) {
        items(reports) { report ->
            ReportChip(report = report, onClick = { onClick(report) }, modifier = Modifier.padding(end = 12.dp))
        }
    }
}

@Composable
private fun ReportChip(report: Tool, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier, onClick = onClick) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val icon = report.icon
            Box(
                modifier = Modifier.size(48.dp).background(colors.sacredAccent.copy(alpha = 0.14f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                if (icon != null) {
                    Icon(icon, contentDescription = null, tint = colors.sacredAccent, modifier = Modifier.size(24.dp))
                } else if (report.iconRes != null) {
                    Image(painter = painterResource(report.iconRes), contentDescription = null, modifier = Modifier.size(26.dp))
                }
            }
            Text(
                tr(report.label),
                color = colors.textPrimary,
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}
