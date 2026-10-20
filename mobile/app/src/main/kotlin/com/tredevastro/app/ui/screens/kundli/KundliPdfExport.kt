package com.tredevastro.app.ui.screens.kundli

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.tredevastro.app.R
import com.tredevastro.app.data.DIVISIONAL_ORDER
import com.tredevastro.app.data.PLANET_META
import com.tredevastro.app.data.VARGA_LABELS
import com.tredevastro.app.data.rashiIndexOf
import com.tredevastro.app.data.rulingGrahaFor
import com.tredevastro.app.network.dto.AshtakavargaBhinnaDto
import com.tredevastro.app.network.dto.AshtakavargaPointDto
import com.tredevastro.app.network.dto.KundliFullDto
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Locale

// Ports web/frontend/src/sections/KundliSection/KundliPrintLayout.tsx page
// for page, verified against a real downloaded reference PDF (not just the
// source code) — same colors, same running header/footer/watermark, same
// 01-07 numbered sections, same table columns and card layouts. Two
// deliberate, disclosed gaps: the cover's Ganesh banner artwork (an image
// asset this app doesn't have) and the site's exact rounded display font
// (substituted with bold sans-serif) — everything else (structure, copy,
// tables, chart style) is matched field-for-field.

private const val PAGE_W = 595f
private const val PAGE_H = 842f
private const val MARGIN = 28f
private const val FOOTER_SPACE = 40f
private const val HEADER_RESERVE = 70f
private const val CONTENT_W = PAGE_W - MARGIN * 2

private object Ink {
    val ink = Color.parseColor("#182333")
    val muted = Color.parseColor("#68717A")
    val faint = Color.parseColor("#8C8A84")
    val gold = Color.parseColor("#B58A3B")
    val line = Color.parseColor("#E8DEC8")
    val tint = Color.parseColor("#F2EBD9")
    val pageBg = Color.parseColor("#FAF7F0")
    val green = Color.parseColor("#3E8E5A")
    val red = Color.parseColor("#B8501D")
}

private fun sans(size: Float, color: Int, bold: Boolean = false, italic: Boolean = false) = Paint().apply {
    isAntiAlias = true
    textSize = size
    this.color = color
    typeface = Typeface.create(
        Typeface.SANS_SERIF,
        when {
            bold && italic -> Typeface.BOLD_ITALIC
            bold -> Typeface.BOLD
            italic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        },
    )
}

private fun wrapText(text: String, paint: Paint, maxWidth: Float): List<String> {
    val lines = mutableListOf<String>()
    var current = StringBuilder()
    text.split(" ").forEach { word ->
        val candidate = if (current.isEmpty()) word else "$current $word"
        if (paint.measureText(candidate) > maxWidth) {
            if (current.isNotEmpty()) lines.add(current.toString())
            current = StringBuilder(word)
        } else {
            current = StringBuilder(candidate)
        }
    }
    if (current.isNotEmpty()) lines.add(current.toString())
    return lines
}

private fun lordName(id: String) = PLANET_META[id.lowercase()]?.name ?: id.replaceFirstChar { it.uppercase() }

private fun degreeDms(decimalDegrees: Double): String {
    val deg = decimalDegrees.toInt()
    val minFull = (decimalDegrees - deg) * 60
    val min = minFull.toInt()
    val sec = ((minFull - min) * 60).toInt()
    return "$deg° $min' $sec\""
}

private val PDF_DASHA_DATE_PARSE = SimpleDateFormat("yyyy-MM-dd", Locale.US)
private val PDF_DASHA_DATE_FMT = SimpleDateFormat("MMM dd, yyyy", Locale.US)

/** Matches the reference PDF's dasha date style exactly ("Jun 28, 2027"),
 * distinct from the live Timeline tab's "d MMM yyyy" — and the very first
 * Mahadasha period (index 0) reads "Birth" instead of a date, as it does
 * on the real site. */
private fun pdfDashaDate(iso: String, isBirthStart: Boolean = false): String {
    if (isBirthStart) return "Birth"
    return try { PDF_DASHA_DATE_FMT.format(PDF_DASHA_DATE_PARSE.parse(iso) ?: return "—") } catch (e: Exception) { "—" }
}

/** Owns pagination and draws the running header/footer/watermark every
 * page (except the header on cover) gets — logo + "TredevaAstro" (gold) /
 * "Your Sky. Your Story." (muted) on the left, "<name>'s Kundli" centered,
 * the astrologer photo on the right, a gold rule below. */
private class PdfBuilder(private val doc: PdfDocument, private val name: String, private val logo: Bitmap, private val acharya: Bitmap) {
    var pageNumber = 0
        private set
    private var page: PdfDocument.Page? = null
    lateinit var canvas: Canvas
    var y = 0f
    private var isCover = false

    fun startPage(cover: Boolean = false) {
        closeCurrentPage()
        pageNumber++
        page = doc.startPage(PdfDocument.PageInfo.Builder(PAGE_W.toInt(), PAGE_H.toInt(), pageNumber).create())
        canvas = page!!.canvas
        isCover = cover
        canvas.drawColor(Ink.pageBg)
        drawHeader()
        y = MARGIN + HEADER_RESERVE
    }

    private fun closeCurrentPage() {
        val p = page ?: return
        drawWatermark()
        drawFooter()
        doc.finishPage(p)
    }

    fun finishDocument() {
        closeCurrentPage()
        page = null
    }

    /** Auto-paginates: if the next block of the given height wouldn't fit
     * above the footer, starts a fresh page first. */
    fun ensureSpace(height: Float) {
        if (y + height > PAGE_H - FOOTER_SPACE - MARGIN) startPage(cover = false)
    }

    private fun drawHeader() {
        val logoSize = 44
        canvas.drawBitmap(logo, null, RectF(MARGIN, 16f, MARGIN + logoSize, 16f + logoSize), Paint().apply { isAntiAlias = true })
        canvas.drawText("TredevaAstro", MARGIN + logoSize + 10f, 34f, sans(18f, Ink.gold, bold = true))
        canvas.drawText("Your Sky. Your Story.", MARGIN + logoSize + 10f, 50f, sans(10f, Ink.muted))

        if (!isCover) {
            val titlePaint = sans(14f, Ink.ink, bold = true)
            val title = "$name's Kundli"
            canvas.drawText(title, PAGE_W / 2f - titlePaint.measureText(title) / 2f, 38f, titlePaint)
        }

        val photoH = 62f
        val photoW = photoH * acharya.width / acharya.height
        canvas.drawBitmap(acharya, null, RectF(PAGE_W - MARGIN - photoW, 6f, PAGE_W - MARGIN, 6f + photoH), Paint().apply { isAntiAlias = true })

        canvas.drawLine(MARGIN, 78f, PAGE_W - MARGIN, 78f, Paint().apply { color = Ink.gold; strokeWidth = 1.5f })
    }

    private fun drawWatermark() {
        val size = 260
        val paint = Paint().apply { isAntiAlias = true; alpha = 13 }
        val left = (PAGE_W - size) / 2f
        val top = (PAGE_H - size) / 2f
        canvas.drawBitmap(logo, null, RectF(left, top, left + size, top + size), paint)
    }

    private fun drawFooter() {
        canvas.drawLine(MARGIN, PAGE_H - FOOTER_SPACE, PAGE_W - MARGIN, PAGE_H - FOOTER_SPACE, Paint().apply { color = Ink.gold; strokeWidth = 1f })
        val footerPaint = sans(9.5f, Ink.muted)
        canvas.drawText("Visit our other sites: Store · Learn", MARGIN, PAGE_H - 24f, footerPaint)
        val pageText = "Page $pageNumber"
        canvas.drawText(pageText, PAGE_W - MARGIN - footerPaint.measureText(pageText), PAGE_H - 24f, footerPaint)
    }
}

private fun PdfBuilder.sectionHeader(number: String, title: String) {
    ensureSpace(36f)
    val cy = y + 12f
    canvas.drawCircle(MARGIN + 12f, cy, 12f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    val numPaint = sans(9.5f, Color.WHITE, bold = true)
    canvas.drawText(number, MARGIN + 12f - numPaint.measureText(number) / 2f, cy + 3.5f, numPaint)
    canvas.drawText(title, MARGIN + 32f, cy + 6f, sans(17f, Ink.ink, bold = true))
    canvas.drawLine(MARGIN + 32f + sans(17f, Ink.ink, bold = true).measureText(title) + 12f, cy, PAGE_W - MARGIN, cy, Paint().apply { color = Ink.line; strokeWidth = 1f })
    y += 40f
}

private fun PdfBuilder.subheading(title: String) {
    ensureSpace(24f)
    canvas.drawRect(MARGIN, y, MARGIN + 3f, y + 13f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    canvas.drawText(title.uppercase(), MARGIN + 10f, y + 11f, sans(11.5f, Ink.ink, bold = true))
    y += 24f
}

/** Label-left / value-right within each column — matches the site's KV
 * rows exactly (e.g. "NAME ... Sparsh bansal"). */
private fun PdfBuilder.kvGrid(fields: List<Pair<String, String>>, columns: Int = 2) {
    val gutter = 16f
    val colW = (CONTENT_W - gutter * (columns - 1)) / columns
    fields.chunked(columns).forEach { row ->
        ensureSpace(32f)
        row.forEachIndexed { i, (label, value) ->
            val left = MARGIN + i * (colW + gutter)
            val right = left + colW
            canvas.drawText(label.uppercase(), left, y + 10f, sans(8f, Ink.muted))
            val vp = sans(11f, Ink.ink, bold = true)
            canvas.drawText(value, right - vp.measureText(value), y + 10f, vp)
        }
        y += 26f
    }
    y += 6f
}

private fun PdfBuilder.table(headers: List<String>, rows: List<List<String>>, weights: List<Float>? = null, highlightRows: Set<Int> = emptySet()) {
    val w = weights ?: List(headers.size) { 1f }
    val totalWeight = w.sum()
    val colWidths = w.map { CONTENT_W * it / totalWeight }

    ensureSpace(18f)
    var x = MARGIN
    headers.forEachIndexed { i, h -> canvas.drawText(h.uppercase(), x, y + 9f, sans(8f, Ink.muted)); x += colWidths[i] }
    canvas.drawLine(MARGIN, y + 14f, PAGE_W - MARGIN, y + 14f, Paint().apply { color = Ink.line; strokeWidth = 0.75f })
    y += 18f

    rows.forEachIndexed { rowIndex, cells ->
        ensureSpace(17f)
        if (rowIndex in highlightRows) {
            canvas.drawRect(MARGIN, y - 2f, PAGE_W - MARGIN, y + 14f, Paint().apply { isAntiAlias = true; color = Ink.tint })
        }
        var cx = MARGIN
        cells.forEachIndexed { i, cell ->
            val paint = sans(9.5f, Ink.ink, bold = rowIndex in highlightRows)
            canvas.drawText(cell, cx, y + 10f, paint)
            cx += colWidths.getOrElse(i) { 80f }
        }
        y += 17f
    }
    y += 10f
}

/** Component rows x planet/house columns — the Shadbala/Bhavbala matrix
 * tables, transposed from `table()`'s usual per-item-row layout. */
private fun PdfBuilder.matrixTable(columnHeaders: List<String>, rows: List<Pair<String, List<String>>>, highlightRows: Set<Int> = emptySet()) {
    val labelW = 110f
    val colW = (CONTENT_W - labelW) / columnHeaders.size

    ensureSpace(16f)
    columnHeaders.forEachIndexed { i, h ->
        val cx = MARGIN + labelW + i * colW
        val p = sans(8f, Ink.muted, bold = true)
        canvas.drawText(h.uppercase(), cx + colW - p.measureText(h.uppercase()), y + 9f, p)
    }
    canvas.drawLine(MARGIN, y + 14f, PAGE_W - MARGIN, y + 14f, Paint().apply { color = Ink.line; strokeWidth = 0.75f })
    y += 18f

    rows.forEachIndexed { rowIndex, (label, values) ->
        ensureSpace(16f)
        if (rowIndex in highlightRows) {
            canvas.drawRect(MARGIN, y - 2f, PAGE_W - MARGIN, y + 13f, Paint().apply { isAntiAlias = true; color = Ink.tint })
        }
        val bold = rowIndex in highlightRows
        canvas.drawText(label, MARGIN, y + 9f, sans(9f, Ink.ink, bold = bold))
        values.forEachIndexed { i, v ->
            val cx = MARGIN + labelW + i * colW
            val p = sans(9f, Ink.ink, bold = bold)
            canvas.drawText(v, cx + colW - p.measureText(v), y + 9f, p)
        }
        y += 15.5f
    }
    y += 10f
}

private fun PdfBuilder.paragraphCard(title: String, body: String, width: Float = CONTENT_W, x: Float = MARGIN, highlight: Boolean = false) {
    val paint = sans(9.5f, Ink.ink)
    val lines = wrapText(body, paint, width - 16f)
    val height = 26f + lines.size * 12f
    ensureSpace(height + 8f)
    val rect = RectF(x, y, x + width, y + height)
    canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = if (highlight) Ink.tint else Color.parseColor("#FFFFFF") })
    canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = Ink.line; style = Paint.Style.STROKE; strokeWidth = 1f })
    canvas.drawText(title, x + 8f, y + 16f, sans(11f, Ink.ink, bold = true))
    var ly = y + 30f
    lines.forEach { line -> canvas.drawText(line, x + 8f, ly, paint); ly += 12f }
    y += height + 8f
}

private fun <T> PdfBuilder.cardGrid(items: List<T>, perRow: Int, cardHeight: Float, draw: (T, RectF) -> Unit) {
    val gap = 10f
    val colW = (CONTENT_W - gap * (perRow - 1)) / perRow
    items.chunked(perRow).forEach { group ->
        ensureSpace(cardHeight + 8f)
        group.forEachIndexed { i, item ->
            val x = MARGIN + i * (colW + gap)
            draw(item, RectF(x, y, x + colW, y + cardHeight))
        }
        y += cardHeight + 8f
    }
}

private val PDF_HOUSE_POSITIONS = listOf(
    0.50f to 0.22f, 0.22f to 0.08f, 0.08f to 0.22f, 0.22f to 0.50f,
    0.08f to 0.78f, 0.22f to 0.92f, 0.50f to 0.78f, 0.78f to 0.92f,
    0.92f to 0.78f, 0.78f to 0.50f, 0.92f to 0.22f, 0.78f to 0.08f,
)

/** North Indian chart, redrawn in plain android.graphics (PdfDocument's
 * page canvas isn't a Compose DrawScope) — filled tan diamond, rashi
 * numbers at the outer corners, planet+degree+retro stacked at each
 * house's centroid, matching the reference PDF's chart style. */
private fun drawMiniChart(c: Canvas, rect: RectF, ascendantRashiIndex: Int, houseContent: Map<Int, List<String>>, title: String? = null) {
    var top = rect.top
    if (title != null) {
        val tp = sans(11f, Ink.ink, bold = true)
        c.drawText(title, rect.centerX() - tp.measureText(title) / 2f, top, tp)
        top += 16f
    }
    val chartRect = RectF(rect.left, top, rect.right, rect.bottom)
    val fill = Paint().apply { isAntiAlias = true; color = Ink.tint }
    val gold = Paint().apply { color = Ink.gold; style = Paint.Style.STROKE; strokeWidth = 1f; isAntiAlias = true }

    c.drawRect(chartRect, fill)
    c.drawRect(chartRect, gold)
    c.drawLine(chartRect.left, chartRect.top, chartRect.right, chartRect.bottom, gold)
    c.drawLine(chartRect.right, chartRect.top, chartRect.left, chartRect.bottom, gold)
    c.drawLine(chartRect.centerX(), chartRect.top, chartRect.right, chartRect.centerY(), gold)
    c.drawLine(chartRect.right, chartRect.centerY(), chartRect.centerX(), chartRect.bottom, gold)
    c.drawLine(chartRect.centerX(), chartRect.bottom, chartRect.left, chartRect.centerY(), gold)
    c.drawLine(chartRect.left, chartRect.centerY(), chartRect.centerX(), chartRect.top, gold)

    val w = chartRect.width()
    PDF_HOUSE_POSITIONS.forEachIndexed { index, (fx, fy) ->
        val houseNumber = index + 1
        val rashiNumber = ((ascendantRashiIndex + houseNumber - 1) % 12) + 1
        val cx = chartRect.left + fx * w
        val cy = chartRect.top + fy * w
        val lines = houseContent[houseNumber].orEmpty()
        val cornerX = chartRect.left + (if (fx < 0.5f) 0.06f else if (fx > 0.5f) 0.94f else fx) * w
        val cornerY = chartRect.top + (if (fy < 0.5f) 0.06f else if (fy > 0.5f) 0.94f else fy) * w
        val rashiPaint = Paint().apply { color = Ink.faint; textSize = w * 0.03f; textAlign = Paint.Align.CENTER; isAntiAlias = true }
        c.drawText(rashiNumber.toString(), cornerX, cornerY, rashiPaint)

        val planetPaint = Paint().apply { color = Ink.ink; textSize = w * 0.032f; textAlign = Paint.Align.CENTER; isAntiAlias = true }
        var ty = cy - (lines.size - 1) * w * 0.018f
        lines.forEach { line -> c.drawText(line, cx, ty, planetPaint); ty += w * 0.036f }
    }
}

internal suspend fun exportKundliPdf(context: Context, result: KundliFullDto, profile: BirthProfile) {
    val doc = PdfDocument()
    val logo = BitmapFactory.decodeResource(context.resources, R.drawable.logo_mark)
    val acharya = BitmapFactory.decodeResource(context.resources, R.drawable.icon_acharya)
    val pdf = PdfBuilder(doc, profile.name.ifBlank { "Your" }, logo, acharya)

    drawCoverPage(pdf, profile, logo)
    drawBasicSection(pdf, result, profile)
    drawKundliSection(pdf, result)
    drawKpSection(pdf, result)
    drawAshtakavargaSection(pdf, result)
    drawChartsSection(pdf, result)
    drawDashaSection(pdf, result)
    drawFreeReportSection(pdf, result)
    drawClosingPage(pdf, profile, logo)

    pdf.finishDocument()

    val cacheDir = File(context.cacheDir, "reports").apply { mkdirs() }
    val safeName = profile.name.ifBlank { "Kundli" }.replace(Regex("[^A-Za-z0-9]+"), "_")
    val file = File(cacheDir, "${safeName}_Kundli.pdf")
    FileOutputStream(file).use { out -> doc.writeTo(out) }
    doc.close()

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(sendIntent, "Save or share your Kundli report"))
}

private fun drawCoverPage(pdf: PdfBuilder, profile: BirthProfile, logo: Bitmap) {
    pdf.startPage(cover = true)
    val c = pdf.canvas
    val cx = PAGE_W / 2f
    var y = 200f

    c.drawBitmap(logo, null, RectF(cx - 36f, y, cx + 36f, y + 72f), Paint().apply { isAntiAlias = true })
    y += 92f

    val brand = sans(12f, Ink.muted, bold = true)
    val brandText = "TREDEVAASTRO"
    c.drawText(brandText, cx - brand.measureText(brandText) / 2f, y, brand)
    y += 16f
    val sub = sans(10.5f, Ink.gold, bold = true)
    val subText = "VEDIC ASTROLOGY REPORT"
    c.drawText(subText, cx - sub.measureText(subText) / 2f, y, sub)
    y += 44f

    val titlePaint = sans(28f, Ink.ink, bold = true)
    val title = "${profile.name.ifBlank { "Your" }}'s Kundli"
    c.drawText(title, cx - titlePaint.measureText(title) / 2f, y, titlePaint)
    y += 28f

    c.drawCircle(cx, y - 5f, 2f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    c.drawLine(cx - 60f, y - 5f, cx - 8f, y - 5f, Paint().apply { color = Ink.gold; strokeWidth = 1f })
    c.drawLine(cx + 8f, y - 5f, cx + 60f, y - 5f, Paint().apply { color = Ink.gold; strokeWidth = 1f })
    y += 28f

    val dobStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date(profile.dobMillis))
    val tobStr = if (profile.hour != null) String.format(Locale.getDefault(), "%02d:%02d", profile.hour, profile.minute ?: 0) else "00:00"
    val detail = sans(11f, Ink.muted)
    val detailText = "$dobStr · $tobStr · ${profile.place}"
    c.drawText(detailText, cx - detail.measureText(detailText) / 2f, y, detail)
    y += 34f

    val genPaint = sans(9.5f, Color.WHITE, bold = true)
    val genText = "GENERATED ${SimpleDateFormat("MMM d, yyyy", Locale.US).format(java.util.Date()).uppercase()}"
    val genW = genPaint.measureText(genText) + 28f
    c.drawRoundRect(RectF(cx - genW / 2f, y - 16f, cx + genW / 2f, y + 8f), 14f, 14f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    c.drawText(genText, cx - genPaint.measureText(genText) / 2f, y, genPaint)
    y += 40f

    val footerPaint = sans(9f, Ink.faint, bold = true)
    val footerText = "TREDEVAASTRO · YOUR SKY. YOUR STORY."
    c.drawText(footerText, cx - footerPaint.measureText(footerText) / 2f, y, footerPaint)
}

private fun drawBasicSection(pdf: PdfBuilder, result: KundliFullDto, profile: BirthProfile) {
    pdf.startPage()
    pdf.sectionHeader("01", "Basic")

    pdf.subheading("Birth Details")
    val offsetH = profile.timezoneOffsetMinutes / 60
    val offsetM = kotlin.math.abs(profile.timezoneOffsetMinutes % 60)
    val tzStr = String.format(Locale.US, "GMT %s%02d:%02d", if (profile.timezoneOffsetMinutes >= 0) "+" else "-", kotlin.math.abs(offsetH), offsetM)
    pdf.kvGrid(
        listOf(
            "Name" to profile.name.ifBlank { "—" },
            "Date of Birth" to SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date(profile.dobMillis)),
            "Time of Birth" to (if (profile.hour != null) String.format(Locale.getDefault(), "%02d:%02d", profile.hour, profile.minute ?: 0) else "00:00"),
            "Place of Birth" to profile.place,
            "Latitude" to (profile.latitude?.let { "%.4f".format(it) } ?: "—"),
            "Longitude" to (profile.longitude?.let { "%.4f".format(it) } ?: "—"),
            "Timezone" to tzStr,
        ),
    )
    if (profile.hour == null) {
        pdf.paragraphCard("Note", "Time of birth was not provided — this chart defaults to 00:00 and the Ascendant/house placements should be treated as approximate.", highlight = true)
    }

    pdf.subheading("Panchang")
    val p = result.panchang
    pdf.kvGrid(
        listOf(
            "Tithi" to p.tithi.name, "Karana" to p.karana,
            "Yoga" to p.yoga, "Nakshatra" to p.nakshatra.name,
            "Nakshatra Lord" to lordName(p.nakshatra.lord), "Ascendant" to result.kundli.ascendant.rashi,
            "Sunrise" to com.tredevastro.app.util.formatIsoTime24h(p.sunrise), "Sunset" to com.tredevastro.app.util.formatIsoTime24h(p.sunset),
        ),
    )

    pdf.subheading("Avakhada Details")
    val a = result.avakhada
    pdf.kvGrid(
        listOf(
            "Varna" to a.varna, "Vashya" to a.vashya, "Yoni" to a.yoni,
            "Gan" to a.gana, "Nadi" to a.nadi, "Sign" to result.kundli.ascendant.rashi,
            "Sign Lord" to lordName(a.signLord), "Charan" to "${a.pada}", "Tatva" to a.tatva,
            "Paya" to a.paya,
        ),
        columns = 3,
    )
}

private fun drawKundliSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("02", "Kundli")

    val chartSize = 232f
    pdf.ensureSpace(chartSize + 20f)
    val leftRect = RectF(MARGIN, pdf.y, MARGIN + chartSize, pdf.y + chartSize)
    val rightX = PAGE_W - MARGIN - chartSize
    val rightRect = RectF(rightX, pdf.y, rightX + chartSize, pdf.y + chartSize)
    drawMiniChart(pdf.canvas, leftRect, rashiIndexOf(result.kundli.ascendant.rashi), planetLinesWithDegree(result.kundli.planets), "Lagna Chart (D1)")
    drawMiniChart(pdf.canvas, rightRect, rashiIndexOf(result.navamsaChart.ascendant.rashi), vargaHouseToPlanets(result.navamsaChart.planets), "Navamsa Chart (D9)")
    pdf.y += chartSize + 24f

    pdf.subheading("Planetary Positions")
    pdf.table(
        listOf("Planet", "Sign", "Sign Lord", "Nakshatra", "Naksh Lord", "Degree", "Retro"),
        listOf(listOf("Ascendant", result.kundli.ascendant.rashi, lordName(result.avakhada.signLord), "—", "—", degreeDms(result.kundli.ascendant.degreeInSign), "No")) +
            result.kundli.planets.map { pl ->
                listOf(lordName(pl.id), pl.rashi, lordName(rulingGrahaFor(pl.rashi)), pl.nakshatra, lordName(pl.nakshatraLord), degreeDms(pl.degreeInSign), if (pl.retrograde) "Yes" else "No")
            },
        weights = listOf(1.1f, 0.8f, 0.8f, 1.1f, 0.9f, 1f, 0.6f),
    )

    pdf.subheading("Vimshottari Dasha")
    pdf.subheading("Mahadasha")
    val activeMdIndex = result.mahadashaTimeline.indexOfFirst { it.active }
    pdf.table(
        listOf("Planet", "Start Date", "End Date"),
        result.mahadashaTimeline.mapIndexed { i, md -> listOf(lordName(md.lord) + if (md.active) "  ● ACTIVE" else "", pdfDashaDate(md.startsAt, isBirthStart = i == 0), pdfDashaDate(md.endsAt)) },
        weights = listOf(1.4f, 1f, 1f),
        highlightRows = if (activeMdIndex >= 0) setOf(activeMdIndex) else emptySet(),
    )

    pdf.subheading("Antardasha")
    pdf.cardGrid(result.mahadashaTimeline.withIndex().toList(), perRow = 3, cardHeight = 210f) { (i, md), rect ->
        drawAntardashaCard(pdf.canvas, rect, md, isFirst = i == 0)
    }

    pdf.subheading("Shadbala — Planetary Strength")
    val sb = result.shadbala.planets
    val planetOrder = listOf("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")
    val ordered = planetOrder.mapNotNull { id -> sb.find { it.planet.equals(id, true) } }
    val headers = ordered.map { lordName(it.planet) }
    val ranks = ordered.sortedByDescending { it.rupas }.mapIndexed { i, p -> p.planet to (i + 1) }.toMap()
    pdf.matrixTable(
        headers,
        listOf(
            "Sthaana Bala" to ordered.map { "%.2f".format(it.sthanabala.total) },
            "Kaala Bala" to ordered.map { "%.2f".format(it.kaalabala.total) },
            "Dig Bala" to ordered.map { "%.2f".format(it.digbala) },
            "Cheshta Bala" to ordered.map { "%.2f".format(it.cheshtabala) },
            "Naisargika Bala" to ordered.map { "%.2f".format(it.naisargikabala) },
            "Drik Bala" to ordered.map { "%.2f".format(it.drikbala) },
            "Total Shad Bala" to ordered.map { "%.2f".format(it.totalVirupas) },
            "Shad Bala Rupas" to ordered.map { "%.2f".format(it.rupas) },
            "Required" to ordered.map { "%.2f".format(it.minRequiredRupas) },
            "Ratio" to ordered.map { "%.2f".format(if (it.minRequiredRupas != 0.0) it.rupas / it.minRequiredRupas else 0.0) },
            "Ranking" to ordered.map { "${ranks[it.planet] ?: "—"}" },
            "Ishta Phala" to ordered.map { "%.2f".format(it.ishtabala) },
            "Kashta Phala" to ordered.map { "%.2f".format(it.kashtabala) },
            "Verdict" to ordered.map { if (it.isStrong) "Strong" else "Weak" },
        ),
        highlightRows = setOf(6, 7),
    )

    pdf.subheading("Bhavbala — House Strength")
    val houses = result.shadbala.houses.sortedBy { it.house }
    val houseRanks = houses.sortedByDescending { it.total }.mapIndexed { i, h -> h.house to (i + 1) }.toMap()
    pdf.matrixTable(
        houses.map { "H${it.house}" },
        listOf(
            "Adhipati Bala" to houses.map { "%.0f".format(it.adhipatiBala) },
            "Dig Bala" to houses.map { "%.0f".format(it.digBala) },
            "Drik Bala" to houses.map { "%.0f".format(it.drikBala) },
            "Total Bhava Bala" to houses.map { "%.0f".format(it.total) },
            "Bhava Bala (Rupas)" to houses.map { "%.2f".format(it.total / 60.0) },
            "Ranking" to houses.map { "${houseRanks[it.house] ?: "—"}" },
        ),
        highlightRows = setOf(3, 4),
    )
}

private fun drawAntardashaCard(c: Canvas, rect: RectF, md: com.tredevastro.app.network.dto.MahadashaPeriodDto, isFirst: Boolean = false) {
    c.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = if (md.active) Ink.tint else Color.WHITE })
    c.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = Ink.line; style = Paint.Style.STROKE; strokeWidth = 1f })
    val titlePaint = sans(11f, Ink.ink, bold = true)
    val title = lordName(md.lord) + if (md.active) " ●" else ""
    c.drawText(title, rect.centerX() - titlePaint.measureText(title) / 2f, rect.top + 16f, titlePaint)
    val datePaint = sans(8f, Ink.muted)
    val dateText = "${pdfDashaDate(md.startsAt, isBirthStart = isFirst)} – ${pdfDashaDate(md.endsAt)}"
    c.drawText(dateText, rect.centerX() - datePaint.measureText(dateText) / 2f, rect.top + 28f, datePaint)

    var ly = rect.top + 44f
    md.antardashas.forEach { ad ->
        if (ly > rect.bottom - 6f) return@forEach
        val labelPaint = sans(8f, if (ad.active) Ink.gold else Ink.ink, bold = ad.active)
        c.drawText(lordName(ad.lord), rect.left + 6f, ly, labelPaint)
        val datePaintSmall = sans(7.5f, Ink.muted)
        val dText = "${pdfDashaDate(ad.startsAt)}–${pdfDashaDate(ad.endsAt)}"
        c.drawText(dText, rect.right - 6f - datePaintSmall.measureText(dText), ly, datePaintSmall)
        ly += 12f
    }
}

private fun drawKpSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("03", "KP")

    val chartSize = 220f
    pdf.ensureSpace(chartSize + 30f)
    val chartRect = RectF(MARGIN, pdf.y, MARGIN + chartSize, pdf.y + chartSize)
    drawMiniChart(pdf.canvas, chartRect, rashiIndexOf(result.bhavChalit.ascendant.rashi), vargaHouseToPlanets(result.bhavChalit.planets), "Bhav Chalit Chart")

    val rpX = MARGIN + chartSize + 24f
    var ry = pdf.y + 4f
    pdf.canvas.drawRect(rpX, ry, rpX + 3f, ry + 12f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    pdf.canvas.drawText("RULING PLANETS", rpX + 9f, ry + 10f, sans(11f, Ink.ink, bold = true))
    ry += 26f
    val rp = result.kp.rulingPlanets
    val rpFields = listOf(
        "Asc Sign Lord" to lordName(rp.lagnaSignLord), "Asc Star Lord" to lordName(rp.lagnaStarLord),
        "Asc Sub Lord" to lordName(rp.lagnaSubLord), "Moon Sign Lord" to lordName(rp.moonSignLord),
        "Moon Star Lord" to lordName(rp.moonStarLord), "Moon Sub Lord" to lordName(rp.moonSubLord),
        "Day Lord" to lordName(rp.dayLord),
    )
    val rpColW = (PAGE_W - MARGIN - rpX) / 2f
    rpFields.chunked(2).forEach { row ->
        row.forEachIndexed { i, (label, value) ->
            val lx = rpX + i * rpColW
            pdf.canvas.drawText(label.uppercase(), lx, ry, sans(7.5f, Ink.muted))
            val vp = sans(10.5f, Ink.ink, bold = true)
            pdf.canvas.drawText(value, lx + rpColW - 16f - vp.measureText(value), ry, vp)
        }
        ry += 24f
    }
    pdf.y += chartSize + 30f

    pdf.subheading("KP Planets")
    val bhavByPlanet = result.bhavChalit.planets.associate { it.id to it.house }
    pdf.table(
        listOf("Planet", "Bhav (Cusp)", "Sign", "Sign Lord", "Star Lord", "Sub Lord"),
        result.kp.table.map { row ->
            listOf(lordName(row.id), "${bhavByPlanet[row.id] ?: "—"}", row.rashi, lordName(row.signLord), lordName(row.starLord), lordName(row.subLord))
        },
        weights = listOf(1f, 0.9f, 1f, 1f, 1f, 1f),
    )

    pdf.subheading("KP Cusps")
    val cuspDegreeByHouse = result.bhavChalit.cusps.associate { it.house to it.degreeInSign }
    pdf.table(
        listOf("Cusp", "Degree", "Sign", "Sign Lord", "Star Lord", "Sub Lord"),
        result.kp.cusps.map { row ->
            val house = row.id.removePrefix("cusp").toIntOrNull()
            listOf("Cusp ${house ?: ""}", cuspDegreeByHouse[house]?.let { degreeDms(it) } ?: "—", row.rashi, lordName(row.signLord), lordName(row.starLord), lordName(row.subLord))
        },
        weights = listOf(0.8f, 1.1f, 1f, 1f, 1f, 1f),
    )
}

private fun drawAshtakavargaSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("04", "Ashtakvarga")
    pdf.canvas.drawText(
        "Total bindus per rashi. SAV is the combined Sarvashtakavarga (total: ${result.ashtakavarga.sarvaTotal}).",
        MARGIN, pdf.y + 10f, sans(9.5f, Ink.muted),
    )
    pdf.y += 26f

    val grids = mutableListOf("SAV" to result.ashtakavarga.sarva)
    result.ashtakavarga.bhinna.forEach { b: AshtakavargaBhinnaDto -> grids.add(lordName(b.planet).uppercase() to b.points) }

    fun drawGrid(title: String, points: List<AshtakavargaPointDto>, rect: RectF) {
        val c = pdf.canvas
        c.drawText(title, rect.left, rect.top + 10f, sans(10f, Ink.gold, bold = true))
        val cellW = rect.width() / 6f
        points.take(12).forEachIndexed { i, pt ->
            val col = i % 6
            val row = i / 6
            val cx = rect.left + col * cellW + cellW / 2f
            val cy = rect.top + 26f + row * 34f
            val labelP = sans(7.5f, Ink.muted)
            val label = pt.rashi.take(3).uppercase()
            c.drawText(label, cx - labelP.measureText(label) / 2f, cy, labelP)
            val v = sans(12f, Ink.ink, bold = true)
            val vt = "${pt.bindus}"
            c.drawText(vt, cx - v.measureText(vt) / 2f, cy + 15f, v)
        }
    }

    val gridH = 78f
    val gap = 16f
    val colW = (CONTENT_W - gap) / 2f
    grids.chunked(2).forEach { pair ->
        pdf.ensureSpace(gridH + 10f)
        pair.forEachIndexed { i, (title, points) ->
            val x = MARGIN + i * (colW + gap)
            drawGrid(title, points, RectF(x, pdf.y, x + colW, pdf.y + gridH))
        }
        pdf.y += gridH + 14f
    }
}

private fun drawChartsSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("05", "Charts")
    pdf.canvas.drawText("Every divisional (varga) chart computed for this birth, plus a Moon-referenced Chandra chart.", MARGIN, pdf.y + 10f, sans(9.5f, Ink.muted))
    pdf.y += 26f

    data class ChartEntry(val label: String, val ascIndex: Int, val planets: Map<Int, List<String>>)

    val planetAbbr = mapOf(
        "sun" to "Su", "moon" to "Mo", "mars" to "Ma", "mercury" to "Me",
        "jupiter" to "Ju", "venus" to "Ve", "saturn" to "Sa", "rahu" to "Ra", "ketu" to "Ke",
    )
    val chandraHouseMap = result.chandraChart.planets
        .mapNotNull { pl -> planetAbbr[pl.id]?.let { pl.house to (if (pl.retrograde) listOf(it, "R") else listOf(it)) } }
        .groupBy({ it.first }, { it.second }).mapValues { it.value.flatten() }
    val entries = mutableListOf(ChartEntry("Chandra (Moon)", rashiIndexOf(result.chandraChart.moonRashi), chandraHouseMap))

    DIVISIONAL_ORDER.forEach { key ->
        val varga = result.vargaCharts[key]
        if (varga != null) {
            entries.add(ChartEntry(VARGA_LABELS[key] ?: key, rashiIndexOf(varga.ascendant.rashi), vargaHouseToPlanets(varga.planets)))
        }
    }

    val chartSize = 232f
    val gap = 24f
    val colW = (CONTENT_W - gap) / 2f
    entries.chunked(2).forEach { pair ->
        pdf.ensureSpace(chartSize + 16f + 24f)
        pair.forEachIndexed { i, entry ->
            val x = MARGIN + i * (colW + gap)
            val rect = RectF(x, pdf.y + 16f, x + chartSize.coerceAtMost(colW), pdf.y + 16f + chartSize)
            drawMiniChart(pdf.canvas, rect, entry.ascIndex, entry.planets, entry.label)
        }
        pdf.y += chartSize + 16f + 24f
    }
}

private fun drawDashaSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("06", "Dasha")
    pdf.canvas.drawText("Each card describes one Mahadasha — what the ruling planet's house and sign placement mean while it runs.", MARGIN, pdf.y + 10f, sans(9.5f, Ink.muted))
    pdf.y += 26f

    // dashaPredictions cards need dynamic height (long body text per card), so
    // this is drawn directly rather than through the fixed-height cardGrid().
    val colW = (CONTENT_W - 16f) / 2f
    result.dashaPredictions.chunked(2).forEach { pair ->
        val bodies = pair.map { dp -> wrapText(dp.text, sans(9.5f, Ink.ink), colW - 16f) }
        val maxLines = bodies.maxOf { it.size }
        val cardH = 40f + maxLines * 12f
        pdf.ensureSpace(cardH + 8f)
        pair.forEachIndexed { i, dp ->
            val active = result.mahadashaTimeline.find { it.lord == dp.lord }?.active == true
            val x = MARGIN + i * (colW + 16f)
            val rect = RectF(x, pdf.y, x + colW, pdf.y + cardH)
            pdf.canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = if (active) Ink.tint else Color.WHITE })
            pdf.canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = Ink.line; style = Paint.Style.STROKE; strokeWidth = 1f })
            pdf.canvas.drawText("${lordName(dp.lord)} Mahadasha${if (active) " (Active)" else ""}", x + 8f, pdf.y + 16f, sans(10.5f, Ink.ink, bold = true))
            var ly = pdf.y + 30f
            bodies[i].forEach { line -> pdf.canvas.drawText(line, x + 8f, ly, sans(9.5f, Ink.ink)); ly += 12f }
        }
        pdf.y += cardH + 8f
    }

    pdf.subheading("Yogini Dasha")
    val activeYoginiIndex = result.yoginiDashaTimeline.indexOfFirst { it.active }
    pdf.table(
        listOf("Yogini", "Lord", "Start", "End"),
        result.yoginiDashaTimeline.map { yp -> listOf(yp.yogini + if (yp.active) " (active)" else "", lordName(yp.lord), yp.startsAt, yp.endsAt) },
        weights = listOf(1.2f, 1f, 1f, 1f),
        highlightRows = if (activeYoginiIndex >= 0) setOf(activeYoginiIndex) else emptySet(),
    )
}

private fun drawFreeReportSection(pdf: PdfBuilder, result: KundliFullDto) {
    pdf.startPage()
    pdf.sectionHeader("07", "Free Report")

    val pr = result.ascendantPredictions
    pdf.subheading("Ascendant Predictions — ${pr.ascendant}")
    val fields = listOf("Description" to pr.description, "Personality" to pr.personality, "Physical" to pr.physical, "Health" to pr.health, "Career" to pr.career, "Relationship" to pr.relationship)
    drawTextCardGrid(pdf, fields, perRow = 2)

    pdf.ensureSpace(70f)
    val colW = (CONTENT_W - 16f) / 2f
    val doTitle = sans(10.5f, Ink.gold, bold = true)
    pdf.canvas.drawText("Do's", MARGIN, pdf.y + 10f, doTitle)
    pdf.canvas.drawText("Don'ts", MARGIN + colW + 16f, pdf.y + 10f, sans(10.5f, Ink.red, bold = true))
    var doY = pdf.y + 24f
    var dontY = pdf.y + 24f
    pr.dos.forEach { item ->
        wrapText("• $item", sans(9f, Ink.ink), colW).forEach { line -> pdf.canvas.drawText(line, MARGIN, doY, sans(9f, Ink.ink)); doY += 12f }
    }
    pr.donts.forEach { item ->
        wrapText("• $item", sans(9f, Ink.ink), colW).forEach { line -> pdf.canvas.drawText(line, MARGIN + colW + 16f, dontY, sans(9f, Ink.ink)); dontY += 12f }
    }
    pdf.y = maxOf(doY, dontY) + 12f

    pdf.subheading("Planetary Predictions")
    drawTextCardGrid(pdf, result.analysis.planets.map { lordName(it.id) to it.text }, perRow = 2)

    val presentYogas = result.yogas.filter { it.present }
    if (presentYogas.isNotEmpty()) {
        pdf.subheading("Yoga Combinations")
        drawTextCardGrid(pdf, presentYogas.map { it.name to it.description }, perRow = 2)
    }

    pdf.subheading("Rudraksha Recommendation")
    val r = result.rudraksha
    pdf.canvas.drawText("${r.mukhi}-Mukhi Rudraksha — ${r.deity}", MARGIN, pdf.y + 10f, sans(12f, Ink.ink, bold = true))
    pdf.y += 22f
    wrapText(r.reason, sans(9.5f, Ink.ink), CONTENT_W).forEach { line -> pdf.ensureSpace(13f); pdf.canvas.drawText(line, MARGIN, pdf.y + 10f, sans(9.5f, Ink.ink)); pdf.y += 13f }
    pdf.ensureSpace(15f)
    val howToWear = sans(9.5f, Ink.ink)
    pdf.canvas.drawText("How to wear: ", MARGIN, pdf.y + 10f, sans(9.5f, Ink.ink, bold = true))
    wrapText(r.howToWear, howToWear, CONTENT_W - 70f).forEachIndexed { i, line ->
        pdf.ensureSpace(13f)
        pdf.canvas.drawText(line, if (i == 0) MARGIN + 70f else MARGIN, pdf.y + 10f, howToWear)
        pdf.y += 13f
    }
    pdf.y += 6f

    val rColW = (CONTENT_W - 16f) / 2f
    pdf.ensureSpace(16f)
    pdf.canvas.drawText("Benefits", MARGIN, pdf.y + 10f, sans(10f, Ink.ink, bold = true))
    pdf.canvas.drawText("Precautions", MARGIN + rColW + 16f, pdf.y + 10f, sans(10f, Ink.ink, bold = true))
    pdf.y += 16f
    var benY = pdf.y
    var precY = pdf.y
    r.benefits.forEach { b -> wrapText("• $b", sans(9f, Ink.ink), rColW).forEach { line -> pdf.canvas.drawText(line, MARGIN, benY, sans(9f, Ink.ink)); benY += 12f } }
    r.precautions.forEach { pr2 -> wrapText("• $pr2", sans(9f, Ink.ink), rColW).forEach { line -> pdf.canvas.drawText(line, MARGIN + rColW + 16f, precY, sans(9f, Ink.ink)); precY += 12f } }
    pdf.y = maxOf(benY, precY) + 10f

    pdf.subheading("Gemstone Recommendations")
    pdf.canvas.drawText("Each stone supports a different area of life.", MARGIN, pdf.y + 8f, sans(9f, Ink.muted))
    pdf.y += 20f
    listOf(result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune).forEach { g -> drawGemstoneBlock(pdf, g) }

    pdf.subheading("Dosha Analysis")
    val ks = result.doshas.kaalSarp
    drawDoshaRow(pdf, "Kaal Sarp Dosha", if (ks.isKaalSarp) "Present" else "Not Present", ks.isKaalSarp, if (ks.isKaalSarp) "Rahu in ${ks.rahuRashi}, Ketu in ${ks.ketuRashi}." else "Kundli is free from Kaal Sarp Dosha.")
    val ss = result.doshas.sadeSati
    drawDoshaRow(
        pdf, "Sade Sati",
        if (ss.active) "Active — ${ss.phase ?: "rising"}" else "Not Active",
        ss.active,
        if (ss.active) "Saturn's Sade Sati is currently in its ${ss.phase ?: "rising"} phase." else "Saturn's Sade Sati is not currently active.",
    )
}

private fun drawTextCardGrid(pdf: PdfBuilder, items: List<Pair<String, String>>, perRow: Int) {
    val gap = 16f
    val colW = (CONTENT_W - gap * (perRow - 1)) / perRow
    items.chunked(perRow).forEach { group ->
        val bodies = group.map { (_, text) -> wrapText(text, sans(9.5f, Ink.ink), colW - 16f) }
        val maxLines = bodies.maxOf { it.size }
        val cardH = 28f + maxLines * 12f
        pdf.ensureSpace(cardH + 8f)
        group.forEachIndexed { i, (title, _) ->
            val x = MARGIN + i * (colW + gap)
            val rect = RectF(x, pdf.y, x + colW, pdf.y + cardH)
            pdf.canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = Color.WHITE })
            pdf.canvas.drawRoundRect(rect, 6f, 6f, Paint().apply { isAntiAlias = true; color = Ink.line; style = Paint.Style.STROKE; strokeWidth = 1f })
            pdf.canvas.drawText(title, x + 8f, pdf.y + 16f, sans(10.5f, Ink.ink, bold = true))
            var ly = pdf.y + 30f
            bodies[i].forEach { line -> pdf.canvas.drawText(line, x + 8f, ly, sans(9.5f, Ink.ink)); ly += 12f }
        }
        pdf.y += cardH + 8f
    }
}

private fun drawGemstoneBlock(pdf: PdfBuilder, g: com.tredevastro.app.network.dto.GemstoneResultDto) {
    pdf.ensureSpace(90f)
    pdf.canvas.drawCircle(MARGIN + 4f, pdf.y + 6f, 4f, Paint().apply { isAntiAlias = true; color = Ink.gold })
    pdf.canvas.drawText("${g.purpose.uppercase()} — ${g.gemstone.uppercase()} (${g.sanskritName})", MARGIN + 14f, pdf.y + 10f, sans(11.5f, Ink.ink, bold = true))
    pdf.y += 20f
    wrapText(g.reason, sans(9f, Ink.muted), CONTENT_W).forEach { line -> pdf.canvas.drawText(line, MARGIN, pdf.y + 8f, sans(9f, Ink.muted)); pdf.y += 12f }
    pdf.y += 6f
    val colW = CONTENT_W / 2f
    pdf.canvas.drawText("GEMSTONE", MARGIN, pdf.y + 8f, sans(7.5f, Ink.muted))
    pdf.canvas.drawText(g.gemstone, MARGIN + colW - 16f - sans(10f, Ink.ink, true).measureText(g.gemstone), pdf.y + 8f, sans(10f, Ink.ink, bold = true))
    pdf.canvas.drawText("METAL", MARGIN + colW, pdf.y + 8f, sans(7.5f, Ink.muted))
    pdf.canvas.drawText(g.metal, PAGE_W - MARGIN - sans(10f, Ink.ink, true).measureText(g.metal), pdf.y + 8f, sans(10f, Ink.ink, bold = true))
    pdf.y += 18f
    pdf.canvas.drawText("HOW TO WEAR", MARGIN, pdf.y + 8f, sans(7.5f, Ink.muted))
    pdf.canvas.drawText(g.finger, MARGIN + colW - 16f - sans(10f, Ink.ink, true).measureText(g.finger), pdf.y + 8f, sans(10f, Ink.ink, bold = true))
    pdf.canvas.drawText("MANTRA", MARGIN + colW, pdf.y + 8f, sans(7.5f, Ink.muted))
    val mantraPaint = sans(9.5f, Ink.gold, italic = true)
    pdf.canvas.drawText(g.mantra, PAGE_W - MARGIN - mantraPaint.measureText(g.mantra), pdf.y + 8f, mantraPaint)
    pdf.y += 20f
    pdf.canvas.drawLine(MARGIN, pdf.y, PAGE_W - MARGIN, pdf.y, Paint().apply { color = Ink.line; strokeWidth = 0.75f })
    pdf.y += 14f
}

private fun drawDoshaRow(pdf: PdfBuilder, title: String, statusText: String, isConcern: Boolean, body: String) {
    pdf.ensureSpace(50f)
    pdf.canvas.drawText(title, MARGIN, pdf.y + 10f, sans(11.5f, Ink.ink, bold = true))
    val tint = if (isConcern) Ink.red else Ink.green
    val pillPaint = sans(9f, tint, bold = true)
    val pillW = pillPaint.measureText(statusText) + 20f
    val pillRect = RectF(PAGE_W - MARGIN - pillW, pdf.y - 2f, PAGE_W - MARGIN, pdf.y + 16f)
    pdf.canvas.drawRoundRect(pillRect, 9f, 9f, Paint().apply { isAntiAlias = true; color = tint; alpha = 30 })
    pdf.canvas.drawText(statusText, pillRect.left + 10f, pdf.y + 10f, pillPaint)
    pdf.y += 20f
    wrapText(body, sans(9.5f, Ink.muted), CONTENT_W).forEach { line -> pdf.ensureSpace(13f); pdf.canvas.drawText(line, MARGIN, pdf.y + 8f, sans(9.5f, Ink.muted)); pdf.y += 13f }
    pdf.y += 8f
    pdf.canvas.drawLine(MARGIN, pdf.y, PAGE_W - MARGIN, pdf.y, Paint().apply { color = Ink.line; strokeWidth = 0.75f })
    pdf.y += 14f
}

private fun drawClosingPage(pdf: PdfBuilder, profile: BirthProfile, logo: Bitmap) {
    pdf.startPage()
    val c = pdf.canvas
    val cx = PAGE_W / 2f
    var y = 300f

    c.drawBitmap(logo, null, RectF(cx - 32f, y, cx + 32f, y + 64f), Paint().apply { isAntiAlias = true })
    y += 84f

    val thankYou = sans(11f, Ink.gold, bold = true)
    val thankYouText = "THANK YOU FOR READING"
    c.drawText(thankYouText, cx - thankYou.measureText(thankYouText) / 2f, y, thankYou)
    y += 30f

    val cardTop = y
    val cardRect = RectF(MARGIN + 30f, cardTop, PAGE_W - MARGIN - 30f, cardTop + 190f)
    c.drawRoundRect(cardRect, 10f, 10f, Paint().apply { isAntiAlias = true; color = Ink.tint })

    val titlePaint = sans(18f, Ink.ink, bold = true)
    val line1 = "Your journey continues,"
    val line2 = profile.name.ifBlank { "friend" }
    c.drawText(line1, cx - titlePaint.measureText(line1) / 2f, cardTop + 40f, titlePaint)
    c.drawText(line2, cx - titlePaint.measureText(line2) / 2f, cardTop + 66f, titlePaint)

    val prose = sans(9.5f, Ink.muted)
    val proseText = "Want a deeper, personalised reading? Chat with a verified TredevaAstro astrologer for one-on-one guidance on your chart."
    var ly = cardTop + 96f
    wrapText(proseText, prose, cardRect.width() - 60f).forEach { line ->
        c.drawText(line, cx - prose.measureText(line) / 2f, ly, prose)
        ly += 14f
    }

    ly += 12f
    c.drawLine(cx - 30f, ly, cx + 30f, ly, Paint().apply { color = Ink.gold; strokeWidth = 1f })
    ly += 20f
    val brand = sans(9f, Ink.faint, bold = true)
    val brandText = "TREDEVAASTRO · YOUR SKY. YOUR STORY."
    c.drawText(brandText, cx - brand.measureText(brandText) / 2f, ly, brand)
    ly += 18f
    val endText = sans(9f, Ink.faint)
    val endStr = "— END OF REPORT —"
    c.drawText(endStr, cx - endText.measureText(endStr) / 2f, ly, endText)
}

private fun planetLinesWithDegree(planets: List<com.tredevastro.app.network.dto.PlanetDto>): Map<Int, List<String>> {
    val abbr = mapOf(
        "sun" to "Su", "moon" to "Mo", "mars" to "Ma", "mercury" to "Me",
        "jupiter" to "Ju", "venus" to "Ve", "saturn" to "Sa", "rahu" to "Ra", "ketu" to "Ke",
        "uranus" to "Ur", "neptune" to "Ne", "pluto" to "Pl",
    )
    return planets.groupBy { it.house }.mapValues { (_, list) ->
        list.mapNotNull { p -> abbr[p.id]?.let { "$it ${"%.2f".format(p.degreeInSign)}°${if (p.retrograde) " R" else ""}" } }
    }
}
