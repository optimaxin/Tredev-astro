package com.tredevastro.app.ui.components

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.navigation.Routes
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.dto.BannerDto
import com.tredevastro.app.ui.theme.NotoSerif
import kotlinx.coroutines.delay

private data class BannerSlide(
    val category: String,
    val title: String,
    val description: String,
    val cta: String,
    val accentColor: Color,
    val gradient: List<Color>,
    val route: String?,
    val image: Int,
)

// Mirrors web/frontend/src/sections/CampaignBanner/CampaignBanner.tsx's
// SLIDES exactly (same 5 campaigns, same copy, same order) — the site's own
// fallback carousel for whenever staff haven't uploaded a banner. `route`
// is null for the two campaigns this app has no matching screen for yet
// (Reports catalog, Gurukul) — those toast "coming soon" like every other
// not-yet-built destination, rather than pointing somewhere wrong.
private val STATIC_SLIDES = listOf(
    BannerSlide(
        category = "VEDIC JYOTISH",
        title = "Discover the Map\nWritten at Your Birth",
        description = "Explore your Rashis, Grahas and Nakshatras through an authentic Vedic Kundli — free, instantly.",
        cta = "Generate Free Kundli",
        accentColor = Color(0xFFC7A15A),
        gradient = listOf(Color(0xFF080C1C), Color(0xFF17253A)),
        route = Routes.KUNDLI,
        image = R.drawable.banner_astro_a1,
    ),
    BannerSlide(
        category = "ASTROLOGIST CONSULTATION",
        title = "Speak to an Astrologist\nWho Understands",
        description = "Connect with verified Vedic astrologers for personalized guidance on your life's most important questions.",
        cta = "Consult an Astrologist",
        accentColor = Color(0xFFA85B2D),
        gradient = listOf(Color(0xFF17101F), Color(0xFF24131A)),
        route = Routes.ASTROLOGERS,
        image = R.drawable.banner_astro_a2,
    ),
    BannerSlide(
        category = "JYOTISH REPORTS",
        title = "Go Deeper into\nYour Planetary Patterns",
        description = "Detailed Jyotish analysis across career, marriage, health and destiny by classical Vedic methods.",
        cta = "Explore Reports",
        accentColor = Color(0xFF9A5428),
        gradient = listOf(Color(0xFF0C1230), Color(0xFF111A34)),
        route = null,
        image = R.drawable.banner_astro_a3,
    ),
    BannerSlide(
        category = "TREDEVASTORE",
        title = "Sacred Objects Chosen\nfor Your Journey",
        description = "Authentic gemstones, Rudraksha, Yantras and sacred objects — energized for your Kundli.",
        cta = "Explore TredevaStore",
        accentColor = Color(0xFFC7A15A),
        gradient = listOf(Color(0xFF1A1008), Color(0xFF241810)),
        route = Routes.TREDEVASTORE,
        image = R.drawable.banner_astro_a1,
    ),
    BannerSlide(
        category = "TREDEVAASTRO GURUKUL",
        title = "Learn the Language\nof Jyotish",
        description = "Study Vedic astrology from foundation to mastery through structured courses taught by expert Acharyas.",
        cta = "Explore Gurukul",
        accentColor = Color(0xFFB58A3B),
        gradient = listOf(Color(0xFF0A1020), Color(0xFF101828)),
        route = null,
        image = R.drawable.banner_astro_a2,
    ),
)

private fun decodeDataUrl(dataUrl: String): ImageBitmap? {
    val commaIndex = dataUrl.indexOf(',')
    if (commaIndex == -1) return null
    return try {
        val bytes = Base64.decode(dataUrl.substring(commaIndex + 1), Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
    } catch (e: IllegalArgumentException) {
        null
    }
}

/** Matches the website's own CampaignBanner: staff-uploaded banners (from
 * /api/banners/active) take over whenever any exist, otherwise falls back to
 * the same static campaign carousel the site itself falls back to. Only
 * image banners render — there's no in-app video player wired up yet, same
 * gap the rest of this app has for video content generally. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeBannerCarousel(onNavigate: (String) -> Unit, toast: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var liveBanners by remember { mutableStateOf<List<BannerDto>?>(null) }

    LaunchedEffect(Unit) {
        liveBanners = try {
            ApiClient.service.getActiveBanners().filter { it.mediaType == "image" }
        } catch (e: Exception) {
            emptyList()
        }
    }

    val dynamicBanners = liveBanners
    if (dynamicBanners != null && dynamicBanners.isNotEmpty()) {
        DynamicBannerPager(banners = dynamicBanners, onLink = { linkUrl ->
            if (linkUrl == null) return@DynamicBannerPager
            if (linkUrl.startsWith("http://") || linkUrl.startsWith("https://")) {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(linkUrl)))
            }
        }, modifier = modifier)
        return
    }

    val pagerState = rememberPagerState(pageCount = { STATIC_SLIDES.size })

    LaunchedEffect(pagerState) {
        while (true) {
            delay(5000)
            val next = (pagerState.currentPage + 1) % STATIC_SLIDES.size
            pagerState.animateScrollToPage(next)
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        HorizontalPager(state = pagerState, pageSpacing = 12.dp) { page ->
            val slide = STATIC_SLIDES[page]
            BannerCard(slide = slide, onClick = {
                val route = slide.route
                if (route != null) onNavigate(route) else toast("${slide.cta} is coming soon")
            })
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            STATIC_SLIDES.indices.forEach { i ->
                val active = i == pagerState.currentPage
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (active) 8.dp else 6.dp)
                        .background(if (active) STATIC_SLIDES[i].accentColor else Color.White.copy(alpha = 0.3f), CircleShape),
                )
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun DynamicBannerPager(banners: List<BannerDto>, onLink: (String?) -> Unit, modifier: Modifier = Modifier) {
    val pagerState = rememberPagerState(pageCount = { banners.size })

    LaunchedEffect(pagerState, banners.size) {
        if (banners.size <= 1) return@LaunchedEffect
        while (true) {
            delay(6000)
            val next = (pagerState.currentPage + 1) % banners.size
            pagerState.animateScrollToPage(next)
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        HorizontalPager(state = pagerState, pageSpacing = 12.dp) { page ->
            val banner = banners[page]
            val bitmap = remember(banner.id) { decodeDataUrl(banner.mediaData) }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(198.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF17253A))
                    .clickable(enabled = banner.linkUrl != null) { onLink(banner.linkUrl) },
            ) {
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
            }
        }
        if (banners.size > 1) {
            Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.Center) {
                banners.indices.forEach { i ->
                    val active = i == pagerState.currentPage
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .size(if (active) 8.dp else 6.dp)
                            .background(if (active) Color(0xFFC7A15A) else Color.White.copy(alpha = 0.3f), CircleShape),
                    )
                }
            }
        }
    }
}

@Composable
private fun BannerCard(slide: BannerSlide, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(198.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(slide.gradient))
            .clickable(onClick = onClick),
    ) {
        Column(
            modifier = Modifier.weight(1f).fillMaxHeight().padding(18.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(tr(slide.category), color = slide.accentColor, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
            Text(
                tr(slide.title),
                color = Color.White,
                fontFamily = NotoSerif,
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
                lineHeight = 22.sp,
                modifier = Modifier.padding(top = 6.dp),
            )
            Text(
                tr(slide.description),
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 11.sp,
                lineHeight = 15.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 6.dp),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .padding(top = 12.dp)
                    .background(slide.accentColor, RoundedCornerShape(999.dp))
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(tr(slide.cta), color = Color(0xFF15100A), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    tint = Color(0xFF15100A),
                    modifier = Modifier.size(12.dp).padding(start = 4.dp),
                )
            }
        }
        Image(
            painter = painterResource(slide.image),
            contentDescription = null,
            contentScale = ContentScale.FillHeight,
            modifier = Modifier.fillMaxHeight().padding(top = 10.dp),
        )
    }
}
