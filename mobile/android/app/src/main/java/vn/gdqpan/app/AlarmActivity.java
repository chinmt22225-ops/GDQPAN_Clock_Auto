package vn.gdqpan.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Giao diện báo thức toàn màn hình hiển thị trên màn hình khóa. */
public class AlarmActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView clock, title, status;
    private final Runnable refresh = new Runnable() {
        public void run() {
            if (!AlarmPlaybackService.running) {
                finish();
                return;
            }
            if (!AlarmPlaybackService.currentTitle.isEmpty()) {
                title.setText(AlarmPlaybackService.currentTitle);
            }
            clock.setText(new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date()));
            handler.postDelayed(this, 500);
        }
    };

    @Override
    public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.rgb(7, 54, 43));
        getWindow().setNavigationBarColor(Color.rgb(7, 54, 43));

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(24), dp(36), dp(24), dp(36));
        root.setBackgroundColor(Color.rgb(7, 54, 43));
        root.setFitsSystemWindows(true);

        TextView brand = text("TRUNG TÂM GDQP&AN - ĐHQG-HCM", 18, Color.rgb(255, 214, 81), true);
        root.addView(brand, layout(48));

        clock = text("", 52, Color.rgb(255, 214, 81), true);
        root.addView(clock, layout(80));

        TextView tag = text("HIỆU LỆNH NỀ NẾP & BÁO THỨC", 16, Color.rgb(209, 229, 223), false);
        root.addView(tag, layout(36));

        title = text(AlarmPlaybackService.currentTitle.isEmpty() ? "BÁO THỨC" : AlarmPlaybackService.currentTitle, 26, Color.WHITE, true);
        root.addView(title, layout(72));

        status = text("Chuông đang reo liên tục cho đến khi tắt", 14, Color.rgb(209, 229, 223), false);
        root.addView(status, layout(36));

        // Nút DỪNG BÁO THỨC
        Button stop = new Button(this);
        stop.setText("DỪNG BÁO THỨC");
        stop.setTextSize(20);
        stop.setTextColor(Color.WHITE);
        stop.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(200, 32, 45)));
        stop.setContentDescription("Dừng báo thức");
        stop.setOnClickListener(v -> {
            Intent intent = new Intent(this, AlarmPlaybackService.class).setAction("STOP");
            startService(intent);
            finish();
        });
        LinearLayout.LayoutParams pStop = layout(64);
        pStop.bottomMargin = dp(14);
        root.addView(stop, pStop);

        // Nút BÁO LẠI (SNOOZE 5 PHÚT)
        Button snooze = new Button(this);
        snooze.setText("BÁO LẠI (5 PHÚT)");
        snooze.setTextSize(18);
        snooze.setTextColor(Color.WHITE);
        snooze.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(230, 81, 0)));
        snooze.setContentDescription("Báo lại sau 5 phút");
        snooze.setOnClickListener(v -> {
            Intent intent = new Intent(this, AlarmPlaybackService.class).setAction("SNOOZE");
            startService(intent);
            Toast.makeText(this, "Đã hẹn báo lại sau 5 phút", Toast.LENGTH_SHORT).show();
            finish();
        });
        LinearLayout.LayoutParams pSnooze = layout(56);
        root.addView(snooze, pSnooze);

        scroll.addView(root);
        setContentView(scroll);
        handler.post(refresh);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams layout(int height) {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(height));
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(null, android.graphics.Typeface.BOLD);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
