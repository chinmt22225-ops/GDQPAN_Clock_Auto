package vn.gdqpan.app;

import android.app.*;
import android.content.Intent;
import android.media.*;
import android.os.*;
import android.speech.tts.*;
import org.json.JSONObject;
import java.io.*;
import java.util.*;

public class AlarmPlaybackService extends Service {
    public static volatile boolean playing = false;
    public static volatile boolean running = false;
    public static volatile String currentTitle = "";
    private final ArrayDeque<JSONObject> queue = new ArrayDeque<>();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private TextToSpeech tts;
    private boolean ttsReady = false, ttsFailed = false, active = false;
    private Runnable waitingSpeech;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private PowerManager.WakeLock wakeLock;
    private int generation = 0;
    private boolean resumeVtv = false;
    private JSONObject current;
    private static final String CHANNEL = "gdqpan-alarm-playback";

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Báo thức GDQPAN", NotificationManager.IMPORTANCE_HIGH);
            channel.setSound(null, null);
            channel.setDescription("Điều khiển âm thanh báo thức đang phát");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        wakeLock = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GDQPAN:AlarmPlayback");
        wakeLock.acquire(15 * 60 * 1000L);
        tts = new TextToSpeech(this, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            ttsFailed = !ttsReady;
            if (ttsReady) {
                ttsFailed = tts.setLanguage(new Locale("vi", "VN")) < 0;
                ttsReady = !ttsFailed;
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    public void onStart(String id) {}
                    public void onDone(String id) {
                        handler.post(() -> {
                            if (id.equals("alarm-" + generation)) {
                                finishSpeech();
                            }
                        });
                    }
                    public void onError(String id) {
                        handler.post(() -> {
                            if (id.equals("alarm-" + generation)) {
                                AlarmStore.log(AlarmPlaybackService.this, "Lỗi giọng đọc", currentTitle);
                                finishSpeech();
                            }
                        });
                    }
                });
            }
            if (waitingSpeech != null) {
                Runnable r = waitingSpeech;
                waitingSpeech = null;
                r.run();
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if ("STOP".equals(action)) {
            queue.clear();
            finishCurrent();
            return START_NOT_STICKY;
        }
        if ("SNOOZE".equals(action)) {
            if (current != null) {
                AlarmStore.snooze(this, current, 5 * 60 * 1000L);
            }
            finishCurrent();
            return START_NOT_STICKY;
        }
        if (!RuntimePolicy.alarmAllowed(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            JSONObject s = new JSONObject(intent.getStringExtra("schedule"));
            queue.add(s);
            startForeground(4101, notification(active ? currentTitle : s.optString("action", "Báo thức")));
            if (!active) playNext();
        } catch (Exception e) {
            AlarmStore.log(this, "Lỗi báo thức", e.toString());
            if (!active) stopSelf();
        }
        return START_NOT_STICKY;
    }

    private Notification notification(String title) {
        PendingIntent open = PendingIntent.getActivity(this, 4101,
                new Intent(this, AlarmActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1,
                new Intent(this, AlarmPlaybackService.class).setAction("STOP"),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent snooze = PendingIntent.getService(this, 2,
                new Intent(this, AlarmPlaybackService.class).setAction("SNOOZE"),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("GDQPAN · Đang reo báo thức")
                .setContentText(title)
                .setContentIntent(open)
                .setFullScreenIntent(open, true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_MAX)
                .setCategory(Notification.CATEGORY_ALARM)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .addAction(android.R.drawable.ic_media_pause, "Dừng", stop)
                .addAction(android.R.drawable.ic_popup_sync, "Báo lại 5p", snooze)
                .build();
    }

    private void playNext() {
        do {
            current = queue.poll();
            if (current == null) {
                stopSelf();
                return;
            }
        } while (AlarmStore.isTemporary(current) &&
                !AlarmStore.temporaryDue(current, System.currentTimeMillis()));

        active = true;
        playing = false;
        generation++;
        currentTitle = current.optString("action", "Báo thức");
        getSystemService(NotificationManager.class).notify(4101, notification(currentTitle));
        if (VtvActivity.isOpen()) {
            resumeVtv = true;
            VtvActivity.control("pause");
        }
        if (!RuntimePolicy.alarmAllowed(this)) {
            finishCurrent();
            return;
        }
        playing = true;
        startCurrent(0);
    }

    private void startCurrent(int attempt) {
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
        int result;
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(change -> {
                        if (change == AudioManager.AUDIOFOCUS_LOSS) stopSelf();
                    })
                    .build();
            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result = audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
        if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            if (attempt < 20) {
                final int token = generation;
                handler.postDelayed(() -> {
                    if (active && token == generation) startCurrent(attempt + 1);
                }, 250);
                return;
            }
            AlarmStore.log(this, "Không thể lấy loa phát báo thức", currentTitle);
            finishCurrent();
            return;
        }

        AlarmStore.log(this, "Báo thức chạy nền: " + currentTitle,
                "Lúc " + new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(new Date()));

        final int token = generation;
        // Giới hạn an toàn 10 phút tự động tắt nếu không có người tắt máy
        handler.postDelayed(() -> {
            if (active && token == generation) {
                AlarmStore.log(this, "Tự động tắt báo thức sau 10 phút an toàn", currentTitle);
                finishCurrent();
            }
        }, 10 * 60 * 1000L);

        // Bước 1: Phát âm hiệu kèn/chuông mở đầu
        String file = current.optString("nativeFile", "");
        if (file.isEmpty()) file = defaultSound(currentTitle);

        final String textToSpeak = current.optString("text", "").trim();
        playFile(file, () -> {
            // Bước 2: Đọc giọng nói thông báo nếu có nội dung
            if (!textToSpeak.isEmpty()) {
                speakText(textToSpeak);
            } else {
                // Nếu không có nội dung đọc, chuyển thẳng sang Bước 3: Lặp chuông liên tục
                playLoopingAlarm();
            }
        });
    }

    private String defaultSound(String action) {
        switch (action) {
            case "Quốc ca không lời":
            case "Chào cờ":
                return "Sound/QUỐC CA VIỆT NAM (không lời) bản chính thức không dính bản quyền.mp3";
            case "Duyệt đội ngũ":
                return "Sound/Duyệt đội ngũ.mp3";
            case "Báo động":
            case "Phát khẩn cấp (Báo động)":
            case "Tập hợp khẩn cấp":
                return "Sound/báo động.mp3";
            case "Tập hợp":
                return "Sound/tập hợp.mp3";
            case "Báo thức":
                return "Sound/báo thức.mp3";
            case "Ăn":
            case "Báo đi ăn":
                return "Sound/báo đi ăn.mp3";
            case "Điểm danh":
                return "Sound/điểm danh.mp3";
            case "Ngủ":
            case "Báo đi ngủ":
                return "Sound/báo đi ngủ.mp3";
            case "Nhạc truyền thống Trung tâm":
                return "Sound/NHẠC TRUYỀN THỐNG TRUNG TÂM.m4a";
            default:
                // Luôn có âm thanh dự phòng chuẩn, không bao giờ để rỗng
                return "Sound/báo thức.mp3";
        }
    }

    private void playFile(String path, Runnable done) {
        final int token = generation;
        try {
            releasePlayer();
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            File file;
            if (path.startsWith("Sound/")) {
                file = new File(getCacheDir(), "alarm-" + Integer.toHexString(path.hashCode()) + ".audio");
                if (!file.exists() || file.length() == 0) {
                    try (InputStream in = getAssets().open("public/" + path);
                         OutputStream out = new FileOutputStream(file)) {
                        byte[] buffer = new byte[32768];
                        int n;
                        while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                    }
                }
            } else {
                file = new File(path);
                String base = new File(getFilesDir(), "schedule-audio").getCanonicalPath() + File.separator;
                if (!file.getCanonicalPath().startsWith(base)) {
                    throw new IOException("Đường dẫn âm thanh không hợp lệ");
                }
            }
            player.setDataSource(file.getAbsolutePath());
            float volume = (float) Math.max(0.3, Math.min(1.0, AlarmStore.settings(this).optDouble("volume", 0.9)));
            player.setVolume(volume, volume);
            player.setOnPreparedListener(mp -> {
                if (token == generation) mp.start();
            });
            player.setOnCompletionListener(mp -> {
                releasePlayer();
                if (token == generation && done != null) done.run();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                releasePlayer();
                if (token == generation) {
                    AlarmStore.log(this, "Lỗi âm thanh báo thức", path);
                    if (done != null) done.run();
                }
                return true;
            });
            player.prepareAsync();
        } catch (Exception e) {
            releasePlayer();
            AlarmStore.log(this, "Không thể mở âm thanh", path + ": " + e.getMessage());
            if (token == generation && done != null) done.run();
        }
    }

    private void speakText(String text) {
        if (text.trim().isEmpty()) {
            playLoopingAlarm();
            return;
        }
        String region = AlarmStore.settings(this).optString("region", "bac_nu");
        String phrase = phraseKey(text);
        String path = "Sound/ai_voices/" + phrase + "_" + region + ".mp3";
        if (!phrase.isEmpty()) {
            try (InputStream check = getAssets().open("public/" + path)) {
                playFile(path, this::finishSpeech);
                return;
            } catch (IOException ignored) {}
        }
        final int token = generation;
        Runnable speech = () -> {
            if (token != generation) return;
            if (ttsFailed) {
                AlarmStore.log(this, "Thiếu giọng đọc tiếng Việt", text);
                playLoopingAlarm();
                return;
            }
            tts.setSpeechRate((float) AlarmStore.settings(this).optDouble("rate", 1));
            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (float) AlarmStore.settings(this).optDouble("volume", 0.9));
            if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "alarm-" + token) == TextToSpeech.ERROR) {
                AlarmStore.log(this, "Không thể đọc thông báo", text);
                playLoopingAlarm();
            }
        };
        if (ttsReady || ttsFailed) {
            speech.run();
        } else {
            waitingSpeech = speech;
            handler.postDelayed(() -> {
                if (waitingSpeech == speech) {
                    waitingSpeech = null;
                    AlarmStore.log(this, "Giọng đọc không khởi tạo được", text);
                    playLoopingAlarm();
                }
            }, 8000);
        }
    }

    // Bước 3: Sau khi đọc xong thông báo, chuyển sang chế độ reo chuông lặp lại liên tục giống báo thức điện thoại
    private void finishSpeech() {
        playLoopingAlarm();
    }

    private void playLoopingAlarm() {
        final int token = generation;
        if (!active || token != generation) return;
        AlarmStore.log(this, "Reo chuông báo thức liên tục", currentTitle);
        String alarmSound = "Sound/báo thức.mp3";
        try {
            releasePlayer();
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            File file = new File(getCacheDir(), "alarm-" + Integer.toHexString(alarmSound.hashCode()) + ".audio");
            if (!file.exists() || file.length() == 0) {
                try (InputStream in = getAssets().open("public/" + alarmSound);
                     OutputStream out = new FileOutputStream(file)) {
                    byte[] buffer = new byte[32768];
                    int n;
                    while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                }
            }
            player.setDataSource(file.getAbsolutePath());
            player.setLooping(true); // Lặp lại liên tục cho tới khi người dùng bấm Dừng hoặc Báo lại
            float volume = (float) Math.max(0.3, Math.min(1.0, AlarmStore.settings(this).optDouble("volume", 0.9)));
            player.setVolume(volume, volume);
            player.setOnPreparedListener(mp -> {
                if (token == generation) mp.start();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                releasePlayer();
                return true;
            });
            player.prepareAsync();
        } catch (Exception e) {
            AlarmStore.log(this, "Lỗi lặp chuông báo thức", e.getMessage());
        }
    }

    private String phraseKey(String text) {
        String q = text.toLowerCase(Locale.ROOT);
        String[][] patterns = {
                {"thể dục sáng", "tmpl_theducsang"},
                {"chuẩn bị làm việc", "tmpl_chuanbi"},
                {"nghỉ giải lao", "tmpl_nghigiailao"},
                {"hết giờ giải lao", "tmpl_hetgiailao"},
                {"hết giờ làm việc", "tmpl_hetlamviec"},
                {"ăn sáng", "ansang"},
                {"ăn trưa", "antrua"},
                {"ăn chiều", "anchieu"},
                {"nghỉ trưa", "nghitrua"},
                {"tập hợp", "taphop"},
                {"điểm danh", "diemdanh"},
                {"tắt đèn", "baongu"},
                {"đi ngủ", "baongu"},
                {"báo thức", "baothuc"},
                {"báo động", "baodong"}
        };
        for (String[] p : patterns) {
            if (q.contains(p[0])) return p[1];
        }
        return "";
    }

    private void releasePlayer() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {}
            try {
                player.release();
            } catch (Exception ignored) {}
            player = null;
        }
    }

    private void finishCurrent() {
        generation++;
        releasePlayer();
        waitingSpeech = null;
        active = false;
        playNext();
    }

    @Override
    public void onDestroy() {
        generation++;
        handler.removeCallbacksAndMessages(null);
        queue.clear();
        releasePlayer();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (resumeVtv && RuntimePolicy.allowed(this)) {
            VtvActivity.control("resume");
        }
        playing = false;
        running = false;
        currentTitle = "";
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
