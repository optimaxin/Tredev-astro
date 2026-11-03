package com.tredevastro.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
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
import com.tredevastro.app.data.HOME_FEATURE_GRID
import com.tredevastro.app.data.PresenceStatus
import com.tredevastro.app.data.REPORT_CATEGORIES
import com.tredevastro.app.data.fetchAstrologers
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.navigation.Routes
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.PanchangBody
import com.tredevastro.app.network.dto.PanchangDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.HomeAstrologerRow
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.HomeBannerCarousel
import com.tredevastro.app.ui.components.HomeBlogsRow
import com.tredevastro.app.ui.components.HomeFaqSection
import com.tredevastro.app.ui.components.HomeFeatureGrid
import com.tredevastro.app.ui.components.HomeReportsRow
import com.tredevastro.app.ui.components.HomeStoreRow
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.PanchangCard
import com.tredevastro.app.ui.components.ToastHost
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun HomeScreen(onNavigate: (String) -> Unit) {
    val colors = LocalAppColors.current
    var toastMessage by remember { mutableStateOf<String?>(null) }
    val toast: (String) -> Unit = { toastMessage = it }
    var featuredAstrologers by remember { mutableStateOf<List<Astrologer>?>(null) }
    var todayPanchang by remember { mutableStateOf<PanchangDto?>(null) }

    LaunchedEffect(Unit) {
        featuredAstrologers = when (val result = fetchAstrologers()) {
            is ApiResult.Success -> result.data.filter { it.presence == PresenceStatus.AVAILABLE }.take(2)
            is ApiResult.Failure -> FALLBACK_ASTROLOGERS.take(2)
        }
    }

    LaunchedEffect(Unit) {
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())
        // New Delhi — same default the Panchang tab falls back to before a
        // real location is picked.
        when (val result = safeApiCall { ApiClient.service.getPanchang(PanchangBody(dateStr, 28.6139, 77.2090)) }) {
            is ApiResult.Success -> todayPanchang = result.data
            is ApiResult.Failure -> Unit
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CosmicBackground()

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        ) {
            item {
                HeroBanner(
                    title = tr("Namaste, Aarav"),
                    subtitle = tr("Your cosmic dashboard for today"),
                    modifier = Modifier.padding(bottom = 16.dp),
                )
            }

            item { DateRow(panchang = todayPanchang, modifier = Modifier.padding(bottom = 20.dp)) }

            item {
                HomeFeatureGrid(
                    tools = HOME_FEATURE_GRID,
                    onClick = { tool ->
                        val route = tool.route
                        if (route != null) onNavigate(route) else toast("${tool.label} is coming soon")
                    },
                    modifier = Modifier.padding(bottom = 24.dp),
                )
            }

            item { HomeBannerCarousel(onNavigate = onNavigate, toast = toast, modifier = Modifier.padding(bottom = 28.dp)) }

            item {
                SectionIntro(title = tr("Reports"), subtitle = tr("Detailed readings for every part of life"), modifier = Modifier.padding(bottom = 14.dp))
            }
            item {
                HomeReportsRow(
                    reports = REPORT_CATEGORIES,
                    onClick = { report ->
                        val route = report.route
                        if (route != null) onNavigate(route) else toast("${report.label} is coming soon")
                    },
                    modifier = Modifier.padding(bottom = 28.dp),
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(tr("Astrologers"), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
                        Text(tr("Vetted acharyas with rigorous lineage"), color = colors.textSecondary, fontSize = 14.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                    Text(
                        tr("View All"),
                        color = colors.goldPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .padding(bottom = 2.dp)
                            .clickable { onNavigate(Routes.ASTROLOGERS) },
                    )
                }
            }
            val featured = featuredAstrologers
            if (featured == null) {
                item { LoadingBlock() }
            } else {
                item {
                    HomeAstrologerRow(
                        astrologers = featured,
                        onBookNow = { astrologer -> toast("Booking ${astrologer.name}…") },
                        modifier = Modifier.padding(bottom = 28.dp),
                    )
                }
            }

            item {
                PanchangCard(
                    panchang = todayPanchang,
                    onViewFull = { onNavigate(Routes.PANCHANG) },
                    modifier = Modifier.padding(top = 16.dp, bottom = 28.dp),
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(tr("Store"), color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
                        Text(tr("Gemstones, Rudraksha & sacred objects"), color = colors.textSecondary, fontSize = 14.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                    Text(
                        tr("Explore All"),
                        color = colors.goldPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .padding(bottom = 2.dp)
                            .clickable { onNavigate(Routes.TREDEVASTORE) },
                    )
                }
            }
            item { HomeStoreRow(onClick = { toast("Checkout is coming soon") }, modifier = Modifier.padding(bottom = 28.dp)) }

            item {
                SectionIntro(title = tr("Blogs"), subtitle = tr("Learn Vedic astrology at your own pace"), modifier = Modifier.padding(bottom = 14.dp))
            }
            item { HomeBlogsRow(onClick = { toast("Blogs are coming soon") }, modifier = Modifier.padding(bottom = 28.dp)) }

            item {
                SectionIntro(title = tr("Frequently Asked Questions"), subtitle = "", modifier = Modifier.padding(bottom = 14.dp))
            }
            item { HomeFaqSection(modifier = Modifier.padding(bottom = 8.dp)) }
        }

        ToastHost(
            message = toastMessage?.let { tr(it) },
            onDismiss = { toastMessage = null },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp, start = 20.dp, end = 20.dp),
        )
    }
}

@Composable
private fun DateRow(panchang: PanchangDto?, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val dateText = remember { SimpleDateFormat("EEEE, MMM d", Locale.getDefault()).format(java.util.Date()) }
    val nakshatraText = if (panchang != null) {
        "${panchang.nakshatra.name.uppercase()} NAKSHATRA • ${panchang.tithi.paksha.uppercase()} ${panchang.tithi.name.uppercase()}"
    } else {
        "LOADING TODAY'S PANCHANG…"
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = tr(nakshatraText),
            color = colors.sacredAccent,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.5.sp,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.sacredAccent.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
                .padding(horizontal = 12.dp, vertical = 8.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 10.dp)) {
            Icon(Icons.Filled.CalendarMonth, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(16.dp))
            Text(dateText, color = colors.textMuted, fontSize = 14.sp, modifier = Modifier.padding(start = 4.dp))
        }
    }
}

@Composable
private fun SectionIntro(title: String, subtitle: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(modifier = modifier.fillMaxWidth()) {
        Text(title, color = colors.textPrimary, fontFamily = NotoSerif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
        if (subtitle.isNotBlank()) {
            Text(subtitle, color = colors.textSecondary, fontSize = 14.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}
