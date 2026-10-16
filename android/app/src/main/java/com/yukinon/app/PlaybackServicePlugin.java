package com.yukinon.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlaybackService")
public class PlaybackServicePlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        String title = call.getString("title", "Yukinon");
        String artist = call.getString("artist", "Playing audio");

        Context ctx = getContext();
        Intent serviceIntent = new Intent(ctx, PlaybackForegroundService.class);
        serviceIntent.putExtra("title", title);
        serviceIntent.putExtra("artist", artist);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(serviceIntent);
            } else {
                ctx.startService(serviceIntent);
            }
        } catch (Exception ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context ctx = getContext();
        Intent serviceIntent = new Intent(ctx, PlaybackForegroundService.class);
        try {
            ctx.stopService(serviceIntent);
        } catch (Exception ignored) {}
        call.resolve();
    }
}
