package com.tredevastro.app.ui.screens.panchang

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.data.ZODIAC_SIGNS
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.ApiResult
import com.tredevastro.app.network.PanchangBody
import com.tredevastro.app.network.dto.PanchangDto
import com.tredevastro.app.network.safeApiCall
import com.tredevastro.app.ui.components.CosmicBackground
import com.tredevastro.app.ui.components.ErrorBlock
import com.tredevastro.app.ui.components.GlassCard
import com.tredevastro.app.ui.components.HeroBanner
import com.tredevastro.app.ui.components.LoadingBlock
import com.tredevastro.app.ui.theme.LocalAppColors
import com.tredevastro.app.util.formatIsoTime24h
import com.tredevastro.app.util.formatWindow24h
import java.text.SimpleDateFormat
import java.util.Locale

// New Delhi — matches the website's own hardcoded default location before a
// visitor searches their own city (Panchang.tsx has no geolocation either).
private const val DEFAULT_LATITUDE = 28.6139
private const val DEFAULT_LONGITUDE = 77.2090
private const val DEFAULT_LOCATION_NAME = "New Delhi, India"

/** Ports web/frontend/src/sections/Panchang/PanchangSharePoster.tsx pixel-for-
 * pixel-in-spirit — same ivory/gold poster layout, same section order, same
 * copy — as a real Bitmap drawn via plain android.graphics (the website
 * builds it with html2canvas over real DOM; there's no Compose equivalent of
 * that, so this draws the same visual result directly instead). */
private object SharePalette {
    val page = android.graphics.Color.parseColor("#FAF5E9")
    val panel = android.graphics.Color.parseColor("#FFFDF6")
    val edge = android.graphics.Color.parseColor("#DCC9A0")
    val gold = android.graphics.Color.parseColor("#9B6F1F")
    val goldDim = android.graphics.Color.parseColor("#A8895A")
    val ink = android.graphics.Color.parseColor("#3A2C18")
    val accent = android.graphics.Color.parseColor("#B8501D")
}

private fun buildPanchangShareBitmap(context: android.content.Context, p: PanchangDto, location: String): android.graphics.Bitmap {
    val res = context.resources
    val s = 1.5f
    fun px(v: Float) = v * s

    val width = px(900f).toInt()
    val maxHeight = px(1780f).toInt()
    val bitmap = android.graphics.Bitmap.createBitmap(width, maxHeight, android.graphics.Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(bitmap)
    canvas.drawColor(SharePalette.page)

    fun serif(size: Float, color: Int, bold: Boolean = false, italic: Boolean = false, letterSpacingEm: Float = 0f) =
        android.graphics.Paint().apply {
            isAntiAlias = true
            textSize = size
            this.color = color
            val style = when {
                bold && italic -> android.graphics.Typeface.BOLD_ITALIC
                bold -> android.graphics.Typeface.BOLD
                italic -> android.graphics.Typeface.ITALIC
                else -> android.graphics.Typeface.NORMAL
            }
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.SERIF, style)
            if (letterSpacingEm != 0f) letterSpacing = letterSpacingEm
        }

    fun centerText(text: String, cx: Float, baseline: Float, paint: android.graphics.Paint) {
        canvas.drawText(text, cx - paint.measureText(text) / 2f, baseline, paint)
    }

    fun panelRect(top: Float, height: Float, left: Float, right: Float): android.graphics.RectF {
        val rect = android.graphics.RectF(left, top, right, top + height)
        val fill = android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.panel }
        val stroke = android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.edge; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(1f) }
        val radius = px(10f)
        canvas.drawRoundRect(rect, radius, radius, fill)
        canvas.drawRoundRect(rect, radius, radius, stroke)
        return rect
    }

    fun vDivider(x: Float, top: Float, bottom: Float) {
        canvas.drawLine(x, top, x, bottom, android.graphics.Paint().apply { color = SharePalette.edge; strokeWidth = px(1f) })
    }

    val outerPad = px(26f)
    val cardLeft = outerPad
    val cardRight = width - outerPad
    val contentPadH = px(24f)
    val contentX = cardLeft + contentPadH
    val contentRight = cardRight - contentPadH
    val contentW = contentRight - contentX
    val cx = (contentX + contentRight) / 2f

    var y = outerPad + px(22f)

    // Header divider + logo/title/Om + shloka
    centerText("❖ ── ✦ ── ❖", cx, y + px(10f), serif(px(14f), SharePalette.goldDim, letterSpacingEm = 0.25f))
    y += px(38f)

    val logoSize = px(58f).toInt()
    val logoBitmap = android.graphics.Bitmap.createScaledBitmap(
        android.graphics.BitmapFactory.decodeResource(res, R.drawable.logo_mark), logoSize, logoSize, true,
    )
    val titlePaint = serif(px(48f), SharePalette.gold)
    val omPaint = serif(px(36f), SharePalette.accent)
    val titleText = "TredevaAstro"
    val gap = px(14f)
    val rowW = logoSize + gap + titlePaint.measureText(titleText) + gap + omPaint.measureText("ॐ")
    val rowTop = y
    val rowH = px(64f)
    var rowX = cx - rowW / 2f
    canvas.drawBitmap(logoBitmap, rowX, rowTop + (rowH - logoSize) / 2f, null)
    rowX += logoSize + gap
    canvas.drawText(titleText, rowX, rowTop + rowH / 2f + px(16f), titlePaint)
    rowX += titlePaint.measureText(titleText) + gap
    canvas.drawText("ॐ", rowX, rowTop + rowH / 2f + px(12f), omPaint)
    y += rowH + px(12f)

    val shlokaPaint = serif(px(17f), SharePalette.ink)
    centerText("वक्रतुंड महाकाय, सूर्यकोटि समप्रभ।", cx, y + px(15f), shlokaPaint)
    y += px(28f)
    centerText("निर्विघ्नं कुरु मे देव, सर्वकार्येषु सर्वदा॥", cx, y + px(15f), shlokaPaint)
    y += px(30f)

    // Astrologer photo — overlaps the top-right corner, same as the site's absolute-positioned <img>
    val acharyaSrc = android.graphics.BitmapFactory.decodeResource(res, R.drawable.icon_acharya)
    val photoH = px(120f)
    val photoW = photoH * acharyaSrc.width / acharyaSrc.height
    val photoBitmap = android.graphics.Bitmap.createScaledBitmap(acharyaSrc, photoW.toInt(), photoH.toInt(), true)
    canvas.drawBitmap(photoBitmap, cardRight - px(12f) - photoW, outerPad + px(2f), null)

    y += px(16f)

    // Date / era panel
    run {
        val panelH = px(150f)
        val rect = panelRect(y, panelH, contentX, contentRight)
        val midY = rect.centerY()
        val iconColW = px(64f)
        val dividerX = contentX + iconColW + (contentW - iconColW * 2) / 2f
        val leftBlockCx = contentX + iconColW + (dividerX - contentX - iconColW) / 2f
        val rightBlockCx = dividerX + iconColW + (contentRight - iconColW - dividerX) / 2f

        centerText("☾", contentX + iconColW / 2f, midY + px(16f), serif(px(42f), SharePalette.gold))
        centerText("ॐ", contentRight - iconColW / 2f, midY + px(14f), serif(px(36f), SharePalette.gold))
        vDivider(dividerX, rect.top + px(16f), rect.bottom - px(16f))

        val today = SimpleDateFormat("d MMMM yyyy", Locale.getDefault()).format(java.util.Date())
        var ly = midY - px(24f)
        centerText(today, leftBlockCx, ly, serif(px(18f), SharePalette.gold))
        ly += px(27f)
        centerText("${p.vara}, ${p.tithi.paksha} Paksha", leftBlockCx, ly, serif(px(18f), SharePalette.ink))
        ly += px(27f)
        centerText("${p.tithi.name} Tithi", leftBlockCx, ly, serif(px(18f), SharePalette.ink))

        var ry = midY - px(24f)
        val vikram = p.samvat?.vikram
        val shaka = p.samvat?.shaka
        centerText(if (vikram != null) "Vikram Samvat $vikram" else "Vikram Samvat —", rightBlockCx, ry, serif(px(18f), SharePalette.ink))
        ry += px(27f)
        centerText(if (shaka != null) "Shaka Samvat $shaka" else "Shaka Samvat —", rightBlockCx, ry, serif(px(18f), SharePalette.ink))
        ry += px(25f)
        centerText(location, rightBlockCx, ry, serif(px(15f), SharePalette.goldDim))

        y += panelH + px(12f)
    }

    // Tithi / Nakshatra / Yoga row
    run {
        val panelH = px(150f)
        val gapPx = px(12f)
        val colW = (contentW - gapPx * 2) / 3f
        data class Col(val icon: String, val label: String, val name: String, val start: String?, val end: String?)
        val cols = listOf(
            Col("☽", "Today's Tithi", "${p.tithi.paksha} ${p.tithi.name}", p.tithi.start, p.tithi.end),
            Col("✦", "Nakshatra", p.nakshatra.name, p.nakshatra.start, p.nakshatra.end),
            Col("∞", "Yoga", p.yoga, null, null),
        )
        cols.forEachIndexed { i, col ->
            val left = contentX + i * (colW + gapPx)
            val rect = panelRect(y, panelH, left, left + colW)
            val colCx = rect.centerX()
            var cy = rect.top + px(28f)
            centerText("${col.icon}  ${col.label}", colCx, cy, serif(px(16f), SharePalette.gold))
            cy += px(34f)
            centerText(col.name, colCx, cy, serif(px(22f), SharePalette.gold))
            if (col.start != null && col.end != null) {
                cy += px(30f)
                centerText("Starts — ${formatIsoTime24h(col.start)}", colCx, cy, serif(px(13f), SharePalette.ink))
                cy += px(20f)
                centerText("Ends — ${formatIsoTime24h(col.end)}", colCx, cy, serif(px(13f), SharePalette.ink))
            }
        }
        y += panelH + px(12f)
    }

    // Sunrise/Sunset + Moonrise/Moonset row
    run {
        val panelH = px(120f)
        val gapPx = px(12f)
        val colW = (contentW - gapPx) / 2f

        fun sunMoonPanel(left: Float, icon: String, label: String, aLabel: String, aValue: String, bLabel: String, bValue: String) {
            val rect = panelRect(y, panelH, left, left + colW)
            centerText("$icon $label", rect.centerX(), rect.top + px(26f), serif(px(16f), SharePalette.gold))
            val half = (rect.right - rect.left) / 2f
            val dividerX = rect.left + half
            vDivider(dividerX, rect.top + px(40f), rect.bottom - px(14f))
            centerText(aLabel, rect.left + half / 2f, rect.top + px(64f), serif(px(13f), SharePalette.goldDim))
            centerText(aValue, rect.left + half / 2f, rect.top + px(92f), serif(px(18f), SharePalette.ink))
            centerText(bLabel, rect.right - half / 2f, rect.top + px(64f), serif(px(13f), SharePalette.goldDim))
            centerText(bValue, rect.right - half / 2f, rect.top + px(92f), serif(px(18f), SharePalette.ink))
        }

        sunMoonPanel(contentX, "☀", "Sunrise & Sunset", "Sunrise", formatIsoTime24h(p.sunrise), "Sunset", formatIsoTime24h(p.sunset))
        sunMoonPanel(contentX + colW + gapPx, "☾", "Moonrise & Moonset", "Moonrise", formatIsoTime24h(p.moonrise), "Moonset", formatIsoTime24h(p.moonset))
        y += panelH + px(12f)
    }

    // Bottom 3-column panel: detail rows / Graha Positions / Rashi wheel
    run {
        val panelH = px(300f)
        val rect = panelRect(y, panelH, contentX, contentRight)
        val padH = px(16f)
        val leftColW = px(190f)
        val rightColW = px(190f)
        val gapPx = px(18f)
        val leftX = rect.left + padH
        val leftDividerX = leftX + leftColW + gapPx / 2f
        val midX = leftDividerX + gapPx / 2f
        val rightDividerX = rect.right - padH - rightColW - gapPx / 2f
        val rightX = rightDividerX + gapPx / 2f
        vDivider(leftDividerX, rect.top + px(16f), rect.bottom - px(16f))
        vDivider(rightDividerX, rect.top + px(16f), rect.bottom - px(16f))

        // Left column — detail rows
        val karanaLabel = if (p.angaReference == "now") "Karana (current)" else "Karana (at sunrise)"
        val details = listOf(
            "☀" to (karanaLabel to p.karana),
            "✺" to ("Weekday" to p.vara),
            "☾" to ("Paksha" to p.tithi.paksha),
            "❁" to ("Ritu" to p.ritu.ifBlank { "—" }),
            "◈" to ("Maas" to p.maas.ifBlank { "—" }),
        )
        var dy = rect.top + px(30f)
        details.forEach { (icon, pair) ->
            val (label, value) = pair
            val badgeCx = leftX + px(15f)
            canvas.drawCircle(badgeCx, dy - px(6f), px(15f), android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.edge; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(1f) })
            centerText(icon, badgeCx, dy, serif(px(14f), SharePalette.gold))
            canvas.drawText(label, leftX + px(38f), dy - px(6f), serif(px(12f), SharePalette.goldDim))
            canvas.drawText(value, leftX + px(38f), dy + px(12f), serif(px(15f), SharePalette.ink))
            dy += px(48f)
        }

        // Middle column — Graha Positions
        centerText("✧ Graha Positions ✧", (midX + rightDividerX) / 2f, rect.top + px(24f), serif(px(16f), SharePalette.gold))
        var gy = rect.top + px(52f)
        p.grahaPositions.forEach { g ->
            val meta = PLANET_META[g.id]
            canvas.drawText(meta?.symbol ?: "•", midX, gy, serif(px(16f), SharePalette.gold))
            canvas.drawText(meta?.name ?: g.id.replaceFirstChar { it.uppercase() }, midX + px(28f), gy, serif(px(15f), SharePalette.ink))
            canvas.drawText("—", midX + px(120f), gy, serif(px(15f), SharePalette.goldDim))
            canvas.drawText(g.rashi, midX + px(138f), gy, serif(px(15f), SharePalette.ink))
            gy += px(26f)
        }

        // Right column — Rashi Positions wheel
        val rc = rightX + rightColW / 2f
        centerText("Rashi Positions", rc, rect.top + px(24f), serif(px(16f), SharePalette.gold))
        centerText("(by Moon sign)", rc, rect.top + px(40f), serif(px(12f), SharePalette.goldDim))
        val wheelSize = px(150f)
        val wheelCx = rc
        val wheelCy = rect.top + px(52f) + wheelSize / 2f
        val wheelR = wheelSize / 2f
        canvas.drawCircle(wheelCx, wheelCy, wheelR, android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.page; style = android.graphics.Paint.Style.FILL })
        canvas.drawCircle(wheelCx, wheelCy, wheelR, android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.edge; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(1f) })
        canvas.drawCircle(wheelCx, wheelCy, px(26f), android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.panel; style = android.graphics.Paint.Style.FILL })
        canvas.drawCircle(wheelCx, wheelCy, px(26f), android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.goldDim; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(1f) })
        centerText("ॐ", wheelCx, wheelCy + px(11f), serif(px(24f), SharePalette.gold))
        val ringR = wheelR - px(18f)
        val slotR = px(13f)
        ZODIAC_SIGNS.forEachIndexed { i, sign ->
            val angle = (i / 12.0 * Math.PI * 2 - Math.PI / 2).toFloat()
            val sx = wheelCx + kotlin.math.cos(angle) * ringR
            val sy = wheelCy + kotlin.math.sin(angle) * ringR
            val active = sign.eng == p.moonRashi
            if (active) {
                canvas.drawCircle(sx, sy, slotR, android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.panel; style = android.graphics.Paint.Style.FILL })
                canvas.drawCircle(sx, sy, slotR, android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.gold; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(2f) })
            }
            val iconSize = px(18f).toInt()
            val iconBitmap = android.graphics.Bitmap.createScaledBitmap(android.graphics.BitmapFactory.decodeResource(res, sign.iconRes), iconSize, iconSize, true)
            canvas.drawBitmap(iconBitmap, sx - iconSize / 2f, sy - iconSize / 2f, null)
        }
        centerText(p.moonRashi, rc, wheelCy + wheelR + px(24f), serif(px(15f), SharePalette.gold))

        y += panelH + px(12f)
    }

    // Today's Highlights
    run {
        val lines = buildList {
            p.abhijitMuhurat?.let { add("Abhijit Muhurat — ${formatWindow24h(it)}" to false) }
            p.rahuKaal?.let { add("Rahu Kaal — ${formatWindow24h(it)}" to false) }
            if (p.sarvarthaSiddhiYoga) add("Sarvartha Siddhi Yoga is present today." to true)
        }
        val panelH = px(40f) + lines.size * px(28f)
        val rect = panelRect(y, panelH, contentX, contentRight)
        val labelColW = px(96f)
        val dividerX = rect.left + px(16f) + labelColW
        vDivider(dividerX, rect.top + px(12f), rect.bottom - px(12f))
        centerText("Today's", rect.left + px(16f) + labelColW / 2f, rect.centerY() - px(4f), serif(px(16f), SharePalette.gold))
        centerText("Highlights", rect.left + px(16f) + labelColW / 2f, rect.centerY() + px(20f), serif(px(16f), SharePalette.gold))
        var hy = rect.top + px(30f)
        lines.forEach { (text, gold) ->
            canvas.drawText(text, dividerX + px(20f), hy, serif(px(15f), if (gold) SharePalette.gold else SharePalette.ink))
            hy += px(28f)
        }
        y += panelH
    }

    // Footer
    y += px(14f)
    centerText("❖ ── ✦ ── ❖", cx, y, serif(px(14f), SharePalette.goldDim, letterSpacingEm = 0.25f))
    y += px(24f)
    centerText("Om Sarve Bhavantu Sukhinah", cx, y, serif(px(16f), SharePalette.gold, italic = true))
    y += px(22f)
    centerText("tredevaastro.com", cx, y, serif(px(14f), SharePalette.goldDim))
    y += px(20f)

    // Outer card border, sized to the content actually drawn
    val finalBottom = (y + outerPad).coerceAtMost(maxHeight.toFloat())
    val borderRect = android.graphics.RectF(cardLeft, outerPad, cardRight, finalBottom - outerPad + px(22f))
    canvas.drawRoundRect(
        borderRect, px(14f), px(14f),
        android.graphics.Paint().apply { isAntiAlias = true; color = SharePalette.goldDim; style = android.graphics.Paint.Style.STROKE; strokeWidth = px(2f) },
    )

    return android.graphics.Bitmap.createBitmap(bitmap, 0, 0, width, finalBottom.toInt().coerceAtMost(maxHeight))
}

private fun sharePanchangImage(context: android.content.Context, p: PanchangDto, location: String) {
    val bitmap = buildPanchangShareBitmap(context, p, location)
    val cacheDir = java.io.File(context.cacheDir, "shared_images").apply { mkdirs() }
    val file = java.io.File(cacheDir, "panchang_share.png")
    java.io.FileOutputStream(file).use { out -> bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out) }
    val uri = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(sendIntent, "Share today's Panchang"))
}

@Composable
fun PanchangScreen(onBack: (() -> Unit)? = null) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    var panchang by remember { mutableStateOf<PanchangDto?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableStateOf(0) }
    val weekday = remember { SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(java.util.Date()) }

    LaunchedEffect(reloadKey) {
        errorMessage = null
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())
        when (val result = safeApiCall { ApiClient.service.getPanchang(PanchangBody(dateStr, DEFAULT_LATITUDE, DEFAULT_LONGITUDE)) }) {
            is ApiResult.Success -> panchang = result.data
            is ApiResult.Failure -> errorMessage = result.message
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
                    title = "Sacred Panchang",
                    subtitle = "$weekday · ◈ $DEFAULT_LOCATION_NAME",
                    iconRes = R.drawable.icon_acharya,
                    onBack = onBack,
                    modifier = Modifier.padding(bottom = 16.dp),
                )
            }

            val current = panchang
            if (current != null) {
                item {
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalArrangement = Arrangement.End) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .background(colors.goldPrimary.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
                                .padding(horizontal = 4.dp),
                        ) {
                            IconButton(onClick = { sharePanchangImage(context, current, DEFAULT_LOCATION_NAME) }) {
                                Icon(Icons.Filled.Share, contentDescription = "Share Panchang", tint = colors.goldPrimary, modifier = Modifier.size(18.dp))
                            }
                            Text(tr("Share"), color = colors.goldPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(end = 12.dp))
                        }
                    }
                }
            }
            if (current == null) {
                if (errorMessage != null) {
                    item { ErrorBlock(message = errorMessage ?: "", onRetry = { reloadKey++ }) }
                } else {
                    item { LoadingBlock() }
                }
            } else {
                item {
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        HeroTile(label = "Tithi", value = current.tithi.name, sub = current.tithi.paksha, modifier = Modifier.weight(1f))
                        HeroTile(label = "Nakshatra", value = current.nakshatra.name, sub = "Pada ${current.nakshatra.pada}", modifier = Modifier.weight(1f))
                        HeroTile(label = "Moon Rashi", value = current.moonRashi, sub = null, modifier = Modifier.weight(1f))
                    }
                }
                item {
                    Column(modifier = Modifier.padding(bottom = 12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            DetailTile(label = "Weekday", value = current.vara, modifier = Modifier.weight(1f))
                            DetailTile(label = "Yoga", value = current.yoga, modifier = Modifier.weight(1f))
                        }
                        Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            val karanaLabel = if (current.angaReference == "now") "Karana (current)" else "Karana (at sunrise)"
                            DetailTile(label = karanaLabel, value = current.karana, modifier = Modifier.weight(1f))
                            DetailTile(label = "Sun Rashi", value = current.sunRashi, modifier = Modifier.weight(1f))
                        }
                    }
                }

                item { SunMoonRow(panchang = current, modifier = Modifier.padding(bottom = 16.dp)) }

                item {
                    Text(tr("Auspicious · Shubh"), color = Color(0xFF50C878), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
                }
                current.abhijitMuhurat?.let { item { MuhuratPill(title = "Abhijit Muhurat", time = formatWindow24h(it), tint = Color(0xFF50C878)) } }
                current.vijayaMuhurat?.let { item { MuhuratPill(title = "Vijaya Muhurat", time = formatWindow24h(it), tint = Color(0xFF50C878)) } }
                current.amritKaal?.let { item { MuhuratPill(title = "Amrit Kaal", time = formatWindow24h(it), tint = Color(0xFF50C878)) } }
                if (current.sarvarthaSiddhiYoga) {
                    item { MuhuratPill(title = "Sarvartha Siddhi Yoga", time = tr("Today"), tint = Color(0xFF50C878)) }
                }

                item {
                    Text(tr("Inauspicious · Ashubh"), color = colors.sacredAccent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp, bottom = 8.dp))
                }
                current.rahuKaal?.let { item { MuhuratPill(title = "Rahu Kaal", time = formatWindow24h(it), tint = colors.sacredAccent) } }
                current.yamagandaKaal?.let { item { MuhuratPill(title = "Yamaganda Kaal", time = formatWindow24h(it), tint = colors.sacredAccent, modifier = Modifier.padding(top = 8.dp)) } }

                if (current.maas.isNotBlank() || current.samvat != null) {
                    item {
                        Column(modifier = Modifier.padding(top = 16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                DetailTile(label = "Maas", value = current.maas, modifier = Modifier.weight(1f))
                                DetailTile(label = "Ritu", value = current.ritu, modifier = Modifier.weight(1f))
                            }
                            current.samvat?.let { samvat ->
                                Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    DetailTile(label = "Vikram Samvat", value = "${samvat.vikram}", modifier = Modifier.weight(1f))
                                    DetailTile(label = "Shaka Samvat", value = "${samvat.shaka}", modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }

                if (current.grahaPositions.isNotEmpty()) {
                    item {
                        Text(tr("Graha Positions"), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 20.dp, bottom = 8.dp))
                    }
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                current.grahaPositions.forEach { g ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            PLANET_META[g.id]?.name ?: g.id.replaceFirstChar { it.uppercase() },
                                            color = colors.textPrimary,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Text(tr(g.rashi), color = colors.goldPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        tr("ॐ Om Sarve Bhavantu Sukhinah · Indian Standard Time (IST)"),
                        color = colors.textMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroTile(label: String, value: String, sub: String?, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.height(110.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth().fillMaxHeight().padding(vertical = 10.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(tr(label), color = colors.textMuted, fontSize = 10.sp)
            Text(
                tr(value),
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 16.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            if (sub != null) Text(tr(sub), color = colors.goldPrimary, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun DetailTile(label: String, value: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp)) {
            Text(tr(label), color = colors.textMuted, fontSize = 10.sp)
            Text(tr(value), color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun SunMoonRow(panchang: PanchangDto, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(modifier = Modifier.weight(1f)) {
                Text(tr("☀ Sunrise / Sunset"), color = colors.textMuted, fontSize = 10.sp)
                Text("${formatIsoTime24h(panchang.sunrise)} – ${formatIsoTime24h(panchang.sunset)}", color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(tr("☾ Moonrise / Moonset"), color = colors.textMuted, fontSize = 10.sp)
                val moonText = if (panchang.moonrise == null && panchang.moonset == null) tr("None") else "${formatIsoTime24h(panchang.moonrise)} – ${formatIsoTime24h(panchang.moonset)}"
                Text(moonText, color = colors.textPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun MuhuratPill(title: String, time: String, tint: Color, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(tint.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(tr(title), color = colors.textPrimary, fontWeight = FontWeight.Medium, fontSize = 12.sp)
        Text(time, color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}
