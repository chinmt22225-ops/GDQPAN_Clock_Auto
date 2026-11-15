package vn.gdqpan.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.ArrayList;

@CapacitorPlugin(name="GdqSpeech",permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public class GdqSpeechPlugin extends Plugin {
    private boolean recognizing=false;
    @PluginMethod public void recognize(PluginCall call){
        if(recognizing){call.reject("Đang nhập giọng nói. Vui lòng hoàn tất hoặc hủy lần hiện tại.");return;}
        if(getPermissionState("microphone")!=PermissionState.GRANTED){requestPermissionForAlias("microphone",call,"microphoneResult");return;}
        launch(call);
    }
    @PermissionCallback private void microphoneResult(PluginCall call){
        if(getPermissionState("microphone")!=PermissionState.GRANTED){call.reject("Cần cho phép microphone để nhập bằng giọng nói.");return;}
        launch(call);
    }
    private void launch(PluginCall call){
        Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"vi-VN");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT,"Nói nội dung thông báo bằng tiếng Việt");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
        try{recognizing=true;startActivityForResult(call,intent,"recognitionResult");}
        catch(Exception e){recognizing=false;call.reject("Điện thoại chưa có dịch vụ nhận dạng giọng nói. Hãy cài hoặc bật dịch vụ nhận dạng tiếng Việt.");}
    }
    @ActivityCallback private void recognitionResult(PluginCall call,ActivityResult result){
        recognizing=false;if(call==null)return;
        JSObject response=new JSObject();
        if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null){response.put("cancelled",true);call.resolve(response);return;}
        ArrayList<String> matches=result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        String text=matches==null||matches.isEmpty()?"":matches.get(0);
        response.put("text",text);response.put("cancelled",false);call.resolve(response);
    }
}
