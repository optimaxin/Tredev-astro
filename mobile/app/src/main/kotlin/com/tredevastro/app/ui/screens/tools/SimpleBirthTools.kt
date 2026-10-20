package com.tredevastro.app.ui.screens.tools

import androidx.compose.runtime.Composable
import com.tredevastro.app.i18n.tr
import com.tredevastro.app.network.ApiClient
import com.tredevastro.app.network.dto.BabyNameResultDto
import com.tredevastro.app.network.dto.KaalSarpDoshaResultDto
import com.tredevastro.app.network.dto.LalKitabResultDto
import com.tredevastro.app.network.dto.LuckyAttributesDto
import com.tredevastro.app.network.dto.NakshatraResultDto
import com.tredevastro.app.network.dto.PitraDoshaResultDto
import com.tredevastro.app.network.dto.RahuKetuTransitResultDto
import com.tredevastro.app.ui.components.KeyValueGrid

@Composable
fun NakshatraFinderScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Nakshatra Finder",
    subtitle = "Your Moon sign and birth star",
    buttonText = "Find My Nakshatra",
    onBack = onBack,
    call = { ApiClient.service.getNakshatra(it) },
    resultContent = { r: NakshatraResultDto ->
        KeyValueGrid(
            listOf(
                "Rashi" to r.rashi,
                "Nakshatra" to r.name,
                "Pada" to "${r.pada}",
                "Nakshatra Lord" to r.lord.replaceFirstChar { it.uppercase() },
            ),
        )
    },
)

@Composable
fun LuckyAttributesScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Lucky Color & Date",
    subtitle = "Your ruling planet's lucky attributes",
    buttonText = "Find My Lucky Attributes",
    onBack = onBack,
    call = { ApiClient.service.getLucky(it) },
    resultContent = { r: LuckyAttributesDto ->
        KeyValueGrid(
            listOf(
                "Ruling Planet" to r.rulingPlanet.replaceFirstChar { it.uppercase() },
                "Lucky Color" to r.color,
                "Lucky Number" to "${r.number}",
                "Lucky Dates" to r.luckyDates.joinToString(", "),
            ),
        )
    },
)

@Composable
fun BabyNameScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Baby Name Calculator",
    subtitle = "A starting syllable from the birth Nakshatra",
    buttonText = "Find the Naming Syllable",
    onBack = onBack,
    call = { ApiClient.service.getBabyName(it) },
    resultContent = { r: BabyNameResultDto ->
        KeyValueGrid(
            listOf(
                "Nakshatra" to r.nakshatra,
                "Pada" to "${r.pada}",
                "Suggested Syllable" to r.syllable,
                "All Syllables (this Nakshatra)" to r.allSyllablesInNakshatra.joinToString(", "),
            ),
        )
    },
)

@Composable
fun LalKitabScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Lal Kitab",
    subtitle = "Which grahas sit in their own permanent house",
    buttonText = "Check My Lal Kitab Houses",
    onBack = onBack,
    call = { ApiClient.service.getLalKitab(it) },
    resultContent = { r: LalKitabResultDto ->
        KeyValueGrid(
            r.houses.map { h ->
                h.planetId.replaceFirstChar { it.uppercase() } to
                    tr("House ${h.house}${if (h.inOwnHouse) " · Own house" else ""}")
            },
        )
    },
)

@Composable
fun KaalSarpDoshaScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Kaal Sarp Dosha",
    subtitle = "Whether every planet sits enclosed between Rahu and Ketu",
    buttonText = "Check Kaal Sarp Dosha",
    onBack = onBack,
    call = { ApiClient.service.getKaalSarpDosha(it) },
    resultContent = { r: KaalSarpDoshaResultDto ->
        KeyValueGrid(
            listOf(
                "Present" to tr(if (r.isKaalSarp) "Yes" else "No"),
                "Rahu Rashi" to r.rahuRashi,
                "Ketu Rashi" to r.ketuRashi,
            ) + if (r.enclosedSide != null) listOf("Enclosed Side" to r.enclosedSide) else emptyList(),
        )
    },
)

@Composable
fun PitraDoshaScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Pitra Dosha",
    subtitle = "Affliction to the 9th house / Sun by Rahu, Ketu or Saturn",
    buttonText = "Check Pitra Dosha",
    onBack = onBack,
    call = { ApiClient.service.getPitraDosha(it) },
    resultContent = { r: PitraDoshaResultDto ->
        KeyValueGrid(
            listOf(
                "Present" to tr(if (r.isPitraDosha) "Yes" else "No"),
                "Sun Rashi" to r.sunRashi,
                "9th Lord" to r.ninthLord.replaceFirstChar { it.uppercase() },
                "9th Lord's Rashi" to r.ninthLordRashi,
            ) + if (r.reasons.isNotEmpty()) listOf("Reasons" to r.reasons.joinToString(", ") { it.replace("-", " ") }) else emptyList(),
        )
    },
)

@Composable
fun RahuKetuTransitScreen(onBack: () -> Unit) = BirthToolScreen(
    title = "Rahu Ketu Transit",
    subtitle = "Where the shadow planets are transiting from your Moon",
    buttonText = "Check My Transit",
    onBack = onBack,
    call = { ApiClient.service.getRahuKetuTransit(it) },
    resultContent = { r: RahuKetuTransitResultDto ->
        KeyValueGrid(
            listOf(
                "Moon Rashi" to r.moonRashi,
                "Rahu Transit" to tr("${r.rahuTransitRashi} (House ${r.rahuHouseFromMoon})"),
                "Ketu Transit" to tr("${r.ketuTransitRashi} (House ${r.ketuHouseFromMoon})"),
            ),
        )
    },
)
