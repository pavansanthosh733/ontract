from firebase_config import *
from backend.app.utils.notification_service import send_notification

# 🔥 PASTE FRESH TOKEN FROM BROWSER
token = "dGuyMCqMGfBLe_zWsR_4BG:APA91bHsT-awn0ByUpFWjth47wwkiTSvtO_1_Qwk2LHgfKWW-FzYjr5IQUD4fNS6QzMYMlKLueQ_UipQfZFaXnkUMCVejTebEJ_wBB0wKcEVpEToOynxzZo"

send_notification(token, "Hello bro 🔥", "Backend working!")