package vn.gdqpan.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

final class AlarmStore {
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("gdqpan-native-alarms",Context.MODE_PRIVATE);}
    static JSONArray schedules(Context c){try{return new JSONArray(prefs(c).getString("schedules","[]"));}catch(Exception e){return new JSONArray();}}
    static JSONObject settings(Context c){try{return new JSONObject(prefs(c).getString("settings","{}"));}catch(Exception e){return new JSONObject();}}
    static boolean canSchedule(Context c){return Build.VERSION.SDK_INT<31 || ((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).canScheduleExactAlarms();}
    static PendingIntent pending(Context c,JSONObject s){
        Intent intent=new Intent(c,AlarmReceiver.class).setAction("vn.gdqpan.ALARM").setData(Uri.parse("gdqpan://alarm/"+Uri.encode(s.optString("id"))));
        intent.putExtra("id",s.optString("id"));
        return PendingIntent.getBroadcast(c,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static int replace(Context c,JSONArray list,JSONObject settings)throws Exception{
        AlarmManager manager=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        for(int i=0;i<schedules(c).length();i++)manager.cancel(pending(c,schedules(c).getJSONObject(i)));
        prefs(c).edit().putString("schedules",list.toString()).putString("settings",settings.toString()).commit();
        return armAll(c);
    }
    static int armAll(Context c){int count=0;if(!settings(c).optBoolean("autoPlay",true))return 0;JSONArray list=schedules(c);for(int i=0;i<list.length();i++){JSONObject s=list.optJSONObject(i);if(s!=null&&s.optBoolean("on",true)){if(arm(c,s))count++;}}return count;}
    static void cancelAll(Context c){
        AlarmManager manager=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        JSONArray list=schedules(c);for(int i=0;i<list.length();i++){JSONObject s=list.optJSONObject(i);if(s!=null)manager.cancel(pending(c,s));}
    }
    static boolean isTemporary(JSONObject s) {
        return s.has("triggerAt") || s.has("expiresAt");
    }
    static boolean temporaryDue(JSONObject s, long now) {
        long triggerAt = s.optLong("triggerAt", -1);
        long expiresAt = s.optLong("expiresAt", -1);
        return triggerAt > 0 && now >= (triggerAt - 15000L) && now < expiresAt;
    }
    static void scheduleAt(Context c, JSONObject s, long triggerAt) {
        AlarmManager manager = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent show = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, show), pending(c, s));
    }
    static boolean arm(Context c,JSONObject s){synchronized(RuntimePolicy.class){
        if(!RuntimePolicy.alarmAllowed(c)||!canSchedule(c)||!s.optBoolean("on",true)||!settings(c).optBoolean("autoPlay",true))return false;
        if (isTemporary(s)) {
            long triggerAt = s.optLong("triggerAt", -1);
            long expiresAt = s.optLong("expiresAt", -1);
            if (triggerAt <= System.currentTimeMillis() - 15000L || triggerAt >= expiresAt) return false;
            scheduleAt(c, s, triggerAt);
            return true;
        }
        String time=s.optString("time");if(!time.matches("\\d{2}:\\d{2}"))return false;
        int h=Integer.parseInt(time.substring(0,2)),m=Integer.parseInt(time.substring(3));if(h>23||m>59)return false;
        JSONArray days=s.optJSONArray("days");Calendar now=Calendar.getInstance();
        for(int offset=0;offset<=7;offset++){
            Calendar next=(Calendar)now.clone();next.add(Calendar.DAY_OF_YEAR,offset);next.set(Calendar.HOUR_OF_DAY,h);next.set(Calendar.MINUTE,m);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);
            int weekday=next.get(Calendar.DAY_OF_WEEK)-1;boolean valid=days==null||days.length()==0;
            if(days!=null)for(int j=0;j<days.length();j++)if(days.optInt(j,-1)==weekday)valid=true;
            if(valid&&next.getTimeInMillis()>now.getTimeInMillis()){
                scheduleAt(c, s, next.getTimeInMillis());
                return true;
            }
        }
        return false;
    }}
    static void snooze(Context c, JSONObject s, long delayMillis) {
        try {
            long now = System.currentTimeMillis();
            long triggerAt = now + delayMillis;
            long expiresAt = triggerAt + (24 * 60 * 60 * 1000L);
            JSONObject snoozeEntry = new JSONObject();
            String origTitle = s != null ? s.optString("action", "Báo thức") : "Báo thức";
            String title = origTitle.contains("(Báo lại)") ? origTitle : origTitle + " (Báo lại)";
            snoozeEntry.put("id", "k471-snooze-" + System.currentTimeMillis());
            snoozeEntry.put("action", title);
            snoozeEntry.put("time", new java.text.SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(triggerAt)));
            snoozeEntry.put("days", new JSONArray());
            snoozeEntry.put("triggerAt", triggerAt);
            snoozeEntry.put("expiresAt", expiresAt);
            snoozeEntry.put("text", s != null ? s.optString("text", "") : "");
            snoozeEntry.put("nativeFile", s != null ? s.optString("nativeFile", "") : "");
            snoozeEntry.put("hasCustomAudio", s != null && s.optBoolean("hasCustomAudio", false));
            snoozeEntry.put("on", true);

            JSONArray list = schedules(c);
            list.put(snoozeEntry);
            prefs(c).edit().putString("schedules", list.toString()).commit();
            scheduleAt(c, snoozeEntry, triggerAt);
            log(c, "Đã hẹn báo lại sau " + (delayMillis / 60000) + " phút", title);
        } catch (Exception e) {
            log(c, "Lỗi hẹn báo lại", e.toString());
        }
    }
    static JSONObject find(Context c,String id){JSONArray list=schedules(c);for(int i=0;i<list.length();i++){JSONObject s=list.optJSONObject(i);if(s!=null&&id.equals(s.optString("id")))return s;}return null;}
    static synchronized void log(Context c,String action,String details){
        try{JSONArray logs=new JSONArray(prefs(c).getString("logs","[]"));JSONObject entry=new JSONObject();entry.put("action",action);entry.put("details",details);logs.put(entry);while(logs.length()>150)logs.remove(0);prefs(c).edit().putString("logs",logs.toString()).commit();}catch(Exception ignored){}
    }
    static synchronized JSONArray takeLogs(Context c){try{JSONArray logs=new JSONArray(prefs(c).getString("logs","[]"));prefs(c).edit().remove("logs").commit();return logs;}catch(Exception e){return new JSONArray();}}
}
