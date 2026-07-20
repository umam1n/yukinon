package com.yukinon.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(
    name = "MediaStoreScanner",
    permissions = {
        @Permission(alias = "mediaAudio",  strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage",     strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class MediaStoreScanner extends Plugin {

    private static final String TAG = "MediaStoreScanner";

    private static final Set<String> AUDIO_EXTENSIONS = new HashSet<>(Arrays.asList(
        "flac", "mp3", "aac", "m4a", "ogg", "opus", "wav", "wv", "ape", "mka", "mp4", "alac"
    ));

    // ─── helpers ─────────────────────────────────────────────────────────────

    private String resolveAbsolutePath(String folderPath) {
        String root = Environment.getExternalStorageDirectory().getAbsolutePath();
        if (folderPath == null || folderPath.isEmpty() || folderPath.equalsIgnoreCase("ROOT")) {
            return root + "/";
        }
        
        // Remove leading/trailing whitespace
        String cleanPath = folderPath.trim();
        
        // Handle paths starting with /android/ (case insensitive)
        if (cleanPath.toLowerCase().startsWith("/android/")) {
            cleanPath = cleanPath.substring(9); // remove "/android/"
        } else if (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }
        
        // Check if there is an exact case match first
        File exactFile = new File(root, cleanPath);
        if (exactFile.exists()) {
            String p = exactFile.getAbsolutePath();
            return p.endsWith("/") ? p : p + "/";
        }

        // If not found, try to resolve case-insensitively
        File resolved = resolveCaseInsensitive(new File(root), cleanPath);
        if (resolved != null && resolved.exists()) {
            String p = resolved.getAbsolutePath();
            return p.endsWith("/") ? p : p + "/";
        }

        // Fallback to exact
        String path = root + "/" + cleanPath;
        return path.endsWith("/") ? path : path + "/";
    }

    private File resolveCaseInsensitive(File parent, String relativePath) {
        String[] parts = relativePath.split("/");
        File current = parent;
        for (String part : parts) {
            if (part.isEmpty()) continue;
            File[] files = current.listFiles();
            if (files == null) return null;
            File match = null;
            for (File f : files) {
                if (f.getName().equalsIgnoreCase(part)) {
                    match = f;
                    break;
                }
            }
            if (match == null) return null;
            current = match;
        }
        return current;
    }

    private boolean isAudioFile(File f) {
        String name = f.getName();
        if (name.startsWith(".")) return false;
        int dot = name.lastIndexOf('.');
        if (dot < 0) return false;
        return AUDIO_EXTENSIONS.contains(name.substring(dot + 1).toLowerCase());
    }

    /** Recursively collect all audio files under `dir`. */
    private void walkAudio(File dir, List<File> out) {
        String name = dir.getName();
        if (name.equalsIgnoreCase("Android") || name.startsWith(".")) return;
        
        File[] children = dir.listFiles();
        if (children == null) return;
        
        for (File f : children) {
            if (f.isDirectory()) {
                walkAudio(f, out);
            } else if (f.isFile()) {
                if (isAudioFile(f)) {
                    out.add(f);
                }
            }
        }
    }

    // ─── main scan ───────────────────────────────────────────────────────────

    @PluginMethod
    public void scanAudioFiles(PluginCall call) {
        String folderPath = call.getString("folderPath", "");
        boolean isRootScan = (folderPath == null || folderPath.isEmpty() || folderPath.equalsIgnoreCase("ROOT"));
        String absPrefix  = resolveAbsolutePath(folderPath);
        // Only use a prefix filter if we are NOT scanning the entire storage
        String absPrefixLower = !isRootScan ? absPrefix.toLowerCase() : null;

        Log.d(TAG, "scanAudioFiles: folderPath=" + folderPath + " (isRoot=" + isRootScan + ") → absPrefix=" + absPrefix);

        // ── 1. Walk filesystem to find all files directly ──
        List<File> audioFiles = new ArrayList<>();
        File dir = new File(absPrefix);
        if (dir.exists() && dir.isDirectory()) {
            walkAudio(dir, audioFiles);
            Log.d(TAG, "Filesystem walk found " + audioFiles.size() + " audio files under " + absPrefix);

            if (!audioFiles.isEmpty()) {
                // Force MediaStore to index any files it missed asynchronously
                String[] paths = new String[audioFiles.size()];
                for (int i = 0; i < audioFiles.size(); i++) paths[i] = audioFiles.get(i).getAbsolutePath();
                try {
                    MediaScannerConnection.scanFile(getContext(), paths, null, null);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to call MediaScannerConnection: " + e.getMessage());
                }
            }
        } else {
            Log.w(TAG, "Directory does not exist or is not accessible: " + absPrefix);
        }

        // ── 2. Query MediaStore (quick & contains metadata database) ──
        ContentResolver cr = getContext().getContentResolver();
        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.DISPLAY_NAME,
        };

        Cursor cursor = null;
        try {
            cursor = cr.query(uri, projection, null, null, MediaStore.Audio.Media.TITLE + " ASC");
        } catch (Exception e) {
            Log.e(TAG, "MediaStore query failed: " + e.getMessage());
        }

        JSONArray tracks = new JSONArray();
        Set<String> addedPaths = new HashSet<>();

        if (cursor != null) {
            while (cursor.moveToNext()) {
                try {
                    String data = cursor.getString(5); // MediaStore.Audio.Media.DATA
                    if (data == null || data.isEmpty()) continue;

                    // Case-insensitive prefix filter
                    if (absPrefixLower != null && !data.toLowerCase().startsWith(absPrefixLower)) {
                        continue;
                    }

                    String displayName = cursor.getString(6);
                    String title  = cursor.getString(1);
                    String artist = cursor.getString(2);
                    String album  = cursor.getString(3);
                    int    durMs  = cursor.getInt(4);

                    if (title == null || title.trim().isEmpty()) {
                        String fn = (displayName != null && !displayName.isEmpty()) ? displayName
                            : data.substring(data.lastIndexOf("/") + 1);
                        title = fn.replaceFirst("[.][^.]+$", "");
                    }

                    // If MediaStore has no duration, try MediaMetadataRetriever (FLAC fix)
                    if (durMs == 0) {
                        try {
                            MediaMetadataRetriever mmr = new MediaMetadataRetriever();
                            mmr.setDataSource(data);
                            String durStr = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
                            if (durStr != null) durMs = Integer.parseInt(durStr);
                            if (title == null || title.trim().isEmpty()) {
                                String t = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
                                if (t != null && !t.trim().isEmpty()) title = t;
                            }
                            if (isBlankOrUnknown(artist)) {
                                String a = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
                                if (a != null && !a.trim().isEmpty()) artist = a;
                            }
                            if (isBlankOrUnknown(album)) {
                                String al = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM);
                                if (al != null && !al.trim().isEmpty()) album = al;
                            }
                            mmr.release();
                        } catch (Exception ignored) {}
                    }

                    JSObject track = new JSObject();
                    track.put("id",       "media_" + cursor.getString(0));
                    track.put("title",    title);
                    track.put("artist",   isBlankOrUnknown(artist) ? "Unknown Artist" : artist);
                    track.put("album",    isBlankOrUnknown(album)  ? "Unknown Album"  : album);
                    track.put("duration", durMs / 1000);
                    track.put("path",     "file://" + data);
                    track.put("source",   "local");
                    track.put("isFavorite", false);
                    track.put("playCount", 0);
                    tracks.put(track);
                    addedPaths.add(data.toLowerCase());
                } catch (Exception e) {
                    Log.w(TAG, "Skipping MediaStore row: " + e.getMessage());
                }
            }
            cursor.close();
        }

        // ── 3. Merge direct filesystem files that MediaStore missed (failsafe) ──
        int fsMerged = 0;
        if (!audioFiles.isEmpty()) {
            MediaMetadataRetriever mmr = new MediaMetadataRetriever();
            for (File f : audioFiles) {
                String path = f.getAbsolutePath();
                if (addedPaths.contains(path.toLowerCase())) {
                    continue; // Already added from MediaStore
                }

                try {
                    mmr.setDataSource(path);
                    String title = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
                    String artist = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
                    String album = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM);
                    String durStr = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);

                    if (title == null || title.trim().isEmpty()) {
                        title = f.getName().replaceFirst("[.][^.]+$", "");
                    }
                    if (isBlankOrUnknown(artist)) {
                        artist = "Unknown Artist";
                    }
                    if (isBlankOrUnknown(album)) {
                        album = "Unknown Album";
                    }
                    int duration = 0;
                    if (durStr != null) {
                        duration = Integer.parseInt(durStr) / 1000;
                    }

                    JSObject track = new JSObject();
                    track.put("id",       "fs_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 10000));
                    track.put("title",    title);
                    track.put("artist",   artist);
                    track.put("album",    album);
                    track.put("duration", duration);
                    track.put("path",     "file://" + path);
                    track.put("source",   "local");
                    track.put("isFavorite", false);
                    track.put("playCount", 0);

                    tracks.put(track);
                    addedPaths.add(path.toLowerCase());
                    fsMerged++;
                } catch (Exception e) {
                    // Fallback to filename-based track if metadata reading fails
                    try {
                        JSObject track = new JSObject();
                        track.put("id",       "fs_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 10000));
                        track.put("title",    f.getName().replaceFirst("[.][^.]+$", ""));
                        track.put("artist",   "Unknown Artist");
                        track.put("album",    "Unknown Album");
                        track.put("duration", 0);
                        track.put("path",     "file://" + path);
                        track.put("source",   "local");
                        track.put("isFavorite", false);
                        track.put("playCount", 0);

                        tracks.put(track);
                        addedPaths.add(path.toLowerCase());
                        fsMerged++;
                    } catch (Exception ignored) {}
                }
            }
            try { mmr.release(); } catch (Exception ignored) {}
        }

        Log.d(TAG, "scanAudioFiles done. total=" + tracks.length() + " (merged from FS=" + fsMerged + ")");

        JSObject response = new JSObject();
        response.put("tracks",         tracks);
        response.put("total",          tracks.length());
        
        // Debugging / Diagnostics metadata
        response.put("resolvedPath", absPrefix);
        response.put("exists", dir.exists());
        response.put("isDirectory", dir.isDirectory());
        response.put("isManager", android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R
            && Environment.isExternalStorageManager());
        response.put("fsMergedCount", fsMerged);

        // List contents of Music folder for debugging
        File musicDir = new File(Environment.getExternalStorageDirectory(), "Music");
        JSONArray musicDirContents = new JSONArray();
        try {
            File[] mFiles = musicDir.listFiles();
            if (mFiles != null) {
                for (File f : mFiles) {
                    musicDirContents.put(f.getName() + " (" + (f.isDirectory() ? "dir" : "file") + ")");
                }
            } else {
                musicDirContents.put("null (empty or no read permission)");
            }
        } catch (Exception e) {
            musicDirContents.put("error: " + e.getMessage());
        }
        response.put("musicDirContents", musicDirContents);

        // List contents of resolved path
        JSONArray resolvedPathContents = new JSONArray();
        try {
            File[] rFiles = dir.listFiles();
            if (rFiles != null) {
                for (File f : rFiles) {
                    resolvedPathContents.put(f.getName() + " (" + (f.isDirectory() ? "dir" : "file") + ")");
                }
            } else {
                resolvedPathContents.put("null");
            }
        } catch (Exception e) {
            resolvedPathContents.put("error: " + e.getMessage());
        }
        response.put("resolvedPathContents", resolvedPathContents);

        call.resolve(response);
    }

    // ─── debug ───────────────────────────────────────────────────────────────

    @PluginMethod
    public void debugPaths(PluginCall call) {
        ContentResolver cr = getContext().getContentResolver();
        String[] proj = {
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.RELATIVE_PATH,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.MIME_TYPE,
        };
        JSONArray results = new JSONArray();
        try (Cursor cursor = cr.query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, proj, null, null,
                MediaStore.Audio.Media.DATE_ADDED + " DESC")) {
            int count = 0;
            if (cursor != null) {
                int total = cursor.getCount();
                while (cursor.moveToNext() && count < 30) {
                    JSONObject e = new JSONObject();
                    e.put("data",          cursor.getString(0));
                    e.put("relative_path", cursor.getString(1));
                    e.put("name",          cursor.getString(2));
                    e.put("mime",          cursor.getString(3));
                    results.put(e);
                    count++;
                }
                JSObject response = new JSObject();
                response.put("total",   total);
                response.put("samples", results);
                call.resolve(response);
                return;
            }
        } catch (Exception e) {
            call.reject("debugPaths failed: " + e.getMessage());
            return;
        }
        call.reject("No cursor");
    }

    // ─── MANAGE_EXTERNAL_STORAGE (Android 11+) ───────────────────────────────

    @PluginMethod
    public void checkManageStorage(PluginCall call) {
        JSObject r = new JSObject();
        r.put("isManager", android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R
            && Environment.isExternalStorageManager());
        call.resolve(r);
    }

    @PluginMethod
    public void requestManageStorage(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R
                && !Environment.isExternalStorageManager()) {
            Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            getContext().startActivity(i);
        }
        call.resolve();
    }

    private boolean isBlankOrUnknown(String s) {
        return s == null || s.trim().isEmpty() || s.trim().equals("<unknown>");
    }
}
