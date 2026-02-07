
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  "zh-CN": {
    "app_name": "SilverCare",
    "app_subtitle": "智慧关怀 • 自动摔倒监测中",
    "status_online": "小玲在线",
    "weather": "今日天气",
    "news": "当地新闻",
    "video_call": "小玲视讯陪伴",
    "video_desc": "面对面即时聊天",
    "chat": "文字聊天",
    "vision": "帮我看看",
    "family": "亲情留言",
    "meds": "吃药提醒",
    "emergency": "紧急呼救",
    "dial": "拨打",
    "settings_phone": "设置常用号码",
    "family_phone": "亲情号",
    "emergency_phone": "紧急号",
    "start_guard": "开启守护服务",
    "permission_note": "只有全部开启，小玲才能 24 小时保护您的安全。",
    "motion_sensor": "动作传感器 (摔倒监测)",
    "media_permission": "视频/说话权限",
    "location_permission": "紧急定位权限",
    "permission_enabled": "已开启",
    "permission_click_enable": "点击开启",
    "monitoring_on": "摔倒监测已自动开启",
    "monitoring_desc": "系统正在后台守护您的安全",
    "system_running": "系统运行中",
    "enter_test_mode": "🧪 进入分屏测试模式",
    "back": "返回",
    "lang_name": "简体中文",
    "switch_lang": "切换语言",

    // WeatherNews
    "weather_title": "今日天气",
    "news_title": "当地新闻",
    "close": "关闭",
    "loading_ai": "小玲正在为您查询...",
    "ref_source": "参考来源：",
    "voice_playing": "正在为您语音播报...",
    "content_generated": "内容由 AI 助手小玲实时生成",
    "loc_fail": "无法获取您的位置，请在首页开启定位权限。",
    "gps_fail": "定位失败，请确保手机已开启GPS。",

    // Chat
    "chat_initial": "爷爷/奶奶，您好！我是小玲。今天过得顺心吗？想跟我聊聊最近开心的事，还是想让我帮您给孩子们回个话？",
    "chat_placeholder": "按这里跟我聊天...",
    "chat_listening": "小玲正在认真听，请稍等...",
    "trans_label": "💡 小玲翻译：",
    "health_label": "🍵 养生叮嘱：",
    "reply_label": "✍️ 您可以这样回孩子：",
    "no_api_key_chat": "⚠️ 小玲连接不上大脑（API密钥未配置），请联系管理员协助解决。",

    // Reminders
    "reminders_title": "用药与提醒",
    "add_btn": "+ 添加",
    "tip_title": "💡 小提示：",
    "tip_content": "完成任务后，点击方框即可标记。按时吃药能让身体更强壮哦！",

    // Alarm
    "alarm_title": "我的闹钟",
    "add_alarm": "+ 添加闹钟",
    "no_alarm": "还没有闹钟，点击上方按钮添加",
    "set_alarm": "设定新闹钟",
    "select_time": "选择时间",
    "alarm_label": "闹钟标签",
    "cancel": "取消",
    "save": "保存",
    "label_wake": "早起",
    "label_nap": "午睡",
    "label_rest": "晚间休息",

    // AlarmOverlay
    "alarm_ringing": "闹钟响了！",
    "med_alarm_ringing": "该吃药啦！",
    "verify_take_med": "核对并用药",
    "dismiss_btn": "我知道了",
    "alarm_reminding": "小玲正在提醒您...",
    "snooze": "稍后提醒",

    // Vision
    "vision_title": "帮我看看",
    "vision_subtitle": "小玲帮您识别物品和文字",
    "camera_rear": "后置镜头",
    "analyzing": "正在辨认...",
    "take_photo": "📷 拍一下",
    "camera_error": "摄像头无法访问。请确保已在首页完成权限开启。",
    "switch_camera": "🔄 切换",
    "current_device": "当前设备：",
    "env_mode": "环境识别模式",

    // Family
    "family_title": "亲情留言板",
    "family_footer": "孩子们的爱时刻都在",

    // Fall Monitor
    "monitor_title": "摔倒自动监测",
    "monitor_active_24h": "24小时自动守护中",
    "monitor_desc_detail": "开启后发生意外小玲会自动报警。",
    "start_monitor": "启动监测系统",
    "click_protect": "点击后开始保护您的安全",
    "guarding": "守护中...",
    "gravity_sensor": "重力感应",
    "accel_mag": "加速度模长",
    "safe_status": "安全状态",
    "status_safe": "正常",
    "status_danger": "剧烈",
    "abnormal": "⚠️ 异常",
    "normal": "✅ 正常",
    "stop_monitor": "停止守护",
    "test_mode": "测试模式",
    "sim_impact": "模拟瞬间撞击",
    "permission_denied": "权限被拒绝，摔倒监测无法运行。",
    "req_perm_fail": "无法发起权限请求，请刷新页面。",

    // Emergency
    "fall_alert": "摔倒警报！",
    "countdown_msg": "确认呼救倒计时",
    "cancel_fine": "取消 (我没事)",
    "calling_screen": "呼救中",
    "trigger_dial": "已触发自动拨号",
    "locating": "正在努力重新定位...",
    "redial": "再次点击重拨",
    "false_alarm": "误报，我没事",

    // LiveCall
    "listening_user": "小玲正在听您说话...",
    "coming": "小玲正在赶来的路上...",
    "history_title": "聊天记录",
    "mute": "已静音",
    "unmute": "我说话",
    "end_call": "结束通话",
    "stop_talking": "别说啦",
    "clear_history": "清空记录",
    "no_history": "还没有开始聊天哦",
    "listening_state": "正在听",
    "speaking_state": "正在说",
    "call_instruction_active": "您可以直接说话，或者让小玲先停下",
    "call_instruction_wait": "请稍等，小玲马上就到",

    // RoleDetection
    "role_title": "身份识别",
    "role_desc": "请平视摄像头，小玲会帮您自动配置界面。",
    "scanning": "正在识别...",
    "start_auto_config": "开始自动配置",
    "manual_select": "识别不对？手动选择身份",
    "iam_elderly": "👴 我是长者",
    "iam_child": "👩‍👧 我是子女",
    "camera_not_found": "未发现摄像头。",
    "camera_auth_error": "无法开启摄像头，请确保已授权。",

    // GuardianDashboard
    "dashboard_title": "子女端控制台",
    "monitoring_target": "正在远程守护：爷爷的家",
    "parent_online": "● 父母端在线",
    "connection_lost": "● 连接已中断",
    "nav_mirror": "镜像视图",
    "nav_data": "返回数据",
    "nav_alarm": "远程设闹钟",
    "parent_location": "父母位置",
    "location_region": "巴生地区 (GPS 正常)",
    "view_map": "查看地图",
    "med_stream": "服药确证流",
    "synced_photos": "已同步照片",
    "no_med_records": "暂无服药记录",
    "proof_photo": "确证照",
    "no_image": "无图",
    "safety_logs": "安全日志",
    "remote_alarm_title": "远程设置闹钟",
    "remote_alarm_desc": "您可以为父母设置服药或起床闹钟，父母端会自动同步并响铃。",
    "current_alarms": "当前闹钟",
    "alarm_config_count": "已配置 1 个定时提醒",
    "modify": "修改",
    "back_to_dashboard": "返回控制台",
    "original_image": "服药存证原始截图",
    "alert_highest_level": "最高级别预警！",
    "alert_fall_desc": "检测到父母端发生剧烈跌倒且无回应",
    "call_120": "立即拨打 120",
    "confirm_safety": "已联系父母，确认安全",

    // TestCenter
    "test_title": "跌倒告警同步测试",
    "exit_test": "退出测试",
    "sim_parent_phone": "模拟父母端手机",
    "status_safe_state": "状态：安全",
    "status_warning": "状态：跌倒预警中",
    "sim_shake": "模拟长者手机发生剧烈震动",
    "i_fell": "我摔倒了！",
    "restore_safe": "恢复安全",
    "logic_note": "逻辑说明：点击“我摔倒了”会通过 DataSyncManager 修改本地 Storage 的 is_falling 字段。",
    "sim_child_dashboard": "模拟子女端实时看板",
    "cloud_status_alert": "🔴 收到预警",
    "cloud_status_ok": "🟢 链路正常",
    "latency": "延迟",

    // MedicationCapture
    "verify_step": "核对",
    "recording_step": "记录中",
    "syncing_step": "同步中",
    "click_verify": "📸 点击核对",

    // SeniorViewMirror
    "establishing_link": "正在建立镜像链接...",
    "mirror_readonly": "镜像视图 (只读)",
    "realtime_sync": "● 实时同步",
    "disconnected": "● 连接断开",
    "senior_viewing_meds": "长者正在查看：用药提醒",
    "med_routine": "常规用药",
    "senior_using_module": "长者正在使用：{module} 模块",
    
    // VoiceRipple
    "ripple_listening": "小玲正在听...",

    // Guardian
    "ai_guard": "AI 守卫",
    "default_camera": "默认摄像头",
    "change_lens": "🔄 换个镜头",
    "camera_open_fail": "摄像头打不开。请确保没有其他软件占用，或尝试点击切换按钮。",
    "ai_identifying": "小玲正在努力辨认...",
    "who_at_door": "🔍 谁在门外？",
    "please_wait": "请稍等...",

    // Health
    "health_monitor": "健康监测",
    "steps_today": "今日步数",
    "heart_rate": "心率",
    "normal_range": "● 正常范围",
    "step_trend": "走步趋势",
    "last_7_days": "最近7天",
    "hr_trend": "心率变化",
    "today": "今日",
    "doctor_advice": "医生建议：",
    "advice_content": "您的健康状况非常稳定。建议傍晚时分多走500步，有助于睡眠。",
  },
  "zh-TW": {
    "app_name": "SilverCare",
    "app_subtitle": "智慧關懷 • 自動跌倒監測中",
    "status_online": "小玲在線",
    "weather": "今日天氣",
    "news": "當地新聞",
    "video_call": "小玲視訊陪伴",
    "video_desc": "面對面即時聊天",
    "chat": "文字聊天",
    "vision": "幫我看看",
    "family": "親情留言",
    "meds": "吃藥提醒",
    "emergency": "緊急呼救",
    "dial": "撥打",
    "settings_phone": "設定常用號碼",
    "family_phone": "親情號",
    "emergency_phone": "緊急號",
    "start_guard": "開啟守護服務",
    "permission_note": "只有全部開啟，小玲才能 24 小時保護您的安全。",
    "motion_sensor": "動作傳感器 (跌倒監測)",
    "media_permission": "視訊/麥克風權限",
    "location_permission": "緊急定位權限",
    "permission_enabled": "已開啟",
    "permission_click_enable": "點擊開啟",
    "monitoring_on": "跌倒監測已自動開啟",
    "monitoring_desc": "系統正在後台守護您的安全",
    "system_running": "系統運行中",
    "enter_test_mode": "🧪 進入分屏測試模式",
    "back": "返回",
    "lang_name": "繁體中文",
    "switch_lang": "切換語言",

    "weather_title": "今日天氣",
    "news_title": "當地新聞",
    "close": "關閉",
    "loading_ai": "小玲正在為您查詢...",
    "ref_source": "參考來源：",
    "voice_playing": "正在為您語音播報...",
    "content_generated": "內容由 AI 助手小玲即時生成",
    "loc_fail": "無法獲取您的位置，請在首頁開啟定位權限。",
    "gps_fail": "定位失敗，請確保手機已開啟 GPS。",

    "chat_initial": "爺爺/奶奶，您好！我是小玲。今天過得順心嗎？想跟我聊聊最近開心的事，還是想讓我幫您給孩子們回個話？",
    "chat_placeholder": "按這裡跟我聊天...",
    "chat_listening": "小玲正在認真聽，請稍等...",
    "trans_label": "💡 小玲翻譯：",
    "health_label": "🍵 養生叮囑：",
    "reply_label": "✍️ 您可以這樣回孩子：",
    "no_api_key_chat": "⚠️ 小玲連接不上大腦（API金鑰未配置），請聯繫管理員協助解決。",

    "reminders_title": "用藥與提醒",
    "add_btn": "+ 添加",
    "tip_title": "💡 小提示：",
    "tip_content": "完成任務後，點擊方框即可標記。按時吃藥能讓身體更強壯哦！",

    "alarm_title": "我的鬧鐘",
    "add_alarm": "+ 添加鬧鐘",
    "no_alarm": "還沒有鬧鐘，點擊上方按鈕添加",
    "set_alarm": "設定新鬧鐘",
    "select_time": "選擇時間",
    "alarm_label": "鬧鐘標籤",
    "cancel": "取消",
    "save": "保存",
    "label_wake": "早起",
    "label_nap": "午睡",
    "label_rest": "晚間休息",

    "alarm_ringing": "鬧鐘響了！",
    "med_alarm_ringing": "該吃藥啦！",
    "verify_take_med": "核對並用藥",
    "dismiss_btn": "我知道了",
    "alarm_reminding": "小玲正在提醒您...",
    "snooze": "稍後提醒",

    "vision_title": "幫我看看",
    "vision_subtitle": "小玲幫您識別物品和文字",
    "camera_rear": "後置鏡頭",
    "analyzing": "正在辨認...",
    "take_photo": "📷 拍一下",
    "camera_error": "鏡頭無法訪問。請確保已在首頁完成權限開啟。",
    "switch_camera": "🔄 切換",
    "current_device": "當前設備：",
    "env_mode": "環境識別模式",

    "family_title": "親情留言板",
    "family_footer": "孩子們的愛時刻都在",

    "monitor_title": "跌倒自動監測",
    "monitor_active_24h": "24小時自動守護中",
    "monitor_desc_detail": "開啟後發生意外小玲會自動報警。",
    "start_monitor": "啟動監測系統",
    "click_protect": "點擊後開始保護您的安全",
    "guarding": "守護中...",
    "gravity_sensor": "重力感應",
    "accel_mag": "加速度模長",
    "safe_status": "安全狀態",
    "status_safe": "正常",
    "status_danger": "劇烈",
    "abnormal": "⚠️ 異常",
    "normal": "✅ 正常",
    "stop_monitor": "停止守護",
    "test_mode": "測試模式",
    "sim_impact": "模擬瞬間撞擊",
    "permission_denied": "權限被拒絕，跌倒監測無法運行。",
    "req_perm_fail": "無法發起權限請求，請刷新頁面。",

    "fall_alert": "跌倒警報！",
    "countdown_msg": "確認呼救倒計時",
    "cancel_fine": "取消 (我沒事)",
    "calling_screen": "呼救中",
    "trigger_dial": "已觸發自動撥號",
    "locating": "正在努力重新定位...",
    "redial": "再次點擊重撥",
    "false_alarm": "誤報，我沒事",

    "listening_user": "小玲正在聽您說話...",
    "coming": "小玲正在趕來的路上...",
    "history_title": "聊天記錄",
    "mute": "已靜音",
    "unmute": "我說話",
    "end_call": "結束通話",
    "stop_talking": "別說啦",
    "clear_history": "清空記錄",
    "no_history": "還沒有開始聊天哦",
    "listening_state": "正在聽",
    "speaking_state": "正在說",
    "call_instruction_active": "您可以直接說話，或者讓小玲先停下",
    "call_instruction_wait": "請稍等，小玲馬上就到",

    // RoleDetection
    "role_title": "身份識別",
    "role_desc": "請平視鏡頭，小玲會幫您自動配置界面。",
    "scanning": "正在識別...",
    "start_auto_config": "開始自動配置",
    "manual_select": "識別不對？手動選擇身份",
    "iam_elderly": "👴 我是長者",
    "iam_child": "👩‍👧 我是子女",
    "camera_not_found": "未發現鏡頭。",
    "camera_auth_error": "無法開啟鏡頭，請確保已授權。",

    // GuardianDashboard
    "dashboard_title": "子女端控制台",
    "monitoring_target": "正在遠程守護：爺爺的家",
    "parent_online": "● 父母端在線",
    "connection_lost": "● 連接已中斷",
    "nav_mirror": "鏡像視圖",
    "nav_data": "返回數據",
    "nav_alarm": "遠程設鬧鐘",
    "parent_location": "父母位置",
    "location_region": "巴生地區 (GPS 正常)",
    "view_map": "查看地圖",
    "med_stream": "服藥確證流",
    "synced_photos": "已同步照片",
    "no_med_records": "暫無服藥記錄",
    "proof_photo": "確證照",
    "no_image": "無圖",
    "safety_logs": "安全日誌",
    "remote_alarm_title": "遠程設置鬧鐘",
    "remote_alarm_desc": "您可以為父母設置服藥或起床鬧鐘，父母端會自動同步並響鈴。",
    "current_alarms": "當前鬧鐘",
    "alarm_config_count": "已配置 1 個定時提醒",
    "modify": "修改",
    "back_to_dashboard": "返回控制台",
    "original_image": "服藥存證原始截圖",
    "alert_highest_level": "最高級別預警！",
    "alert_fall_desc": "檢測到父母端發生劇烈跌倒且無回應",
    "call_120": "立即撥打 120",
    "confirm_safety": "已聯繫父母，確認安全",

    // TestCenter
    "test_title": "跌倒告警同步測試",
    "exit_test": "退出測試",
    "sim_parent_phone": "模擬父母端手機",
    "status_safe_state": "狀態：安全",
    "status_warning": "狀態：跌倒預警中",
    "sim_shake": "模擬長者手機發生劇烈震動",
    "i_fell": "我摔倒了！",
    "restore_safe": "恢復安全",
    "logic_note": "邏輯說明：點擊“我摔倒了”會通過 DataSyncManager 修改本地 Storage 的 is_falling 字段。",
    "sim_child_dashboard": "模擬子女端實時看板",
    "cloud_status_alert": "🔴 收到預警",
    "cloud_status_ok": "🟢 鏈路正常",
    "latency": "延遲",

    // MedicationCapture
    "verify_step": "核對",
    "recording_step": "記錄中",
    "syncing_step": "同步中",
    "click_verify": "📸 點擊核對",

    // SeniorViewMirror
    "establishing_link": "正在建立鏡像鏈接...",
    "mirror_readonly": "鏡像視圖 (只讀)",
    "realtime_sync": "● 實時同步",
    "disconnected": "● 連接斷開",
    "senior_viewing_meds": "長者正在查看：用藥提醒",
    "med_routine": "常規用藥",
    "senior_using_module": "長者正在使用：{module} 模塊",

    // VoiceRipple
    "ripple_listening": "小玲正在聽...",

    // Guardian
    "ai_guard": "AI 守衛",
    "default_camera": "默認鏡頭",
    "change_lens": "🔄 換個鏡頭",
    "camera_open_fail": "鏡頭打不開。請確保沒有其他軟件佔用，或嘗試點擊切換按鈕。",
    "ai_identifying": "小玲正在努力辨認...",
    "who_at_door": "🔍 誰在門外？",
    "please_wait": "請稍等...",

    // Health
    "health_monitor": "健康監測",
    "steps_today": "今日步數",
    "heart_rate": "心率",
    "normal_range": "● 正常範圍",
    "step_trend": "走步趨勢",
    "last_7_days": "最近7天",
    "hr_trend": "心率變化",
    "today": "今日",
    "doctor_advice": "醫生建議：",
    "advice_content": "您的健康狀況非常穩定。建議傍晚時分多走500步，有助於睡眠。",
  },
  "en": {
    "app_name": "SilverCare",
    "app_subtitle": "Smart Care • Fall Detection On",
    "status_online": "Online",
    "weather": "Weather",
    "news": "News",
    "video_call": "Video Companion",
    "video_desc": "Face-to-face chat",
    "chat": "Chat",
    "vision": "Vision Help",
    "family": "Family Board",
    "meds": "Reminders",
    "emergency": "SOS Help",
    "dial": "Call",
    "settings_phone": "Phone Settings",
    "family_phone": "Family",
    "emergency_phone": "Emergency",
    "start_guard": "Enable Protection",
    "permission_note": "Enable all for 24/7 protection.",
    "motion_sensor": "Motion Sensor",
    "media_permission": "Camera/Mic",
    "location_permission": "Location",
    "permission_enabled": "Enabled",
    "permission_click_enable": "Enable",
    "monitoring_on": "Fall Detection Active",
    "monitoring_desc": "System protecting you in background",
    "system_running": "System Running",
    "enter_test_mode": "🧪 Enter Test Mode",
    "back": "Back",
    "lang_name": "English",
    "switch_lang": "Language",

    "weather_title": "Today's Weather",
    "news_title": "Local News",
    "close": "Close",
    "loading_ai": "Xiao Ling is checking for you...",
    "ref_source": "Source:",
    "voice_playing": "Reading aloud for you...",
    "content_generated": "Content generated by SilverCare AI",
    "loc_fail": "Cannot get location. Please enable permission.",
    "gps_fail": "Location failed. Ensure GPS is on.",

    "chat_initial": "Hello! I'm Xiao Ling. How are you today? Want to chat or reply to your family?",
    "chat_placeholder": "Tap here to chat...",
    "chat_listening": "Xiao Ling is listening...",
    "trans_label": "💡 Translation:",
    "health_label": "🍵 Health Tip:",
    "reply_label": "✍️ Reply Suggestion:",
    "no_api_key_chat": "⚠️ API Key missing. Please ask for help.",

    "reminders_title": "Meds & Reminders",
    "add_btn": "+ Add",
    "tip_title": "💡 Tip:",
    "tip_content": "Tap the box when done. Taking meds on time keeps you strong!",

    "alarm_title": "My Alarms",
    "add_alarm": "+ Add Alarm",
    "no_alarm": "No alarms yet. Tap above to add.",
    "set_alarm": "Set New Alarm",
    "select_time": "Select Time",
    "alarm_label": "Label",
    "cancel": "Cancel",
    "save": "Save",
    "label_wake": "Wake Up",
    "label_nap": "Nap",
    "label_rest": "Rest",

    "alarm_ringing": "Alarm!",
    "med_alarm_ringing": "Time for Meds!",
    "verify_take_med": "Verify & Take",
    "dismiss_btn": "I Know",
    "alarm_reminding": "Xiao Ling is reminding you...",
    "snooze": "Snooze",

    "vision_title": "Vision Help",
    "vision_subtitle": "Identify items and text",
    "camera_rear": "Rear Camera",
    "analyzing": "Analyzing...",
    "take_photo": "📷 Snap",
    "camera_error": "Camera error. Check permissions.",
    "switch_camera": "🔄 Switch",
    "current_device": "Device: ",
    "env_mode": "Environment Mode",

    "family_title": "Family Board",
    "family_footer": "Children's love is always there",

    "monitor_title": "Fall Detection",
    "monitor_active_24h": "24h Protection Active",
    "monitor_desc_detail": "Automatically alerts on accidents.",
    "start_monitor": "Start System",
    "click_protect": "Click to enable protection",
    "guarding": "Guarding...",
    "gravity_sensor": "Gravity",
    "accel_mag": "Accel Magnitude",
    "safe_status": "Status",
    "status_safe": "Normal",
    "status_danger": "IMPACT",
    "abnormal": "⚠️ Abnormal",
    "normal": "✅ Normal",
    "stop_monitor": "Stop Guard",
    "test_mode": "Test Mode",
    "sim_impact": "Sim Impact",
    "permission_denied": "Permission denied.",
    "req_perm_fail": "Permission request failed. Refresh.",

    "fall_alert": "Fall Alert!",
    "countdown_msg": "Calling in...",
    "cancel_fine": "Cancel (I'm fine)",
    "calling_screen": "Calling",
    "trigger_dial": "Auto-dial triggered",
    "locating": "Locating...",
    "redial": "Redial",
    "false_alarm": "False alarm",

    "listening_user": "Listening...",
    "coming": "Connecting...",
    "history_title": "Chat History",
    "mute": "Muted",
    "unmute": "Speak",
    "end_call": "End Call",
    "stop_talking": "Hush",
    "clear_history": "Clear",
    "no_history": "No messages yet",
    "listening_state": "Listening",
    "speaking_state": "Speaking",
    "call_instruction_active": "Speak now, or ask Xiao Ling to stop",
    "call_instruction_wait": "Please wait, connecting...",

    // RoleDetection
    "role_title": "Identity Setup",
    "role_desc": "Look at the camera for auto-setup.",
    "scanning": "Scanning...",
    "start_auto_config": "Start Auto-Config",
    "manual_select": "Incorrect? Select Manually",
    "iam_elderly": "👴 I am Elderly",
    "iam_child": "👩‍👧 I am Child",
    "camera_not_found": "Camera not found.",
    "camera_auth_error": "Cannot open camera. Check permissions.",

    // GuardianDashboard
    "dashboard_title": "Guardian Console",
    "monitoring_target": "Monitoring: Grandpa's Home",
    "parent_online": "● Parent Online",
    "connection_lost": "● Disconnected",
    "nav_mirror": "Mirror View",
    "nav_data": "Data View",
    "nav_alarm": "Remote Alarm",
    "parent_location": "Parent Loc",
    "location_region": "Klang Valley (GPS OK)",
    "view_map": "View Map",
    "med_stream": "Meds Verification",
    "synced_photos": "Synced Photos",
    "no_med_records": "No records yet",
    "proof_photo": "Proof",
    "no_image": "No Img",
    "safety_logs": "Safety Logs",
    "remote_alarm_title": "Remote Alarm Settings",
    "remote_alarm_desc": "Set alarms for meds or waking up. Syncs automatically.",
    "current_alarms": "Current Alarms",
    "alarm_config_count": "{count} alarm(s) set",
    "modify": "Modify",
    "back_to_dashboard": "Back to Dashboard",
    "original_image": "Original Proof Image",
    "alert_highest_level": "CRITICAL ALERT!",
    "alert_fall_desc": "Severe fall detected with no response!",
    "call_120": "Call Emergency",
    "confirm_safety": "Confirmed Safety",

    // TestCenter
    "test_title": "Fall Alert Test",
    "exit_test": "Exit Test",
    "sim_parent_phone": "Sim: Parent Phone",
    "status_safe_state": "Status: Safe",
    "status_warning": "Status: Warning",
    "sim_shake": "Simulate severe vibration",
    "i_fell": "I Fell!",
    "restore_safe": "Restore Safe",
    "logic_note": "Logic: Clicking 'I Fell' updates local storage 'is_falling'.",
    "sim_child_dashboard": "Sim: Child Dashboard",
    "cloud_status_alert": "🔴 Alert Received",
    "cloud_status_ok": "🟢 Link OK",
    "latency": "Latency",

    // MedicationCapture
    "verify_step": "Verify",
    "recording_step": "Recording",
    "syncing_step": "Syncing",
    "click_verify": "📸 Click to Verify",

    // SeniorViewMirror
    "establishing_link": "Establishing Mirror Link...",
    "mirror_readonly": "Mirror View (Read-only)",
    "realtime_sync": "● Real-time",
    "disconnected": "● Disconnected",
    "senior_viewing_meds": "Senior is viewing: Meds",
    "med_routine": "Routine Med",
    "senior_using_module": "Senior is using: {module}",

    // VoiceRipple
    "ripple_listening": "Xiao Ling is listening...",

    // Guardian
    "ai_guard": "AI Guard",
    "default_camera": "Default Camera",
    "change_lens": "🔄 Switch Lens",
    "camera_open_fail": "Camera failed. Check usage or switch.",
    "ai_identifying": "Identifying...",
    "who_at_door": "🔍 Who is it?",
    "please_wait": "Wait...",

    // Health
    "health_monitor": "Health Monitor",
    "steps_today": "Steps Today",
    "heart_rate": "Heart Rate",
    "normal_range": "● Normal",
    "step_trend": "Step Trend",
    "last_7_days": "Last 7 Days",
    "hr_trend": "Heart Rate Trend",
    "today": "Today",
    "doctor_advice": "Doctor's Advice:",
    "advice_content": "Health stable. Walk 500 more steps in evening.",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('zh-CN');

  useEffect(() => {
    const savedLang = localStorage.getItem('SILVERCARE_LANGUAGE') as Language;
    if (savedLang && ['zh-CN', 'zh-TW', 'en'].includes(savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('SILVERCARE_LANGUAGE', lang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
    