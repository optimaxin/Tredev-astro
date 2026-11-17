package com.tredevastro.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import com.tredevastro.app.R
import com.tredevastro.app.data.Tool
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

/** Big-icon, big-label grid — sized for an older, non-technical audience
 * (per explicit product direction) rather than the denser tiles used
 * elsewhere. Fixed at 3 columns so every tile stays large and thumb-friendly
 * regardless of how many tools are listed. */
@Composable
fun HomeFeatureGrid(tools: List<Tool>, onClick: (Tool) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        tools.chunked(3).forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { tool -> FeatureTile(tool = tool, onClick = { onClick(tool) }, modifier = Modifier.weight(1f)) }
                repeat(3 - row.size) { Box(modifier = Modifier.weight(1f)) }
            }
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
private fun FeatureTile(tool: Tool, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(colors.goldPrimary.copy(alpha = 0.14f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            val vectorIcon = tool.icon
            if (vectorIcon != null) {
                Icon(vectorIcon, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(32.dp))
            } else {
                Image(painter = painterResource(tool.iconRes ?: R.drawable.ic_launcher_foreground), contentDescription = null, modifier = Modifier.size(36.dp))
            }
        }
        Text(
            tr(tool.label),
            color = colors.textPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
