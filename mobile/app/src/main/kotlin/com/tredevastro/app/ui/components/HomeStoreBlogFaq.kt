package com.tredevastro.app.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tredevastro.app.R
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.ui.theme.LocalAppColors

private data class StoreProduct(val name: String, val price: Int, val image: Int)

// Real TredevaStore catalog (web/frontend/src/data/mockData.ts's PRODUCTS) —
// tapping still toasts "coming soon" since the app has no checkout/product
// screen yet, but the catalog itself is real, not placeholder content.
private val STORE_PRODUCTS = listOf(
    StoreProduct("Natural Colombian Emerald", 2499, R.drawable.product_emerald),
    StoreProduct("Five-Mukhi Rudraksha", 899, R.drawable.product_rudraksha),
    StoreProduct("Rose Quartz Cluster", 649, R.drawable.product_crystal),
    StoreProduct("Tiger Eye Bracelet", 549, R.drawable.product_bracelet),
)

/** TredevaStore's real product catalog, one horizontal row — taps through
 * to a "coming soon" toast since there's no in-app checkout yet. */
@Composable
fun HomeStoreRow(onClick: () -> Unit, modifier: Modifier = Modifier) {
    LazyRow(modifier = modifier, contentPadding = PaddingValues(end = 8.dp)) {
        items(STORE_PRODUCTS) { product ->
            val colors = LocalAppColors.current
            GlassCard(modifier = Modifier.padding(end = 12.dp).size(width = 140.dp, height = 190.dp), onClick = onClick) {
                Column(modifier = Modifier.fillMaxWidth().padding(10.dp)) {
                    Image(
                        painter = painterResource(product.image),
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
