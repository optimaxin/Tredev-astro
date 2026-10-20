package com.tredevastro.app.network.dto


/** Every backend response is `{ success, data }` or `{ success: false, error }` —
 * see backend/app/api/calculators.routes.ts's `handle()` / `fail()`. */
data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
    val pagination: PaginationDto? = null,
)

data class ApiError(val code: String, val message: String)

data class PaginationDto(val page: Int, val limit: Int, val total: Int)

/** Mirrors backend/app/models/astrologer.ts's PublicAstrologerProfile. */
data class AstrologerDto(
    val id: Int,
    val name: String,
    val title: String,
    val bio: String,
    val avatar: String,
    val languages: List<String>,
    val categories: List<String>,
    val expertise: List<String>,
    val consultationTypes: List<String>,
    val chatPrice: Int,
    val callPrice: Int,
    val videoPrice: Int,
    val rating: Double,
    val reviewCount: Int,
    val experienceYears: Int,
    val consultationCount: Int,
    val activeOfferPercent: Int,
)

/** Mirrors backend/app/models/types.ts's PublicAstrologerState — the same
 * live presence feed (GET /api/astrologers, no auth) the website's realtime
 * layer polls/sockets for astrologer online/busy/offline status. */
data class PublicAstrologerStateDto(
    val id: Int,
    val status: String, // OFFLINE | ONLINE_AVAILABLE | ONLINE_BUSY | AWAY
    val activeCount: Int,
    val maxConcurrent: Int,
    val queueLength: Int,
)

/** Mirrors backend/app/services/geocoding.ts's GeocodeResult. */
data class GeocodeDto(
    val latitude: Double,
    val longitude: Double,
    val displayName: String,
)

/** placeId-only suggestions (AWS-sourced) need a resolvePlace() follow-up call;
 * ones with lat/long already (Nominatim-sourced) are final. Mirrors the
 * website's PlaceSuggestion — see LocationAutocomplete.tsx. */
data class PlaceSuggestionDto(
    val label: String,
    val placeId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)

/** Mirrors backend/app/services/astrology/kundli.ts's Kundli. */
data class KundliDto(
    val ascendant: AscendantDto,
    val planets: List<PlanetDto>,
    val moonNakshatra: MoonNakshatraDto,
)

data class AscendantDto(val longitude: Double, val rashi: String, val degreeInSign: Double)

data class PlanetDto(
    val id: String,
    val longitude: Double,
    val rashi: String,
    val degreeInSign: Double,
    val house: Int,
    val nakshatra: String,
    val nakshatraPada: Int,
    val nakshatraLord: String,
    val retrograde: Boolean,
)

data class MoonNakshatraDto(val name: String, val pada: Int, val lord: String)

/** Mirrors backend/app/services/astrology/dailyHoroscope.ts's DailyHoroscopeResult. */
data class DailyHoroscopeDto(
    val moonSignRashi: String,
    val date: String,
    val transits: List<TransitDto>,
)

data class TransitDto(val id: String, val rashi: String, val house: Int, val retrograde: Boolean)

/** Mirrors backend/app/services/astrology/upcomingTransits.ts's entries,
 * returned inside horoscope-period's `upcomingTransits`. */
data class UpcomingTransitDto(val planetId: String, val fromRashi: String, val toRashi: String, val date: String)

/** Mirrors POST /api/calculators/horoscope-period's response: the daily
 * shape plus `period` and real upcoming sign-change events. */
data class HoroscopePeriodDto(
    val moonSignRashi: String,
    val date: String,
    val transits: List<TransitDto>,
    val period: String,
    val upcomingTransits: List<UpcomingTransitDto>,
)

/** Full backend/app/services/astrology/panchang.ts's PanchangResult (the
 * fields this app renders — samvat/maas/ritu/grahaPositions/choghadiya are
 * defined server-side but not shown on the website's own homepage Panchang
 * card either, so they're omitted here too). */
data class PanchangDto(
    val date: String,
    val vara: String,
    val tithi: TithiDto,
    val nakshatra: NakshatraDto,
    val moonRashi: String,
    val sunRashi: String,
    val yoga: String,
    val karana: String,
    val angaReference: String,
    val sunrise: String?,
    val sunset: String?,
    val moonrise: String?,
    val moonset: String?,
    val rahuKaal: TimeWindowDto?,
    val yamagandaKaal: TimeWindowDto?,
    val gulikaKaal: TimeWindowDto?,
    val abhijitMuhurat: TimeWindowDto?,
    val vijayaMuhurat: TimeWindowDto?,
    val amritKaal: TimeWindowDto?,
    val sarvarthaSiddhiYoga: Boolean,
    val maas: String = "",
    val ritu: String = "",
    val samvat: SamvatDto? = null,
    val grahaPositions: List<GrahaPositionDto> = emptyList(),
    val choghadiya: ChoghadiyaDto? = null,
)

/** Mirrors backend/app/services/astrology/panchang.ts's ChoghadiyaSegment —
 * 8 day + 8 night segments, each a named auspicious/inauspicious window. */
data class ChoghadiyaSegmentDto(val name: String, val auspicious: Boolean, val start: String, val end: String)

data class ChoghadiyaDto(val day: List<ChoghadiyaSegmentDto>, val night: List<ChoghadiyaSegmentDto>)

data class TithiDto(val name: String, val paksha: String, val number: Int, val start: String, val end: String)

data class NakshatraDto(val name: String, val pada: Int, val lord: String, val start: String, val end: String)

data class TimeWindowDto(val start: String, val end: String)

data class SamvatDto(val vikram: Int, val shaka: Int)

data class GrahaPositionDto(val id: String, val rashi: String)

/** POST /api/calculators/kundli-full's response — full parity with
 * web/frontend/src/sections/KundliSection/KundliSection.tsx's Overview,
 * Charts, Timeline, Predictions, Remedies and Advanced tabs (Gochar reuses
 * the existing daily-horoscope endpoint separately, not this response). */
data class KundliFullDto(
    val kundli: KundliDto,
    val navamsaChart: VargaChartDto,
    val chandraChart: ChandraChartDto,
    val bhavChalit: BhavChalitChartDto,
    val vargaCharts: Map<String, VargaChartDto> = emptyMap(),
    val mahadashaTimeline: List<MahadashaPeriodDto> = emptyList(),
    val yoginiDashaTimeline: List<YoginiPeriodDto> = emptyList(),
    val doshas: DoshasDto,
    val yogas: List<YogaResultDto> = emptyList(),
    val analysis: KundliAnalysisDto,
    val ascendantPredictions: AscendantPredictionsDto,
    val dashaPredictions: List<DashaPredictionDto> = emptyList(),
    val avakhada: AvakhadaDto,
    val gemstones: GemstoneRecommendationsDto,
    val rudraksha: RudrakshaResultDto,
    val panchang: PanchangDto,
    val ashtakavarga: AshtakavargaResultDto,
    val kp: KpResultDto,
    val shadbala: ShadbalaResultDto,
)

/** Shared shape for every D2-D60 varga chart, and navamsaChart — mirrors
 * backend/app/services/astrology/divisionalCharts.ts's VargaChart. */
data class VargaAscendantDto(val rashi: String)
data class VargaPlanetDto(val id: String, val rashi: String, val house: Int)
data class VargaChartDto(val ascendant: VargaAscendantDto, val planets: List<VargaPlanetDto> = emptyList())

/** Mirrors ChandraChart — same as VargaChart but keyed off the Moon and
 * carrying degree/retrograde per planet (needed for the Chandra chart tile). */
data class ChandraChartPlanetDto(val id: String, val rashi: String, val degreeInSign: Double, val house: Int, val retrograde: Boolean)
data class ChandraChartDto(val moonRashi: String, val planets: List<ChandraChartPlanetDto> = emptyList())

/** Mirrors BhavChalitChart — real Placidus cuspal houses, used by the Charts
 * tab's Bhav Chalit tile and the Advanced/KP tab's cusp table. */
data class BhavChalitCuspDto(val house: Int, val rashi: String, val degreeInSign: Double)
data class BhavChalitChartDto(
    val ascendant: VargaAscendantDto,
    val planets: List<VargaPlanetDto> = emptyList(),
    val cusps: List<BhavChalitCuspDto> = emptyList(),
)

/** Mirrors vimshottariDasha.ts's MahadashaPeriod/AntardashaPeriod. */
data class AntardashaPeriodDto(val lord: String, val startsAt: String, val endsAt: String, val active: Boolean)
data class MahadashaPeriodDto(
    val lord: String,
    val startsAt: String,
    val endsAt: String,
    val active: Boolean,
    val antardashas: List<AntardashaPeriodDto> = emptyList(),
)

/** Mirrors yoginiDasha.ts's YoginiPeriod. */
data class YoginiPeriodDto(val yogini: String, val lord: String, val startsAt: String, val endsAt: String, val active: Boolean)

/** Mirrors calculators.routes.ts's `doshas` bundle — kaalSarp/sadeSati/
 * rahuKetuTransit all reuse the same result shapes the standalone Dosha
 * calculator screens already model. */
data class DoshasDto(
    val kaalSarp: KaalSarpDoshaResultDto,
    val sadeSati: SadeSatiDto,
    val rahuKetuTransit: RahuKetuTransitResultDto,
)

/** Mirrors yogas.ts's YogaResult — exactly 3 yogas are ever returned
 * (Gajakesari, Chandra-Mangal, Budhaditya), each with a present/absent flag. */
data class YogaResultDto(val name: String, val present: Boolean, val description: String)

/** Mirrors ascendantPredictions.ts's AscendantPredictions. */
data class AscendantPredictionsDto(
    val ascendant: String,
    val description: String,
    val personality: String,
    val physical: String,
    val health: String,
    val career: String,
    val relationship: String,
    val dos: List<String> = emptyList(),
    val donts: List<String> = emptyList(),
)

/** Mirrors dashaPredictions.ts's DashaPrediction — one per Mahadasha lord. */
data class DashaPredictionDto(val lord: String, val text: String)

/** Mirrors ashtakavarga.ts's AshtakavargaResult — sarvaTotal is invariantly 337. */
data class AshtakavargaPointDto(val rashi: String, val bindus: Int)
data class AshtakavargaBhinnaDto(val planet: String, val points: List<AshtakavargaPointDto> = emptyList())
data class AshtakavargaResultDto(
    val bhinna: List<AshtakavargaBhinnaDto> = emptyList(),
    val sarva: List<AshtakavargaPointDto> = emptyList(),
    val sarvaTotal: Int = 0,
)

/** Mirrors kpAstrology.ts's KpResult — table has one row per planet + the
 * ascendant ("asc"), cusps has 12 real Placidus house-cusp rows. */
data class KpRowDto(val id: String, val rashi: String, val signLord: String, val starLord: String, val subLord: String)
data class KpRulingPlanetsDto(
    val lagnaSignLord: String,
    val lagnaStarLord: String,
    val lagnaSubLord: String,
    val moonSignLord: String,
    val moonStarLord: String,
    val moonSubLord: String,
    val dayLord: String,
)
data class KpResultDto(
    val table: List<KpRowDto> = emptyList(),
    val cusps: List<KpRowDto> = emptyList(),
    val rulingPlanets: KpRulingPlanetsDto,
)

/** Mirrors backend/app/services/astrology/shadbala.ts's PlanetShadbala/
 * HouseBala/ShadbalaResult exactly — full per-component breakdown, needed
 * to match the website's PDF Shadbala/Bhavbala matrix tables field-for-field. */
data class ShadbalaComponentDto(val total: Double = 0.0)
data class PlanetShadbalaDto(
    val planet: String,
    val sthanabala: ShadbalaComponentDto = ShadbalaComponentDto(),
    val digbala: Double = 0.0,
    val kaalabala: ShadbalaComponentDto = ShadbalaComponentDto(),
    val cheshtabala: Double = 0.0,
    val naisargikabala: Double = 0.0,
    val drikbala: Double = 0.0,
    val totalVirupas: Double = 0.0,
    val rupas: Double = 0.0,
    val minRequiredRupas: Double = 0.0,
    val isStrong: Boolean = false,
    val ishtabala: Double = 0.0,
    val kashtabala: Double = 0.0,
)
data class HouseBalaDto(val house: Int, val adhipatiBala: Double = 0.0, val digBala: Double = 0.0, val drikBala: Double = 0.0, val total: Double = 0.0)
data class ShadbalaResultDto(val planets: List<PlanetShadbalaDto> = emptyList(), val houses: List<HouseBalaDto> = emptyList())

/** Mirrors backend/app/services/astrology/avakhada.ts's GemstoneResult. */
data class GemstoneResultDto(
    val purpose: String,
    val rulingPlanet: String,
    val gemstone: String,
    val sanskritName: String,
    val metal: String,
    val finger: String,
    val mantra: String,
    val color: String,
    val reason: String,
)

data class GemstoneRecommendationsDto(
    val life: GemstoneResultDto,
    val lucky: GemstoneResultDto,
    val fortune: GemstoneResultDto,
)

/** Mirrors backend/app/services/astrology/avakhada.ts's RudrakshaResult. */
data class RudrakshaResultDto(
    val rulingPlanet: String,
    val mukhi: Int,
    val deity: String,
    val benefits: List<String>,
    val howToWear: String,
    val precautions: List<String>,
    val reason: String,
)

data class KundliAnalysisDto(val lagna: String, val moon: String, val planets: List<PlanetAnalysisDto>)

data class PlanetAnalysisDto(val id: String, val text: String)

/** Mirrors backend/app/services/astrology/doshas.ts's SadeSatiResult. */
data class SadeSatiDto(
    val active: Boolean,
    val phase: String?,
    val moonRashi: String,
    val saturnTransitRashi: String,
)

/** Mirrors backend/app/services/astrology/gunMilan.ts's KootaResult. */
data class KootaDto(val name: String, val maxPoints: Int, val points: Int)

/** Mirrors backend/app/services/astrology/gunMilan.ts's GunMilanResult. */
data class GunMilanDto(
    val totalPoints: Int,
    val maxPoints: Int,
    val kootas: List<KootaDto>,
    val brideMoonRashi: String,
    val groomMoonRashi: String,
    val brideNakshatra: String,
    val groomNakshatra: String,
)

/** Mirrors backend/app/services/astrology/kundliMatching.ts's DoshaVerdict. */
data class DoshaVerdictDto(
    val status: String,
    val severity: String,
    val cancellation: String,
    val reason: String,
    val points: Int,
    val maxPoints: Int,
)

data class FinalAssessmentDto(val grade: String, val reasoning: List<String>)

/** Subset of POST /api/calculators/kundli-matching's KundliMatchingReport —
 * the Milan-score/verdict fields the app's result screen renders. The full
 * response also includes `bride`/`groom` (each a complete PartnerReport
 * with its own Kundli, Navamsa chart and Mahadasha timeline) and
 * `planetaryCompatibility` — not modeled here (not shown on this screen
 * yet), Moshi just ignores those extra keys. */
data class KundliMatchingReportDto(
    val gunMilan: GunMilanDto,
    val bhakoot: DoshaVerdictDto,
    val nadi: DoshaVerdictDto,
    val finalAssessment: FinalAssessmentDto,
)

data class AvakhadaDto(
    val varna: String,
    val vashya: String,
    val yoni: String,
    val gana: String,
    val nadi: String,
    val paya: String,
    val tatva: String,
    val signLord: String,
    val nakshatraLord: String,
    val pada: Int,
)

/** Mirrors backend/app/api/calculators.routes.ts's /nakshatra response. */
data class NakshatraResultDto(
    val moonLongitude: Double,
    val rashi: String,
    val name: String,
    val pada: Int,
    val lord: String,
    val start: String,
    val end: String,
)

/** Mirrors backend/app/services/astrology/avakhada.ts's LuckyAttributes. */
data class LuckyAttributesDto(
    val rulingPlanet: String,
    val color: String,
    val colorHex: String,
    val number: Int,
    val luckyDates: List<Int>,
    val reason: String,
)

/** Mirrors backend/app/services/astrology/babyName.ts's BabyNameResult. */
data class BabyNameResultDto(
    val nakshatra: String,
    val pada: Int,
    val syllable: String,
    val allSyllablesInNakshatra: List<String>,
)

/** Mirrors backend/app/services/astrology/lalKitab.ts's LalKitabResult. */
data class LalKitabHouseEntryDto(val planetId: String, val house: Int, val pakkaGhar: List<Int>, val inOwnHouse: Boolean)
data class LalKitabResultDto(val houses: List<LalKitabHouseEntryDto>)

/** Mirrors backend/app/services/astrology/doshas.ts's KaalSarpDoshaResult. */
data class KaalSarpDoshaResultDto(
    val isKaalSarp: Boolean,
    val rahuRashi: String,
    val ketuRashi: String,
    val enclosedSide: String?,
)

/** Mirrors backend/app/services/astrology/doshas.ts's PitraDoshaResult. */
data class PitraDoshaResultDto(
    val isPitraDosha: Boolean,
    val reasons: List<String>,
    val sunRashi: String,
    val sunHouse: Int,
    val rahuHouse: Int,
    val ketuHouse: Int,
    val saturnHouse: Int,
    val ninthLord: String,
    val ninthLordRashi: String,
    val ninthLordHouse: Int,
)

/** Mirrors backend/app/services/astrology/doshas.ts's RahuKetuTransitResult. */
data class RahuKetuTransitResultDto(
    val moonRashi: String,
    val rahuTransitRashi: String,
    val ketuTransitRashi: String,
    val rahuHouseFromMoon: Int,
    val ketuHouseFromMoon: Int,
)

/** Mirrors backend/app/services/astrology/numerology.ts's NumerologyProfile. */
data class NumerologyProfileDto(
    val lifePathNumber: Int,
    val destinyNumber: Int,
    val soulUrgeNumber: Int,
    val personalityNumber: Int,
)

/** Mirrors backend/app/services/astrology/numerology.ts's NumerologyMatchResult. */
data class NumerologyMatchResultDto(
    val person1: NumerologyProfileDto,
    val person2: NumerologyProfileDto,
    val lifePathAffinity: String,
    val destinyAffinity: String,
    val soulUrgeAffinity: String,
)

/** Mirrors backend/app/services/astrology/flames.ts's FlamesOutcome. */
data class FlamesOutcomeDto(val result: String, val letter: String, val remainingCount: Int)

/** Mirrors backend/app/services/astrology/chineseZodiac.ts's ChineseZodiacResult. */
data class ChineseZodiacResultDto(val year: Int, val animal: String, val element: String, val label: String)

/** Mirrors backend/app/services/astrology/numerology.ts's PersonalNumerologyCycle. */
data class PersonalNumerologyCycleDto(val personalYear: Int, val personalMonth: Int, val personalDay: Int)

/** Mirrors backend/app/repositories/bannerRepository.ts's Banner — a
 * staff-uploaded homepage banner. mediaData is a base64 data: URL (same
 * storage the website's CampaignBanner reads directly into an <img src>). */
data class BannerDto(
    val id: String,
    val mediaType: String,
    val mediaData: String,
    val linkUrl: String?,
)

/** Mirrors backend/app/models/user.ts's PublicUser (never sends password_hash).
 * The birth_* fields are null until the account's own PATCH /me/birth-details
 * has been called at least once (e.g. by the onboarding wizard). */
data class PublicUserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val status: String,
    val phone_number: String?,
    val phone_verified: Boolean,
    val birth_date: String? = null,
    val birth_time: String? = null,
    val birth_place: String? = null,
    val birth_latitude: Double? = null,
    val birth_longitude: Double? = null,
    val birth_timezone_offset_minutes: Int? = null,
)

/** Mirrors authService.ts's `{ user, accessToken, refreshToken }` — the
 * shape both POST /api/auth/register and /login return. */
data class AuthResultDto(val user: PublicUserDto, val accessToken: String, val refreshToken: String)

/** Mirrors poojaRepository.ts's PoojaVideo — a recorded aarti/pooja video. */
data class PoojaVideoDto(
    val id: String,
    val title: String,
    val category: String,
    val videoUrl: String,
    val thumbnailUrl: String?,
)

/** Mirrors poojaService.ts's PoojaGroupSession. meetingUrl/registered are only
 * populated once join succeeds — the public list never carries meetingUrl. */
data class PoojaGroupSessionDto(
    val id: String,
    val title: String,
    val panditName: String,
    val scheduledAt: Long,
    val meetingUrl: String?,
    val pricePaise: Int?,
    val capacity: Int?,
    val registeredCount: Int = 0,
    val registered: Boolean = false,
)

/** Mirrors poojaRepository.ts's PoojaBook — an aarti/scripture library entry. */
data class PoojaBookDto(
    val id: String,
    val title: String,
    val author: String?,
    val category: String,
    val content: String?,
    val pdfUrl: String?,
    val coverImageUrl: String?,
)

/** Mirrors GET /api/payments/wallet's response. */
data class WalletBalanceDto(val balance: Int)

/** Mirrors POST /api/payments/orders's response — only one of
 * paymentSessionId (Cashfree) / redirectUrl (Razorpay) is ever present. */
data class PaymentOrderDto(
    val paymentId: String,
    val gateway: String,
    val paymentSessionId: String? = null,
    val redirectUrl: String? = null,
)

/** Mirrors GET /api/payments/orders/:id/status's response. */
data class PaymentStatusDto(val status: String, val purpose: String, val amount: Int)
