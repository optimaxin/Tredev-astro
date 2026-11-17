package com.tredevastro.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif

/** Ports `.section-eyebrow-gold` + `.section-title-serif` — the small gold
 * label above every serif section title on the website. */
@Composable
fun SectionHeader(
    eyebrow: String,
    title: String,
    modifier: Modifier = Modifier,
    align: TextAlign = TextAlign.Start,
) {
    val colors = LocalAppColors.current
    Column(modifier = modifier) {
        Text(
            text = tr(eyebrow).uppercase(),
            color = colors.goldPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            letterSpacing = 2.sp,
            textAlign = align,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Text(
            text = tr(title),
            color = colors.textPrimary,
            fontFamily = NotoSerif,
            fontSize = 24.sp,
            textAlign = align,
        )
    }
}
