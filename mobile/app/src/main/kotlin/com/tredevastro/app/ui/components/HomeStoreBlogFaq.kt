package com.tredevastro.app.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

private data class StoreProduct(val slug: String, val name: String, val price: Int, val mrp: Int, val imageUrl: String)

// Mirrors web/frontend/src/data/externalStoreProducts.ts's
// EXTERNAL_STORE_PRODUCTS exactly — same curated subset of the real
// tredevastore.com catalog, same product pages. Keep both lists in sync by
// hand; there's no shared data layer between the app and the website yet.
private const val STORE_BASE_URL = "https://tredevastore.com"
private const val PRODUCT_IMAGE_BASE = "https://tredev-gems.onrender.com"

private val STORE_PRODUCTS = listOf(
    StoreProduct("2-mukhi-indian-rudraksh", "2 Mukhi Indian Rudraksha", 699, 999, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/41037bb38c6e4a0698edb16f680db9c0.jpg"),
    StoreProduct("3-mukhi-nepali-rudraksh", "3 Mukhi (Nepali) Rudraksha", 899, 1299, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/23d8c3f2c64141fa8d21d78c1d72d596.jpg"),
    StoreProduct("1-mukhi-kaju-indian", "1 Mukhi Kaju-Shaped Indian Rudraksha", 2199, 3599, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/9ccb91be1fa0468f8e85b8ff8573a2d0.jpg"),
    StoreProduct("1-mukhi-gol-dana-nepali", "1 Mukhi Gol Dana (Nepali) Rudraksha", 4199, 5999, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/3a7b5a4b9f144b31954588218e96a33f.jpg"),
    StoreProduct("0-mukhi-nepali-rudraksha", "Nirakar (0 Mukhi) Nepali Rudraksha", 7999, 10999, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/761628b8bbba47a180852836f19745f7.jpg"),
    StoreProduct("1-mukhi-rudraksh-sawar", "1 Mukhi Rudraksha (Nepali) — Sawar", 44999, 69999, "$PRODUCT_IMAGE_BASE/api/media/file/gemora/media/7319c4b7057c4403a021a4f66f96dc5e.jpg"),
)

/** TredevaStore's real product catalog, one horizontal row — tapping a card
 * opens that exact product's real page on tredevastore.com, same as the
 * website's cards (which are plain `target="_blank"` links, no in-app
 * cart/checkout there either, by design). */
@Composable
fun HomeStoreRow(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    LazyRow(modifier = modifier, contentPadding = PaddingValues(end = 8.dp)) {
        items(STORE_PRODUCTS) { product ->
            val colors = LocalAppColors.current
            GlassCard(
                modifier = Modifier.padding(end = 12.dp).size(width = 140.dp, height = 190.dp),
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$STORE_BASE_URL/product/${product.slug}")))
                },
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(10.dp)) {
                    AsyncImage(
                        model = product.imageUrl,
                        contentDescription = product.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().size(90.dp).clip(RoundedCornerShape(10.dp)),
                    )
                    Text(
                        tr(product.name),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Medium,
                        fontSize = 12.sp,
                        lineHeight = 15.sp,
                        maxLines = 2,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                    Text(
                        "₹${product.price}",
                        color = colors.goldPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }
    }
}

private data class BlogTeaser(val title: String, val category: String)

private val BLOG_TEASERS = listOf(
    BlogTeaser("Understanding Your Moon Sign", "Basics"),
    BlogTeaser("What Sade Sati Really Means", "Saturn"),
    BlogTeaser("Choosing Gemstones by Rashi", "Remedies"),
)

/** Static teaser cards — there's no blog/CMS API wired up yet, so these are
 * fixed titles that toast "coming soon" on tap, same as the store card. */
@Composable
fun HomeBlogsRow(onClick: () -> Unit, modifier: Modifier = Modifier) {
    LazyRow(modifier = modifier, contentPadding = PaddingValues(end = 8.dp)) {
        items(BLOG_TEASERS) { blog ->
            val colors = LocalAppColors.current
            GlassCard(
                modifier = Modifier.padding(end = 12.dp).size(width = 200.dp, height = 110.dp),
                onClick = onClick,
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(
                        tr(blog.category.uppercase()),
                        color = colors.goldPrimary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp,
                    )
                    Text(
                        tr(blog.title),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Medium,
                        fontSize = 15.sp,
                        lineHeight = 19.sp,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }
    }
}

private data class Faq(val question: String, val answer: String)

private val FAQS = listOf(
    Faq("Is the Kundli generation really free?", "Yes — the full birth chart, planetary positions and dasha timeline are free, no login required."),
    Faq("How accurate is the horoscope?", "It's computed from real planetary positions (Lahiri sidereal ephemeris), not generic text — the same engine the website uses."),
    Faq("Do I need my exact birth time?", "It's optional but recommended — an exact time gives a more precise ascendant and house placements."),
    Faq("Are the astrologers verified?", "Yes, every astrologer listed is manually vetted before they can take consultations."),
)

/** A small, static accordion — genuinely expandable, not a placeholder,
 * since trust/clarity content like this matters most for exactly the
 * audience this screen is being simplified for. */
@Composable
fun HomeFaqSection(modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        FAQS.forEach { faq -> FaqRow(faq) }
    }
}

@Composable
private fun FaqRow(faq: Faq) {
    val colors = LocalAppColors.current
    var expanded by remember { mutableStateOf(false) }
    GlassCard(modifier = Modifier.fillMaxWidth().animateContentSize(), onClick = { expanded = !expanded }) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    tr(faq.question),
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = colors.goldPrimary,
                )
            }
            if (expanded) {
                Text(
                    tr(faq.answer),
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
