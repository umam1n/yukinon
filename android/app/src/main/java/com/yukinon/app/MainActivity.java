package com.yukinon.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaStoreScanner.class);
        registerPlugin(PlaybackServicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
