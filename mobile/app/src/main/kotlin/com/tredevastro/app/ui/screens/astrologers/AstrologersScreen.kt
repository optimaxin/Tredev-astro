package com.tredevastro.app.ui.screens.astrologers

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Call
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.data.Astrologer
import com.tredevastro.app.data.FALLBACK_ASTROLOGERS
import com.tredevastro.app.data.fetchAstrologers
import com.tredevastro.app.data.refreshPresence
import kotlinx.coroutines.delay
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.ui.components.AstrologerCard
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.SectionHeader
import com.tredevastro.app.ui.components.StaggeredEntrance
import com.tredevastro.app.ui.components.ToastHost
import com.tredevastro.app.ui.theme.LocalAppColors

// Same category set as the website's Astrologers page (Astrologers.tsx's
// FILTERS) — server-filtered via GET /api/astrologers/catalog's `category`
// query param, not a client-side filter.
private val CATEGORY_FILTERS = listOf("All", "Love", "Marriage", "Career", "Finance", "Family", "Vastu", "Spirituality", "Pooja")

@Composable
fun AstrologersScreen() {
    var toastMessage by remember { mutableStateOf<String?>(null) }
    var astrologers by remember { mutableStateOf<List<Astrologer>?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableStateOf(0) }

    // "consultationType" mirrors the backend's real enum ('chat' | 'voice' |
    // 'video') — null means no consultation-type filter (both Chat and Call
    // capable astrologers show).
    var consultationType by remember { mutableStateOf<String?>(null) }
    // Seeded once from Pooja's "Book a Pandit" tab (com.tredevastro.app.navigation.PendingAstrologerFilter),
    // then reset so a later, unrelated visit to this screen doesn't stay stuck on it.
    var category by remember {
        mutableStateOf(
            com.tredevastro.app.navigation.PendingAstrologerFilter.category?.also {
                com.tredevastro.app.navigation.PendingAstrologerFilter.category = null
            } ?: "All",
        )
    }

    LaunchedEffect(reloadKey, consultationType, category) {
        errorMessage = null
        astrologers = null
        val categoryParam = category.takeIf { it != "All" }
        when (val result = fetchAstrologers(category = categoryParam, consultationType = consultationType)) {
            is ApiResult.Success -> {
                astrologers = result.data
                errorMessage = null
            }
            is ApiResult.Failure -> {
                errorMessage = result.message
                astrologers = emptyList()
            }
        }
    }

    // Keeps the green/yellow/grey dot current while this screen is open —
    // same live presence feed the website polls/sockets off (see
    // Astrologer.kt's refreshPresence). Catalog data (price, chips, etc.)
    // doesn't need this cadence, so only presence is re-fetched.
    LaunchedEffect(Unit) {
        while (true) {
            delay(15_000)
            astrologers?.let { current ->
                if (current.isNotEmpty()) astrologers = refreshPresence(current)
            }
        }
    }

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
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 24.dp),
                )
            }

            item {
                ConsultationTypeToggle(
                    selected = consultationType,
                    onSelect = { consultationType = it },
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 0.dp).padding(bottom = 14.dp),
                )
            }

            item {
                CategoryFilterRow(
                    selected = category,
                    onSelect = { category = it },
                    modifier = Modifier.padding(bottom = 18.dp),
                )
            }

            val current = astrologers
            if (current == null) {
                item { LoadingBlock() }
            } else {
                if (errorMessage != null) {
                    item {
                        ErrorBlock(
                            message = errorMessage ?: "",
                            onRetry = { reloadKey++ },
                            modifier = Modifier.padding(horizontal = 24.dp),
                        )
                    }
                }
                if (current.isEmpty()) {
                    item {
                        Text(
                            tr("No astrologers match this filter right now."),
                            color = LocalAppColors.current.textMuted,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 24.dp),
                        )
                    }
                }
                itemsIndexed(current) { index, astrologer ->
                    StaggeredEntrance(index = index) { entranceModifier ->
                        AstrologerCard(
                            astrologer = astrologer,
                            onConsult = {
                                toastMessage = if (consultationType == "voice") "Calling ${astrologer.name}…" else "Connecting you to ${astrologer.name}…"
                            },
                            modifier = entranceModifier.padding(horizontal = 24.dp, vertical = 6.dp),
                        )
                    }
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

/** "Chat" / "Call" pill toggle — filters to astrologers who take that
 * consultation type (backend's real `consultationType` catalog filter, the
 * same enum astrologer.consultationTypes already advertises per-profile). */
@Composable
private fun ConsultationTypeToggle(selected: String?, onSelect: (String?) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.bgSecondary, RoundedCornerShape(999.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        ToggleOption(
            label = "Chat",
            icon = Icons.AutoMirrored.Filled.Chat,
            active = selected == "chat",
            onClick = { onSelect(if (selected == "chat") null else "chat") },
            modifier = Modifier.weight(1f),
        )
        ToggleOption(
            label = "Call",
            icon = Icons.Filled.Call,
            active = selected == "voice",
            onClick = { onSelect(if (selected == "voice") null else "voice") },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun ToggleOption(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .background(if (active) colors.goldPrimary else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (active) androidx.compose.ui.graphics.Color.White else colors.textSecondary,
            modifier = Modifier.padding(end = 6.dp).size(16.dp),
        )
        Text(
            tr(label),
            color = if (active) androidx.compose.ui.graphics.Color.White else colors.textSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun CategoryFilterRow(selected: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(CATEGORY_FILTERS) { filter ->
            val active = filter == selected
            Text(
                tr(filter),
                color = if (active) androidx.compose.ui.graphics.Color(0xFF15100A) else colors.textSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .background(if (active) colors.goldPrimary else colors.bgSecondary, RoundedCornerShape(999.dp))
                    .clickable { onSelect(filter) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}
