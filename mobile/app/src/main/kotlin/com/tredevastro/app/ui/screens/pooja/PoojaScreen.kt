package com.tredevastro.app.ui.screens.pooja

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.TokenStore
import com.tredevastro.app.network.dto.PoojaBookDto
import com.tredevastro.app.network.dto.PoojaGroupSessionDto
import com.tredevastro.app.network.dto.PoojaVideoDto
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.GoldButton
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.ui.theme.NotoSerif
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Exact port of web/frontend/src/sections/Pooja/Pooja.tsx's four tabs
// (Recorded / Group / Pandit / Library) against the same real
// backend/app/api/routes.ts '/pooja/*' endpoints. The bell sound and
// animated mandala backdrop are decorative web-only flourishes, skipped
// here in favor of this app's existing CosmicBackground/HeroBanner chrome.

private enum class PoojaTab(val label: String) {
    Pandit("Book a Pandit"),
    Recorded("Recorded Pooja"),
    Group("Group Pooja"),
    Library("Library"),
}

// Same fixed list as Pooja.tsx's POOJA_TYPES.
private val POOJA_TYPES = listOf("Griha Pravesh", "Satyanarayan", "Navgraha Shanti", "Rudrabhishek", "Vastu Shanti")

@Composable
fun PoojaScreen(onRequireLogin: () -> Unit, onBrowsePandits: () -> Unit) {
    var tab by remember { mutableStateOf(PoojaTab.Pandit) }

    var videos by remember { mutableStateOf<List<PoojaVideoDto>?>(null) }
    var sessions by remember { mutableStateOf<List<PoojaGroupSessionDto>?>(null) }
    var books by remember { mutableStateOf<List<PoojaBookDto>?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableStateOf(0) }

    var videoFilter by remember { mutableStateOf("All") }
    var bookFilter by remember { mutableStateOf("All") }
    var activeVideo by remember { mutableStateOf<PoojaVideoDto?>(null) }
    var activeBook by remember { mutableStateOf<PoojaBookDto?>(null) }
    var joiningId by remember { mutableStateOf<String?>(null) }
    var joinError by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(tab, reloadKey) {
        loadError = null
        when (tab) {
            PoojaTab.Pandit -> {}
            PoojaTab.Recorded -> if (videos == null) {
                videos = try { ApiClient.service.getPoojaVideos() } catch (e: Exception) { loadError = e.message; emptyList() }
            }
            PoojaTab.Group -> if (sessions == null) {
                sessions = try { ApiClient.service.getPoojaSessions() } catch (e: Exception) { loadError = e.message; emptyList() }
            }
            PoojaTab.Library -> if (books == null) {
                books = try { ApiClient.service.getPoojaBooks() } catch (e: Exception) { loadError = e.message; emptyList() }
            }
        }
    }

    fun openUrl(url: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    fun handleJoin(session: PoojaGroupSessionDto) {
        if (!TokenStore.isSignedIn) {
            onRequireLogin()
            return
        }
        joinError = null
        joiningId = session.id
        scope.launch {
            try {
                val updated = ApiClient.service.joinPoojaSession(session.id)
                sessions = sessions?.map { s ->
                    if (s.id == session.id) updated.copy(registeredCount = if (s.registered) s.registeredCount else s.registeredCount + 1) else s
                }
            } catch (e: Exception) {
                joinError = e.message ?: "Could not join this session."
            } finally {
                joiningId = null
            }
        }
    }

    fun browsePandits() {
        if (!TokenStore.isSignedIn) {
            onRequireLogin()
        } else {
            onBrowsePandits()
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
                    title = "Pooja & Rituals",
                    subtitle = "Watch, join, book, or read — real rituals, real pandits",
                    iconRes = R.drawable.icon_spirituality,
                    modifier = Modifier.padding(bottom = 16.dp),
                )
            }

            item { PoojaTabRow(selected = tab, onSelect = { tab = it; loadError = null }, modifier = Modifier.padding(bottom = 16.dp)) }

            when (tab) {
                PoojaTab.Recorded -> recordedTabContent(videos, loadError, videoFilter, { videoFilter = it }, { reloadKey++ }, { activeVideo = it })
                PoojaTab.Group -> groupTabContent(sessions, loadError, joinError, joiningId, { reloadKey++ }, ::handleJoin, ::openUrl)
                PoojaTab.Pandit -> item { PanditTabContent(onBrowse = ::browsePandits) }
                PoojaTab.Library -> libraryTabContent(books, loadError, bookFilter, { bookFilter = it }, { reloadKey++ }, { activeBook = it })
            }
        }
    }

    activeVideo?.let { v -> VideoDialog(video = v, onDismiss = { activeVideo = null }) }
    activeBook?.let { b -> BookDialog(book = b, onOpenPdf = { openUrl(it) }, onDismiss = { activeBook = null }) }
}

@Composable
private fun PoojaTabRow(selected: PoojaTab, onSelect: (PoojaTab) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    LazyRow(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(PoojaTab.entries) { t ->
            val active = t == selected
            Text(
                tr(t.label),
                color = if (active) colors.bgPrimary else colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active) colors.goldPrimary else colors.bgSecondary)
                    .clickable { onSelect(t) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
private fun FilterChips(options: List<String>, active: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    if (options.size <= 1) return
    val colors = LocalAppColors.current
    LazyRow(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(listOf("All") + options) { opt ->
            val active2 = opt == active
            Text(
                tr(opt),
                color = if (active2) Color.White else colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active2) colors.textPrimary else Color.Transparent)
                    .clickable { onChange(opt) }
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            )
        }
    }
}

// ── Recorded Pooja ──────────────────────────────────────────────────────

private fun androidx.compose.foundation.lazy.LazyListScope.recordedTabContent(
    videos: List<PoojaVideoDto>?,
    error: String?,
    filter: String,
    onFilterChange: (String) -> Unit,
    onRetry: () -> Unit,
    onOpen: (PoojaVideoDto) -> Unit,
) {
    if (videos == null) {
        if (error != null) item { ErrorBlock(message = error, onRetry = onRetry) } else item { LoadingBlock() }
        return
    }
    if (videos.isEmpty()) {
        item { EmptyNote("No recorded poojas yet — check back soon.") }
        return
    }
    val categories = videos.map { it.category }.distinct()
    val shown = if (filter == "All") videos else videos.filter { it.category == filter }
    item { FilterChips(categories, filter, onFilterChange, modifier = Modifier.padding(bottom = 14.dp)) }

    val featured = shown.firstOrNull()
    val rest = shown.drop(1)
    if (featured != null) {
        item { FeaturedVideoCard(featured, onOpen = { onOpen(featured) }, modifier = Modifier.padding(bottom = 14.dp)) }
    }
    item {
        Column {
            rest.chunked(2).forEach { row ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { v -> VideoCard(v, onOpen = { onOpen(v) }, modifier = Modifier.weight(1f)) }
                    if (row.size == 1) Box(modifier = Modifier.weight(1f))
                }
                androidx.compose.foundation.layout.Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun FeaturedVideoCard(video: PoojaVideoDto, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(onClick = onOpen, modifier = modifier.fillMaxWidth()) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black)) {
            if (video.thumbnailUrl != null) {
                AsyncImage(model = video.thumbnailUrl, contentDescription = video.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Icon(Icons.Filled.PlayCircle, contentDescription = null, tint = Color.White, modifier = Modifier.align(Alignment.Center).size(48.dp))
            }
            Text(
                tr("FEATURED"),
                color = Color(0xFF1C0F0C),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
                    .background(colors.goldPrimary, RoundedCornerShape(999.dp))
                    .padding(horizontal = 10.dp, vertical = 3.dp),
            )
        }
        Column(modifier = Modifier.padding(14.dp)) {
            Text(video.title, color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 17.sp)
            Text(tr(video.category), color = colors.textMuted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun VideoCard(video: PoojaVideoDto, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(onClick = onOpen, modifier = modifier.fillMaxWidth()) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black)) {
            if (video.thumbnailUrl != null) {
                AsyncImage(model = video.thumbnailUrl, contentDescription = video.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Icon(Icons.Filled.PlayCircle, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.align(Alignment.Center).size(32.dp))
            }
        }
        Column(modifier = Modifier.padding(10.dp)) {
            Text(video.title, color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 13.sp, maxLines = 2)
            Text(tr(video.category), color = colors.textMuted, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

// Same 11-char video-id extraction as the website's Pooja.tsx embedUrl().
private val YOUTUBE_ID_REGEX = Regex("""(?:youtu\.be/|youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|v/))([\w-]{11})""")

private fun youtubeVideoId(url: String): String? = YOUTUBE_ID_REGEX.find(url)?.groupValues?.get(1)

private fun youtubeEmbedHtml(videoId: String): String = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; background-color: #000; }
            html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
            .player-wrap { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            iframe { width: 100%; height: 100%; border: 0; }
        </style>
    </head>
    <body>
        <div class="player-wrap">
            <iframe
                id="player"
                src="https://www.youtube.com/embed/$videoId?autoplay=1&playsinline=1&enablejsapi=1&fs=1&rel=0&iv_load_policy=3&modestbranding=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
            </iframe>
        </div>
    </body>
    </html>
""".trimIndent()

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun VideoDialog(video: PoojaVideoDto, onDismiss: () -> Unit) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val videoId = remember(video.videoUrl) { youtubeVideoId(video.videoUrl) }
    var isLoading by remember(video.videoUrl) { mutableStateOf(true) }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var customView by remember { mutableStateOf<View?>(null) }
    var customViewCallback by remember { mutableStateOf<WebChromeClient.CustomViewCallback?>(null) }

    DisposableEffect(video.videoUrl) {
        onDispose {
            try {
                webViewRef?.loadUrl("about:blank")
                webViewRef?.onPause()
                webViewRef?.pauseTimers()
                webViewRef?.destroy()
            } catch (_: Exception) {}
            webViewRef = null
        }
    }

    if (customView != null) {
        Dialog(
            onDismissRequest = {
                customViewCallback?.onCustomViewHidden()
                customView = null
                customViewCallback = null
            },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                AndroidView(
                    factory = { customView!! },
                    modifier = Modifier.fillMaxSize()
                )
                IconButton(
                    onClick = {
                        customViewCallback?.onCustomViewHidden()
                        customView = null
                        customViewCallback = null
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Exit Fullscreen", tint = Color.White)
                }
            }
        }
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)) {
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black)) {
                if (videoId != null) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            WebView(ctx).apply {
                                webViewRef = this
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                setBackgroundColor(android.graphics.Color.BLACK)

                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    mediaPlaybackRequiresUserGesture = false
                                    loadWithOverviewMode = true
                                    useWideViewPort = true
                                    allowFileAccess = true
                                    allowContentAccess = true
                                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                    val defaultUa = userAgentString ?: ""
                                    userAgentString = defaultUa.replace("; wv", "")
                                }

                                webChromeClient = object : WebChromeClient() {
                                    override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                                        customView = view
                                        customViewCallback = callback
                                    }

                                    override fun onHideCustomView() {
                                        customViewCallback?.onCustomViewHidden()
                                        customView = null
                                        customViewCallback = null
                                    }
                                }

                                webViewClient = object : WebViewClient() {
                                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                        val url = request?.url?.toString() ?: return false
                                        val uri = request.url
                                        val scheme = uri.scheme ?: ""

                                        // Suppress all intents that try to launch the external YouTube app or Google Play Store
                                        if (scheme.equals("intent", ignoreCase = true) ||
                                            scheme.equals("vnd.youtube", ignoreCase = true) ||
                                            scheme.equals("market", ignoreCase = true)
                                        ) {
                                            return true
                                        }

                                        // Keep YouTube and all video playback requests strictly within the WebView
                                        if (url.contains("youtube.com") ||
                                            url.contains("youtu.be") ||
                                            url.contains("youtube-nocookie.com") ||
                                            url.contains("googlevideo.com") ||
                                            url.contains("ytimg.com") ||
                                            url.contains("gstatic.com") ||
                                            url.contains("google.com") ||
                                            url.startsWith("data:") ||
                                            url.startsWith("about:")
                                        ) {
                                            val clickedId = youtubeVideoId(url)
                                            if (clickedId != null && clickedId != videoId) {
                                                view?.loadDataWithBaseURL("https://www.youtube.com", youtubeEmbedHtml(clickedId), "text/html", "utf-8", null)
                                                return true
                                            }
                                            return false
                                        }

                                        // Block any external navigation so the user stays in the app
                                        return true
                                    }

                                    override fun onPageFinished(view: WebView?, url: String?) {
                                        super.onPageFinished(view, url)
                                        isLoading = false
                                    }
                                }

                                val html = youtubeEmbedHtml(videoId)
                                loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "utf-8", null)
                            }
                        },
                    )
                } else {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            VideoView(ctx).apply {
                                setVideoURI(Uri.parse(video.videoUrl))
                                setMediaController(MediaController(ctx).also { it.setAnchorView(this) })
                                setOnPreparedListener { mp ->
                                    isLoading = false
                                    mp.start()
                                }
                                setOnErrorListener { _, _, _ ->
                                    isLoading = false
                                    false
                                }
                            }
                        },
                    )
                }

                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.65f)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = colors.goldPrimary,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color.Black.copy(alpha = 0.55f), CircleShape)
                        .size(34.dp)
                ) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Close",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                        Text(
                            video.title,
                            color = colors.textPrimary,
                            fontFamily = NotoSerif,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            video.category,
                            color = colors.goldPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    if (videoId != null) {
                        Text(
                            text = tr("YouTube ↗"),
                            color = colors.textMuted,
                            fontSize = 11.sp,
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(colors.bgSecondary)
                                .clickable {
                                    try {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(video.videoUrl)))
                                    } catch (_: Exception) {}
                                }
                                .padding(horizontal = 8.dp, vertical = 5.dp)
                        )
                    }
                }
            }
        }
    }
}

// ── Group Pooja ──────────────────────────────────────────────────────────

private fun androidx.compose.foundation.lazy.LazyListScope.groupTabContent(
    sessions: List<PoojaGroupSessionDto>?,
    error: String?,
    joinError: String?,
    joiningId: String?,
    onRetry: () -> Unit,
    onJoin: (PoojaGroupSessionDto) -> Unit,
    onOpenUrl: (String) -> Unit,
) {
    if (joinError != null) item { Text(joinError, color = Color(0xFFC0392B), fontSize = 12.sp, modifier = Modifier.padding(bottom = 10.dp)) }
    if (sessions == null) {
        if (error != null) item { ErrorBlock(message = error, onRetry = onRetry) } else item { LoadingBlock() }
        return
    }
    if (sessions.isEmpty()) {
        item { EmptyNote("No group poojas scheduled right now — check back soon.") }
        return
    }
    val hero = sessions.first()
    val rest = sessions.drop(1)
    item { GroupSessionHero(hero, joining = joiningId == hero.id, onJoin = { onJoin(hero) }, onOpenUrl = onOpenUrl, modifier = Modifier.padding(bottom = 14.dp)) }
    item {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            rest.forEach { s -> GroupSessionRow(s, joining = joiningId == s.id, onJoin = { onJoin(s) }, onOpenUrl = onOpenUrl) }
        }
    }
}

private data class Countdown(val days: Long, val hours: Long, val minutes: Long, val seconds: Long, val isLive: Boolean)

@Composable
private fun rememberCountdown(targetMillis: Long): Countdown {
    var now by remember(targetMillis) { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(targetMillis) {
        while (now < targetMillis) {
            delay(1000)
            now = System.currentTimeMillis()
        }
    }
    val diff = (targetMillis - now).coerceAtLeast(0)
    return Countdown(
        days = diff / 86_400_000,
        hours = (diff % 86_400_000) / 3_600_000,
        minutes = (diff % 3_600_000) / 60_000,
        seconds = (diff % 60_000) / 1000,
        isLive = diff <= 0,
    )
}

private fun formatSessionTime(millis: Long): String =
    SimpleDateFormat("d MMM, h:mm a", Locale.getDefault()).format(Date(millis))

private fun formatPrice(pricePaise: Int?): String = if (pricePaise == null || pricePaise == 0) "Free" else "₹${pricePaise / 100}"

@Composable
private fun GroupSessionHero(session: PoojaGroupSessionDto, joining: Boolean, onJoin: () -> Unit, onOpenUrl: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val cd = rememberCountdown(session.scheduledAt)
    val seatsLeft = session.capacity?.let { (it - session.registeredCount).coerceAtLeast(0) }
    val pctFull = session.capacity?.takeIf { it > 0 }?.let { ((session.registeredCount * 100) / it).coerceIn(0, 100) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xFF2B1512))
            .padding(20.dp),
    ) {
        Icon(Icons.Filled.LocalFireDepartment, contentDescription = null, tint = Color.White.copy(alpha = 0.08f), modifier = Modifier.size(160.dp).align(Alignment.TopEnd))
        Column {
            Text(
                tr(if (cd.isLive) "● LIVE NOW" else "NEXT GROUP POOJA"),
                color = colors.goldPrimary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
            )
            Text(session.title, color = Color.White, fontFamily = NotoSerif, fontSize = 20.sp, modifier = Modifier.padding(top = 6.dp))
            Text(tr("with ${session.panditName}"), color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))

            if (pctFull != null) {
                Box(modifier = Modifier.fillMaxWidth().padding(top = 14.dp).height(6.dp).clip(RoundedCornerShape(999.dp)).background(Color.White.copy(alpha = 0.15f))) {
                    Box(modifier = Modifier.fillMaxWidth(pctFull / 100f).fillMaxSize().background(colors.goldPrimary, RoundedCornerShape(999.dp)))
                }
                Text(
                    tr("${if (seatsLeft == 0) "Full" else "$seatsLeft seat${if (seatsLeft == 1) "" else "s"} left"} · ${session.registeredCount} joined"),
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            if (!cd.isLive) {
                Row(modifier = Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    CountdownUnit(cd.days, "Days")
                    CountdownUnit(cd.hours, "Hrs")
                    CountdownUnit(cd.minutes, "Min")
                    CountdownUnit(cd.seconds, "Sec")
                }
            }

            Row(modifier = Modifier.padding(top = 16.dp)) {
                when {
                    session.registered && session.meetingUrl != null -> GoldButton(text = "Join Live", onClick = { onOpenUrl(session.meetingUrl) }, fillWidth = false, compact = true)
                    session.registered -> Text(tr("✓ You're registered"), color = colors.goldPrimary, fontSize = 13.sp)
                    else -> GoldButton(
                        text = if (joining) "Joining…" else if (seatsLeft == 0) "Full" else "Join",
                        onClick = onJoin,
                        fillWidth = false,
                        compact = true,
                    )
                }
            }
        }
    }
}

@Composable
private fun CountdownUnit(value: Long, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(52.dp)) {
        Text(value.toString().padStart(2, '0'), color = Color.White, fontFamily = NotoSerif, fontSize = 20.sp)
        Text(tr(label).uppercase(), color = Color.White.copy(alpha = 0.65f), fontSize = 9.sp, letterSpacing = 1.sp)
    }
}

@Composable
private fun GroupSessionRow(session: PoojaGroupSessionDto, joining: Boolean, onJoin: () -> Unit, onOpenUrl: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    val seatsLeft = session.capacity?.let { (it - session.registeredCount).coerceAtLeast(0) }
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(session.title, color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 15.sp)
                Text(tr("with ${session.panditName}"), color = colors.textSecondary, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                Text(
                    tr("${formatSessionTime(session.scheduledAt)} · ${formatPrice(session.pricePaise)}" +
                        (seatsLeft?.let { " · ${if (it == 0) "Full" else "$it left"}" } ?: "")),
                    color = colors.textMuted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            when {
                session.registered && session.meetingUrl != null -> GoldButton(text = "Join Live", onClick = { onOpenUrl(session.meetingUrl) }, fillWidth = false, compact = true)
                session.registered -> Text(tr("Registered"), color = colors.goldPrimary, fontSize = 11.sp)
                else -> GoldButton(
                    text = if (joining) "Joining…" else if (seatsLeft == 0) "Full" else "Join",
                    onClick = onJoin,
                    fillWidth = false,
                    compact = true,
                )
            }
        }
    }
}

// ── Book a Pandit ────────────────────────────────────────────────────────

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun PanditTabContent(onBrowse: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(Icons.Filled.Groups, contentDescription = null, tint = colors.goldPrimary, modifier = Modifier.size(44.dp))
            Text(
                tr("Book a Pandit for your own Pooja"),
                color = colors.textPrimary,
                fontFamily = NotoSerif,
                fontSize = 20.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 14.dp),
            )
            Text(
                tr("Get a 1:1 session with a pandit for a specific ritual. Pick what you need, or just browse everyone who offers pooja."),
                color = colors.textMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp),
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                modifier = Modifier.padding(top = 18.dp),
            ) {
                POOJA_TYPES.forEach { p ->
                    Text(
                        tr(p),
                        color = colors.textSecondary,
                        fontSize = 12.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(colors.bgSecondary)
                            .clickable(onClick = onBrowse)
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    )
                }
            }
            GoldButton(text = "Browse All Pandits", onClick = onBrowse, fillWidth = false, modifier = Modifier.padding(top = 20.dp))
        }
    }
}

// ── Library ──────────────────────────────────────────────────────────────

private fun androidx.compose.foundation.lazy.LazyListScope.libraryTabContent(
    books: List<PoojaBookDto>?,
    error: String?,
    filter: String,
    onFilterChange: (String) -> Unit,
    onRetry: () -> Unit,
    onOpen: (PoojaBookDto) -> Unit,
) {
    if (books == null) {
        if (error != null) item { ErrorBlock(message = error, onRetry = onRetry) } else item { LoadingBlock() }
        return
    }
    if (books.isEmpty()) {
        item { EmptyNote("No books added yet — check back soon.") }
        return
    }
    val categories = books.map { it.category }.distinct()
    val shown = if (filter == "All") books else books.filter { it.category == filter }
    item { FilterChips(categories, filter, onFilterChange, modifier = Modifier.padding(bottom = 14.dp)) }
    item {
        Column {
            shown.chunked(2).forEach { row ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { b -> BookCard(b, onOpen = { onOpen(b) }, modifier = Modifier.weight(1f)) }
                    if (row.size == 1) Box(modifier = Modifier.weight(1f))
                }
                androidx.compose.foundation.layout.Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun BookCard(book: PoojaBookDto, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(onClick = onOpen, modifier = modifier.fillMaxWidth()) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(0.75f).background(Color(0xFF3A1A12))) {
            if (book.coverImageUrl != null) {
                AsyncImage(model = book.coverImageUrl, contentDescription = book.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = Color.White, modifier = Modifier.align(Alignment.Center).size(36.dp))
            }
            Text(
                tr(if (book.pdfUrl != null) "PDF" else "TEXT"),
                color = Color.White,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
                    .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(999.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
        Column(modifier = Modifier.padding(10.dp)) {
            Text(tr(book.title), color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 13.sp, maxLines = 2)
            book.author?.let { Text(it, color = colors.textMuted, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp)) }
            Text(tr(book.category), color = colors.textSecondary, fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun BookDialog(book: PoojaBookDto, onOpenPdf: (String) -> Unit, onDismiss: () -> Unit) {
    val colors = LocalAppColors.current
    Dialog(onDismissRequest = onDismiss) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                if (book.coverImageUrl != null) {
                    AsyncImage(
                        model = book.coverImageUrl,
                        contentDescription = book.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(10.dp)).padding(bottom = 14.dp),
                    )
                }
                Row(verticalAlignment = Alignment.Top) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(book.title, color = colors.textPrimary, fontFamily = NotoSerif, fontSize = 18.sp)
                        book.author?.let { Text(it, color = colors.textMuted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp)) }
                    }
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close", tint = colors.textMuted) }
                }
                book.content?.let {
                    Text(
                        it,
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        lineHeight = 20.sp,
                        modifier = Modifier.padding(top = 14.dp).heightIn(max = 320.dp).verticalScroll(rememberScrollState()),
                    )
                }
                book.pdfUrl?.let { url ->
                    GoldButton(text = "Open PDF", onClick = { onOpenPdf(url) }, modifier = Modifier.padding(top = 16.dp))
                }
            }
        }
    }
}

@Composable
private fun EmptyNote(text: String) {
    val colors = LocalAppColors.current
    Text(tr(text), color = colors.textMuted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 24.dp))
}
