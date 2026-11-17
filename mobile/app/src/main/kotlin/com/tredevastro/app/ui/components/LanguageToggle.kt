package com.tredevastro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** EN / हिं switch — sleek, compact toggle with clean modern corners. */
@Composable
fun LanguageToggle(
    isHindi: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    selectedBg: Color = Color.White,
    selectedText: Color = Color(0xFF6B4A17),
    unselectedText: Color = Color.White,
) {
    Row(modifier = modifier.padding(2.dp)) {
        LanguagePill(text = "EN", selected = !isHindi, onClick = { onToggle(false) }, selectedBg = selectedBg, selectedText = selectedText, unselectedText = unselectedText)
        LanguagePill(text = "हिं", selected = isHindi, onClick = { onToggle(true) }, selectedBg = selectedBg, selectedText = selectedText, unselectedText = unselectedText)
    }
}

@Composable
private fun LanguagePill(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    selectedBg: Color,
    selectedText: Color,
    unselectedText: Color,
) {
    Text(
        text = text,
        color = if (selected) selectedText else unselectedText,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .background(if (selected) selectedBg else Color.Transparent, RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}
