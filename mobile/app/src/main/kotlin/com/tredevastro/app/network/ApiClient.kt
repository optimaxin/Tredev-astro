package com.tredevastro.app.network

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    /** The live TredevaAstro backend — same one the website talks to
     * (see web/frontend/src/services/apiUrl.ts). */
    const val BASE_URL = "https://tredev-astro-backend.onrender.com/"

    val service: ApiService by lazy {
        val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        val authInterceptor = okhttp3.Interceptor { chain ->
            val token = TokenStore.accessToken
            val request = if (token != null) {
                chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            // Render's free tier spins the backend down after ~15 min idle —
            // the first request after that can take 30-50s to cold-start.
            // 20s was too tight and made every first call look "broken."
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(ApiService::class.java)
    }
}
