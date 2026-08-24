import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushNotificationPermission() {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        // التحقق من حالة إذن الإشعارات الحالية
        let permStatus = await PushNotifications.checkPermissions();

        // إذا لم يقم المستخدم بالرد مسبقاً، نطلب منه الإذن بنافذة منبثقة رسمية
        if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === "granted") {
          // تسجيل الجهاز في خدمة الإشعارات فور الموافقة
          await PushNotifications.register();

          // الاستقبال والتقاط الـ FCM Token لتجربته في فايربيس
          await PushNotifications.addListener("registration", (token) => {
            console.log("FCM Token successfully received: ", token.value);
          });
        }
      } catch (error) {
        console.error("Error requesting push notification permission:", error);
      }
    };

    requestPermission();

    return () => {
      void PushNotifications.removeAllListeners();
    };
  }, []);
}

export default usePushNotificationPermission;
