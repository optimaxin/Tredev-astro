package com.tredevastro.app.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.tredevastro.app.MainActivity
import com.tredevastro.app.R
import java.util.concurrent.TimeUnit
import kotlin.random.Random

private const val CHANNEL_ID = "promotions"
private const val WORK_NAME = "promo_notification_chain"

// ponytail: fixed 5-minute cadence for now, per explicit ask ("abhi ke liye
// har 5 min"); swap to a longer interval (or a real PeriodicWorkRequest,
// whose Android-enforced floor is 15 min) once the promo cadence is decided.
private val INTERVAL_MINUTES = 5L

private val MESSAGES = listOf(
    "आज का मुफ्त कुंडली पढ़ें — अपनी राशि जानें ✨" to "Read today's free Kundli — know your rashi",
    "आपकी राशि के लिए आज का राशिफल तैयार है" to "Today's horoscope for your sign is ready",
    "एक ज्योतिषी से अभी बात करें — पहला मिनट मुफ्त" to "Talk to an astrologer now — first minute free",
    "आज का पंचांग देखें — शुभ मुहूर्त जानें" to "Check today's Panchang — find the auspicious time",
)

/** Posts one promotional notification, then re-enqueues itself to fire again
 * in [INTERVAL_MINUTES] — a self-chaining OneTimeWorkRequest, since
 * PeriodicWorkRequest can't go below a 15-minute interval on Android. */
class PromoNotificationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        showNotification(applicationContext)
        scheduleNext(applicationContext)
        return Result.success()
    }
}

private fun showNotification(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Promotions", NotificationManager.IMPORTANCE_DEFAULT),
        )
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        return
    }

    val (hindi, english) = MESSAGES.random()
    val openAppIntent = android.content.Intent(context, MainActivity::class.java)
        .setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val pendingIntent = android.app.PendingIntent.getActivity(
        context, 0, openAppIntent,
        android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_launcher_foreground)
        .setContentTitle(hindi)
        .setContentText(english)
        .setAutoCancel(true)
        .setContentIntent(pendingIntent)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    manager.notify(Random.nextInt(), notification)
}

private fun scheduleNext(context: Context) {
    val request = OneTimeWorkRequestBuilder<PromoNotificationWorker>()
        .setInitialDelay(INTERVAL_MINUTES, TimeUnit.MINUTES)
        .build()
    WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request)
}

/** Call once (MainActivity.onCreate) to start the repeating chain — a no-op
 * if it's already running, since enqueueUniqueWork with KEEP skips the
 * duplicate instead of resetting the timer on every app open. */
fun startPromoNotifications(context: Context) {
    val request = OneTimeWorkRequestBuilder<PromoNotificationWorker>()
        .setInitialDelay(INTERVAL_MINUTES, TimeUnit.MINUTES)
        .build()
    WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request)
}
