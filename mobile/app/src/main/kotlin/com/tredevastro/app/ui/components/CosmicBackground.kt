package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.tredevastro.app.ui.theme.LocalAppColors

/** A flat screen background — dark grey/navy-blue in the dark theme, warm
 * ivory parchment in the light theme. No gradient/cloud-glow underlay: an
 * earlier animated radial-gradient version read as a cheap, overpowering
 * color wash no matter how far its opacity was tuned down, so it's gone. */
@Composable
fun CosmicBackground(modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Box(modifier = modifier.fillMaxSize().background(colors.bgPrimary))
}
