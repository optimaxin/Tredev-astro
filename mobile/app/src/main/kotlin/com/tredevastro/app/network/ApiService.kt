package com.tredevastro.app.network

import com.tredevastro.app.network.dto.ApiEnvelope
import com.tredevastro.app.network.dto.AstrologerDto
import com.tredevastro.app.network.dto.BabyNameResultDto
import com.tredevastro.app.network.dto.BannerDto
import com.tredevastro.app.network.dto.ChineseZodiacResultDto
import com.tredevastro.app.network.dto.DailyHoroscopeDto
import com.tredevastro.app.network.dto.FlamesOutcomeDto
import com.tredevastro.app.network.dto.GeocodeDto
import com.tredevastro.app.network.dto.HoroscopePeriodDto
import com.tredevastro.app.network.dto.KaalSarpDoshaResultDto
import com.tredevastro.app.network.dto.KundliFullDto
import com.tredevastro.app.network.dto.KundliMatchingReportDto
import com.tredevastro.app.network.dto.LalKitabResultDto
import com.tredevastro.app.network.dto.LuckyAttributesDto
import com.tredevastro.app.network.dto.NakshatraResultDto
import com.tredevastro.app.network.dto.AuthResultDto
import com.tredevastro.app.network.dto.NumerologyMatchResultDto
import com.tredevastro.app.network.dto.NumerologyProfileDto
import com.tredevastro.app.network.dto.PanchangDto
import com.tredevastro.app.network.dto.PaymentOrderDto
import com.tredevastro.app.network.dto.PaymentStatusDto
import com.tredevastro.app.network.dto.PersonalNumerologyCycleDto
import com.tredevastro.app.network.dto.PitraDoshaResultDto
import com.tredevastro.app.network.dto.PlaceSuggestionDto
import com.tredevastro.app.network.dto.PoojaBookDto
import com.tredevastro.app.network.dto.PoojaGroupSessionDto
import com.tredevastro.app.network.dto.PoojaVideoDto
import com.tredevastro.app.network.dto.PublicAstrologerStateDto
import com.tredevastro.app.network.dto.PublicUserDto
import com.tredevastro.app.network.dto.RahuKetuTransitResultDto
import com.tredevastro.app.network.dto.SadeSatiDto
import com.tredevastro.app.network.dto.WalletBalanceDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class BirthDetailsBody(
    val date: String, // YYYY-MM-DD
    val time: String, // HH:MM (24h)
    val timezoneOffsetMinutes: Int,
    val latitude: Double,
    val longitude: Double,
)

data class PanchangBody(val date: String, val latitude: Double, val longitude: Double)

data class HoroscopeBody(val rashi: String)

data class HoroscopePeriodBody(val rashi: String, val period: String)

data class KundliMatchingBody(val bride: BirthDetailsBody, val groom: BirthDetailsBody)

data class NameDateBody(val name: String, val date: String)

data class NumerologyMatchBody(val person1: NameDateBody, val person2: NameDateBody)

data class FlamesBody(val name1: String, val name2: String)

data class ChineseZodiacBody(val year: Int)

data class DateOnlyBody(val date: String)

data class RegisterBody(val name: String, val email: String, val password: String, val phoneNumber: String)

data class LoginBody(val email: String, val password: String)

data class FirebaseLoginBody(val idToken: String)

data class WalletRechargeBody(val amount: Int, val purpose: String = "WALLET_RECHARGE")

data class NamePatchBody(val name: String)

/** Mirrors auth.routes.ts's birthDetailsSchema exactly (field names and all)
 * — the real account-level persistence the onboarding wizard writes to,
 * distinct from BirthDetailsBody above (which is per-calculator-call only,
 * has no birthPlace, and is never saved to the account). */
data class BirthDetailsPatchBody(
    val birthDate: String, // YYYY-MM-DD
    val birthTime: String, // HH:MM
    val birthPlace: String,
    val birthLatitude: Double,
    val birthLongitude: Double,
    val birthTimezoneOffsetMinutes: Int,
)

/** Talks to the real TredevaAstro backend — see the backend's app/api
 * routes files for the server side of every one of these. */
interface ApiService {
    @GET("api/astrologers/catalog")
    suspend fun getAstrologers(
        @Query("limit") limit: Int = 50,
        @Query("sort") sort: String = "rating",
        @Query("category") category: String? = null,
        @Query("consultationType") consultationType: String? = null,
    ): ApiEnvelope<List<AstrologerDto>>

    // Not ApiEnvelope-wrapped — mirrors the raw array res.json(...) backend's
    // routes.ts returns for this one public feed.
    @GET("api/banners/active")
    suspend fun getActiveBanners(): List<BannerDto>

    // Live presence — same public, no-auth feed the website polls/sockets
    // for astrologer online/busy/offline status (see realtimeStore.ts).
    // Raw array, same as getActiveBanners() above.
    @GET("api/astrologers")
    suspend fun getAstrologerStates(): List<PublicAstrologerStateDto>

    @GET("api/calculators/geocode")
    suspend fun geocode(@Query("place") place: String): ApiEnvelope<GeocodeDto>

    @GET("api/calculators/place-suggest")
    suspend fun placeSuggest(@Query("q") query: String): ApiEnvelope<List<PlaceSuggestionDto>>

    @GET("api/calculators/place-resolve")
    suspend fun resolvePlace(@Query("placeId") placeId: String): ApiEnvelope<GeocodeDto>

    @POST("api/calculators/kundli-full")
    suspend fun getKundliFull(@Body body: BirthDetailsBody): ApiEnvelope<KundliFullDto>

    @POST("api/calculators/panchang")
    suspend fun getPanchang(@Body body: PanchangBody): ApiEnvelope<PanchangDto>

    @POST("api/calculators/daily-horoscope")
    suspend fun getDailyHoroscope(@Body body: HoroscopeBody): ApiEnvelope<DailyHoroscopeDto>

    @POST("api/calculators/horoscope-period")
    suspend fun getHoroscopePeriod(@Body body: HoroscopePeriodBody): ApiEnvelope<HoroscopePeriodDto>

    @POST("api/calculators/sade-sati")
    suspend fun getSadeSati(@Body body: BirthDetailsBody): ApiEnvelope<SadeSatiDto>

    @POST("api/calculators/kundli-matching")
    suspend fun getKundliMatching(@Body body: KundliMatchingBody): ApiEnvelope<KundliMatchingReportDto>

    @POST("api/calculators/nakshatra")
    suspend fun getNakshatra(@Body body: BirthDetailsBody): ApiEnvelope<NakshatraResultDto>

    @POST("api/calculators/lucky")
    suspend fun getLucky(@Body body: BirthDetailsBody): ApiEnvelope<LuckyAttributesDto>

    @POST("api/calculators/baby-name")
    suspend fun getBabyName(@Body body: BirthDetailsBody): ApiEnvelope<BabyNameResultDto>

    @POST("api/calculators/lal-kitab")
    suspend fun getLalKitab(@Body body: BirthDetailsBody): ApiEnvelope<LalKitabResultDto>

    @POST("api/calculators/kaal-sarp-dosha")
    suspend fun getKaalSarpDosha(@Body body: BirthDetailsBody): ApiEnvelope<KaalSarpDoshaResultDto>

    @POST("api/calculators/pitra-dosha")
    suspend fun getPitraDosha(@Body body: BirthDetailsBody): ApiEnvelope<PitraDoshaResultDto>

    @POST("api/calculators/rahu-ketu-transit")
    suspend fun getRahuKetuTransit(@Body body: BirthDetailsBody): ApiEnvelope<RahuKetuTransitResultDto>

    @POST("api/calculators/numerology")
    suspend fun getNumerology(@Body body: NameDateBody): ApiEnvelope<NumerologyProfileDto>

    @POST("api/calculators/numerology-match")
    suspend fun getNumerologyMatch(@Body body: NumerologyMatchBody): ApiEnvelope<NumerologyMatchResultDto>

    @POST("api/calculators/flames")
    suspend fun getFlames(@Body body: FlamesBody): ApiEnvelope<FlamesOutcomeDto>

    @POST("api/calculators/chinese-zodiac")
    suspend fun getChineseZodiac(@Body body: ChineseZodiacBody): ApiEnvelope<ChineseZodiacResultDto>

    @POST("api/calculators/numerology-horoscope")
    suspend fun getNumerologyHoroscope(@Body body: DateOnlyBody): ApiEnvelope<PersonalNumerologyCycleDto>

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterBody): ApiEnvelope<AuthResultDto>

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginBody): ApiEnvelope<AuthResultDto>

    @POST("api/auth/firebase")
    suspend fun loginWithFirebase(@Body body: FirebaseLoginBody): ApiEnvelope<AuthResultDto>

    @GET("api/auth/me")
    suspend fun getMe(): ApiEnvelope<PublicUserDto>

    @PATCH("api/auth/me/name")
    suspend fun updateMyName(@Body body: NamePatchBody): ApiEnvelope<PublicUserDto>

    @PATCH("api/auth/me/birth-details")
    suspend fun updateMyBirthDetails(@Body body: BirthDetailsPatchBody): ApiEnvelope<PublicUserDto>

    // Pooja hub — same un-enveloped raw-array routes as getActiveBanners()
    // above (see poojaService.ts's comment on the backend's '/pooja/*').
    @GET("api/pooja/videos")
    suspend fun getPoojaVideos(): List<PoojaVideoDto>

    @GET("api/pooja/sessions")
    suspend fun getPoojaSessions(): List<PoojaGroupSessionDto>

    @GET("api/pooja/books")
    suspend fun getPoojaBooks(): List<PoojaBookDto>

    @POST("api/pooja/sessions/{id}/join")
    suspend fun joinPoojaSession(@Path("id") id: String): PoojaGroupSessionDto

    @GET("api/payments/wallet")
    suspend fun getWalletBalance(): ApiEnvelope<WalletBalanceDto>

    @POST("api/payments/orders")
    suspend fun createWalletRechargeOrder(@Body body: WalletRechargeBody): ApiEnvelope<PaymentOrderDto>

    @GET("api/payments/orders/{id}/status")
    suspend fun getPaymentStatus(@Path("id") id: String): ApiEnvelope<PaymentStatusDto>
}
