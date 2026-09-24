package com.tredevastro.app.ui.screens.auth

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.OutlineGoldButton
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.YatraOne

@Composable
fun LoginScreen(
    onContinue: () -> Unit,
    onGuest: () -> Unit,
) {
    val colors = LocalAppColors.current
    val entrance = remember { Animatable(0f) }
    var contact by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { entrance.animateTo(1f, animationSpec = tween(600)) }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp)
                .graphicsLayer {
                    alpha = entrance.value
                    translationY = (1f - entrance.value) * 40f
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "TredevAstro",
                color = colors.textPrimary,
                fontFamily = YatraOne,
                fontSize = 30.sp,
            )
            Text(
                text = "Sign in to save your Kundli & consultations",
                color = colors.textSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 36.dp),
            )

            OutlinedTextField(
                value = contact,
                onValueChange = { contact = it },
                placeholder = { Text("Phone or email", color = colors.textMuted) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = colors.textPrimary,
                    unfocusedTextColor = colors.textPrimary,
                    focusedBorderColor = colors.goldPrimary,
                    unfocusedBorderColor = colors.borderStrong,
                    focusedContainerColor = colors.surface.copy(alpha = 0.4f),
                    unfocusedContainerColor = colors.surface.copy(alpha = 0.4f),
                    cursorColor = colors.goldPrimary,
                ),
            )

            GoldButton(
                text = "Continue",
                onClick = onContinue,
                modifier = Modifier.padding(top = 16.dp),
            )

            Row(
                modifier = Modifier.padding(vertical = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
                Text(
                    text = "  or  ",
                    color = colors.textMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Light,
                )
                HorizontalDivider(modifier = Modifier.width(60.dp), color = colors.borderSubtle)
            }

            OutlineGoldButton(text = "Continue as Guest", onClick = onGuest)
        }
    }
}
