package vn.gdqpan.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        if(!RuntimePolicy.alarmAllowed(context))return;
        if(!"vn.gdqpan.ALARM".equals(intent.getAction())){AlarmStore.armAll(context);return;}
        JSONObject schedule=AlarmStore.find(context,intent.getStringExtra("id"));
        if(schedule==null||!schedule.optBoolean("on",true)||!AlarmStore.settings(context).optBoolean("autoPlay",true))return;
        if (AlarmStore.isTemporary(schedule)) {
            if (!AlarmStore.temporaryDue(schedule, System.currentTimeMillis())) return;
        } else {
            AlarmStore.arm(context, schedule);
        }
        Intent service=new Intent(context,AlarmPlaybackService.class).putExtra("schedule",schedule.toString());
        try{if(Build.VERSION.SDK_INT>=26)context.startForegroundService(service);else context.startService(service);}
        catch(Exception e){AlarmStore.log(context,"Không thể phát báo thức",e.toString());}
    }
}
