package com.tredevastro.app.data

import com.tredevastro.app.R

/** Exact port of web/frontend/src/data/planetMeta.ts's PLANET_META — same
 * names, symbols, icons (or lack thereof), and quality strings. */
data class PlanetMeta(
    val name: String,
    val symbol: String,
    val iconRes: Int?,
    val quality: String,
)

val PLANET_META = mapOf(
    "sun" to PlanetMeta("Sun", "☉", R.drawable.planet_sun, "Identity · vitality · self-expression"),
    "moon" to PlanetMeta("Moon", "☽", R.drawable.planet_moon, "Mind · emotions · inner world"),
    "mercury" to PlanetMeta("Mercury", "☿", R.drawable.planet_mercury, "Communication · intellect · adaptability"),
    "venus" to PlanetMeta("Venus", "♀", R.drawable.planet_venus, "Love · beauty · pleasures · art"),
    "mars" to PlanetMeta("Mars", "♂", R.drawable.planet_mars, "Energy · drive · courage · action"),
    "jupiter" to PlanetMeta("Jupiter", "♃", R.drawable.planet_jupiter, "Wisdom · expansion · abundance · grace"),
    "saturn" to PlanetMeta("Saturn", "♄", R.drawable.planet_saturn, "Discipline · karma · structure · time"),
    "uranus" to PlanetMeta("Uranus", "♅", R.drawable.planet_uranus, "Sudden change · originality · rebellion"),
    "neptune" to PlanetMeta("Neptune", "♆", R.drawable.planet_neptune, "Imagination · illusion · idealism"),
    "pluto" to PlanetMeta("Pluto", "♇", R.drawable.planet_pluto, "Deep transformation · hidden power · regeneration"),
    "rahu" to PlanetMeta("Rahu", "☊", null, "Desire · ambition · future karma"),
    "ketu" to PlanetMeta("Ketu", "☋", null, "Liberation · past karma · spirituality"),
    "asc" to PlanetMeta("Ascendant", "↑", null, "Self · physical body · first impression · vitality"),
)

/** Exact port of web/frontend/src/data/mockData.ts's HOUSE_MEANINGS. */
val HOUSE_MEANINGS = mapOf(
    1 to "Self, body, personality, early life",
    2 to "Wealth, family, speech, values",
    3 to "Courage, siblings, communication, short journeys",
    4 to "Home, mother, comforts, inner peace",
    5 to "Creativity, children, intelligence, romance",
    6 to "Health, debts, service, obstacles",
    7 to "Partnerships, marriage, business, public dealings",
    8 to "Longevity, transformation, secrets, inheritance",
    9 to "Dharma, fortune, higher learning, spiritual wisdom",
    10 to "Career, status, authority, life purpose",
    11 to "Gains, friendships, aspirations, income",
    12 to "Liberation, losses, foreign lands, spiritual moksha",
)

/** English ordinal suffix — "1st", "2nd", "3rd", "4th"... */
fun ordinal(n: Int): String {
    if (n % 100 in 11..13) return "${n}th"
    return when (n % 10) {
        1 -> "${n}st"
        2 -> "${n}nd"
        3 -> "${n}rd"
        else -> "${n}th"
    }
}
