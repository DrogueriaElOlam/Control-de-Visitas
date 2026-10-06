package com.drogueriaelolam.controlvisitas;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Servicio en Primer Plano para Monitoreo Satelital en Segundo Plano
 * Droguería El Olam.
 * 
 * Mantiene la antena GPS activa y recolecta coordenadas periódicamente durante la jornada laboral
 * incluso con la pantalla apagada o con la aplicación minimizada.
 */
public class LocationService extends Service implements LocationListener {

    private static final String CHANNEL_ID = "el_olam_location_channel";
    private static final int NOTIFICATION_ID = 2001;

    // Intervalo de captura: 2 minutos y 40 metros de desplazamiento
    private static final long MIN_TIME_MS = 120000;
    private static final float MIN_DISTANCE_M = 40.0f;

    private LocationManager locationManager;

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

        double lat = location.getLatitude();
        double lng = location.getLongitude();
        float accuracy = location.getAccuracy();
        float speed = location.getSpeed();

        // Enviar la posición capturada a la MainActivity / WebView si está activa
        MainActivity.onBackgroundLocationReceived(lat, lng, accuracy, speed);
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
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
