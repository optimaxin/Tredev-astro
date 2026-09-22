package com.tredevastro.app.ui.screens.astrologers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tredevastro.app.data.SAMPLE_ASTROLOGERS
import com.tredevastro.app.ui.components.AstrologerCard
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.components.StaggeredEntrance
import com.tredevastro.app.ui.components.ToastHost

@Composable
fun AstrologersScreen() {
    var toastMessage by remember { mutableStateOf<String?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item {
                SectionHeader(
                    eyebrow = "Consult",
                    title = "Talk to a Verified Astrologer",
                    modifier = Modifier.padding(24.dp),
                )
            }
            itemsIndexed(SAMPLE_ASTROLOGERS) { index, astrologer ->
                StaggeredEntrance(index = index) { entranceModifier ->
                    AstrologerCard(
                        astrologer = astrologer,
                        onConsult = { toastMessage = "Connecting you to ${astrologer.name}…" },
                        modifier = entranceModifier.padding(horizontal = 24.dp, vertical = 6.dp),
                    )
                }
            }
        }

        ToastHost(
            message = toastMessage,
            onDismiss = { toastMessage = null },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp, start = 24.dp, end = 24.dp),
        )
    }
}
