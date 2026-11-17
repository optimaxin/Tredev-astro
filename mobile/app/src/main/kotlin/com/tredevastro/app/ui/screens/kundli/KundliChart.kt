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
 * inner diamond, with the 12 houses numbered at their classic positions.
 * Tapping a house highlights it — geometry is illustrative (a visual match
 * for the website's chart), not a real house-boundary hit test.
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
            val stroke = Stroke(width = 2.5f)

            // Outer square
            drawRect(color = gold, topLeft = Offset.Zero, size = size, style = stroke)
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
                val center = Offset(fx * w, fy * h)
                if (houseNumber == selected) {
                    drawCircle(color = colors.goldPrimary.copy(alpha = 0.22f), radius = w * 0.07f, center = center)
                }
                drawIntoCanvas { canvas ->
                    val paint = android.graphics.Paint().apply {
                        color = (if (houseNumber == selected) colors.bgPrimary else colors.textSecondary).let {
                            android.graphics.Color.argb(
                                (it.alpha * 255).toInt(),
                                (it.red * 255).toInt(),
                                (it.green * 255).toInt(),
                                (it.blue * 255).toInt(),
                            )
                        }
                        textSize = w * 0.045f
                        textAlign = android.graphics.Paint.Align.CENTER
                        isAntiAlias = true
                    }
                    canvas.nativeCanvas.drawText(
                        houseNumber.toString(),
                        center.x,
                        center.y + paint.textSize * 0.35f,
                        paint,
                    )
                }
            }
        }
    }
}
