package com.tredevastro.app.ui.screens.kundli

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.tredevastro.app.ui.theme.LocalAppColors
import kotlin.math.hypot

/**
 * A North-Indian-style Kundli square: outer square + both diagonals + an
 * inner diamond, with the 12 houses at their classic fixed positions —
 * House 1 (Lagna) is always the top kite, then counter-clockwise through
 * House 12. Each cell shows the RASHI NUMBER of whichever sign occupies it
 * (computed from the real Ascendant, same as the website's chart — not a
 * generic 1-12 house count) plus any planet abbreviations tenanting it.
 * Tapping a house highlights it — the tap target is nearest-centroid, not a
 * real polygon hit test.
 */
private val HOUSE_POSITIONS = listOf(
    0.50f to 0.22f, // 1
    0.22f to 0.08f, // 2
    0.08f to 0.22f, // 3
    0.22f to 0.50f, // 4
    0.08f to 0.78f, // 5
    0.22f to 0.92f, // 6
    0.50f to 0.78f, // 7
    0.78f to 0.92f, // 8
    0.92f to 0.78f, // 9
    0.78f to 0.50f, // 10
    0.92f to 0.22f, // 11
    0.78f to 0.08f, // 12
)

@Composable
fun KundliChart(
    onHouseSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
    ascendantRashiIndex: Int = 0,
    housePlanets: Map<Int, List<String>> = emptyMap(),
) {
    val colors = LocalAppColors.current
    var selected by remember { mutableIntStateOf(1) }

    Box(modifier = modifier.fillMaxWidth().aspectRatio(1f)) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .pointerInput(Unit) {
                    detectTapGestures { tap ->
                        val w = size.width.toFloat()
                        val h = size.height.toFloat()
                        var closest = 1
                        var bestDist = Float.MAX_VALUE
                        HOUSE_POSITIONS.forEachIndexed { index, (fx, fy) ->
                            val d = hypot(tap.x - fx * w, tap.y - fy * h)
                            if (d < bestDist) {
                                bestDist = d
                                closest = index + 1
                            }
                        }
                        selected = closest
                        onHouseSelected(closest)
                    }
                },
        ) {
            val w = size.width
            val h = size.height
            val gold = colors.goldPrimary

            // Outer square
            drawRect(color = gold, topLeft = Offset.Zero, size = size, style = Stroke(width = 2.5f))
            // Diagonals
            drawLine(gold, Offset(0f, 0f), Offset(w, h), strokeWidth = 1.5f)
            drawLine(gold, Offset(w, 0f), Offset(0f, h), strokeWidth = 1.5f)
            // Inner diamond (midpoints of each side)
            val top = Offset(w / 2f, 0f)
            val right = Offset(w, h / 2f)
            val bottom = Offset(w / 2f, h)
            val left = Offset(0f, h / 2f)
            drawLine(gold, top, right, strokeWidth = 1.5f)
            drawLine(gold, right, bottom, strokeWidth = 1.5f)
            drawLine(gold, bottom, left, strokeWidth = 1.5f)
            drawLine(gold, left, top, strokeWidth = 1.5f)

            HOUSE_POSITIONS.forEachIndexed { index, (fx, fy) ->
                val houseNumber = index + 1
                val rashiNumber = ((ascendantRashiIndex + houseNumber - 1) % 12) + 1
                val center = Offset(fx * w, fy * h)
                if (houseNumber == selected) {
                    drawCircle(color = colors.goldPrimary.copy(alpha = 0.22f), radius = w * 0.09f, center = center)
                }
                val planetsHere = housePlanets[houseNumber]
                val planetLabel = planetsHere?.takeIf { it.isNotEmpty() }?.joinToString(" ")

                drawIntoCanvas { canvas ->
                    val onSelected = houseNumber == selected
                    fun awtColor(c: androidx.compose.ui.graphics.Color) = android.graphics.Color.argb(
                        (c.alpha * 255).toInt(), (c.red * 255).toInt(), (c.green * 255).toInt(), (c.blue * 255).toInt(),
                    )

                    // Rashi (sign) number — small, gold, offset above the planet label.
                    val rashiPaint = android.graphics.Paint().apply {
                        color = awtColor(if (onSelected) colors.bgPrimary else colors.goldPrimary)
                        textSize = w * 0.032f
                        textAlign = android.graphics.Paint.Align.CENTER
                        isAntiAlias = true
                    }
                    val rashiY = if (planetLabel != null) center.y - w * 0.045f else center.y + rashiPaint.textSize * 0.35f
                    canvas.nativeCanvas.drawText(rashiNumber.toString(), center.x, rashiY, rashiPaint)

                    // Planet abbreviations — larger, below the rashi number.
                    if (planetLabel != null) {
                        val planetPaint = android.graphics.Paint().apply {
                            color = awtColor(if (onSelected) colors.bgPrimary else colors.textSecondary)
                            textSize = w * 0.036f
                            textAlign = android.graphics.Paint.Align.CENTER
                            isAntiAlias = true
                        }
                        canvas.nativeCanvas.drawText(planetLabel, center.x, center.y + w * 0.03f, planetPaint)
                    }
                }
            }
        }
    }
}
