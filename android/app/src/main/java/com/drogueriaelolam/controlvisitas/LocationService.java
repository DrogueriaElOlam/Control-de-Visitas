package com.drogueriaelolam.controlvisitas;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.SystemClock;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio en Primer Plano para Monitoreo Satelital en Segundo Plano
 * Droguería El Olam.
 * 
 * Funcionalidades clave:
 * 1. Mantiene el GPS activo en segundo plano durante toda la jornada.
 * 2. Si el usuario intenta cerrar la app de recientes, onTaskRemoved reprograma
 *    el servicio de inmediato mediante AlarmManager.
 * 3. Envío autónomo directo a Supabase sin depender de que la pantalla esté abierta.
 */
public class LocationService extends Service implements LocationListener {

    private static final String CHANNEL_ID = "el_olam_location_channel";
    private static final int NOTIFICATION_ID = 2001;

    // Configuración de conexión directa a Supabase (tabla activa en la nube)
    private static final String SUPABASE_URL = "https://zqwjhmiavxhswgbgejzx.supabase.co/rest/v1/daily_supervision_history";
    private static final String SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd2pobWlhdnhoc3dnYmdlanp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzQ5MTEsImV4cCI6MjA3OTg1MDkxMX0.-FdEjQyGmuM6DVt58ciFmQoTzMKdvYW6prXHRp57UsQ";

    // Intervalo de captura en movimiento: 1 minuto y 15 metros de desplazamiento
    private static final long MIN_TIME_MS = 60000;
    private static final float MIN_DISTANCE_M = 15.0f;

    private LocationManager locationManager;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForegroundWithNotification();
        startLocationUpdates();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Servicio de Monitoreo El Olam",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantiene activa la sincronización del sistema en campo");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundWithNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Droguería El Olam")
                .setContentText("Sistema de campo activo en jornada")
                .setSmallIcon(R.drawable.app_logo)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) return;

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        MIN_TIME_MS,
                        MIN_DISTANCE_M,
                        this
                );
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        MIN_TIME_MS,
                        MIN_DISTANCE_M,
                        this
                );
            }
        } catch (SecurityException e) {
            // Permiso no disponible aún
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;

        final double lat = location.getLatitude();
        final double lng = location.getLongitude();
        final float accuracy = location.getAccuracy();
        final float speed = location.getSpeed();

        // 1. Enviar a la pantalla activa (WebView) si está abierta
        MainActivity.onBackgroundLocationReceived(lat, lng, accuracy, speed);

        // 2. Enviar de forma autónoma directa a Supabase en segundo plano
        networkExecutor.execute(() -> sendLocationDirectlyToSupabase(lat, lng, accuracy, speed));
    }

    /**
     * Envía las coordenadas directamente a Supabase mediante conexión HTTP nativa.
     * Funciona aunque la aplicación esté cerrada en la multitarea.
     */
    private void sendLocationDirectlyToSupabase(double lat, double lng, float accuracy, float speed) {
        try {
            SharedPreferences prefs = getSharedPreferences("olam_tracking_prefs", MODE_PRIVATE);
            String vendorName = prefs.getString("vendor_name", "");
            String vendorRoute = prefs.getString("vendor_route", "");

            if (vendorName == null || vendorName.trim().isEmpty()) {
                return; // Si el vendedor aún no ha iniciado sesión, esperar
            }

            int batteryLevel = getBatteryPercentage();
            int speedKmH = Math.round(speed * 3.6f);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());

            String jsonPayload = String.format(Locale.US,
                    "{\"date\":\"%s\",\"datos\":{\"tipo\":\"gps_ping\",\"vendor_name\":\"%s\",\"route\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"accuracy\":%f,\"speed\":%d,\"battery_level\":%d,\"tracking_date\":\"%s\"}}",
                    todayStr,
                    escapeJson(vendorName),
                    escapeJson(vendorRoute),
                    lat,
                    lng,
                    accuracy,
                    speedKmH,
                    batteryLevel,
                    todayStr
            );

            URL url = new URL(SUPABASE_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
            conn.setRequestProperty("Prefer", "return=minimal");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            conn.disconnect();
        } catch (Exception ignored) {
            // Silencioso para no interferir en el dispositivo
        }
    }

    private int getBatteryPercentage() {
        try {
            BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
            if (bm != null) {
                return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            }
        } catch (Exception ignored) {}
        return 100;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"");
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // Cuando el usuario desliza la ventana para cerrarla en la multitarea:
        // Se programa un reinicio inmediato en 1.5 segundos mediante AlarmManager
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), LocationService.class);
            restartServiceIntent.setPackage(getPackageName());
            PendingIntent restartPendingIntent = PendingIntent.getService(
                    getApplicationContext(),
                    1003,
                    restartServiceIntent,
                    PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                alarmService.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 1500,
                        restartPendingIntent
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {}
        }
        networkExecutor.shutdown();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
