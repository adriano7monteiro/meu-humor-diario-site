import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage key for notification IDs
const NOTIFICATION_IDS_KEY = '@reminder_notification_ids';

export class NotificationService {
  /**
   * Request notification permissions from the user
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔔 Requesting notification permissions...');
      
      // Check if running on physical device (required for iOS)
      if (!Device.isDevice && Platform.OS !== 'web') {
        console.log('⚠️ Must use physical device for notifications on iOS/Android');
        return false;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('🔔 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Lembretes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
        });
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.log('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a reminder notification
   */
  static async scheduleReminder(
    reminderId: string,
    title: string,
    time: string, // Format: "HH:MM"
    days: number[] // 0-6 (Monday-Sunday)
  ): Promise<void> {
    try {
      console.log(`🔔 Scheduling reminder: ${title} at ${time} on days ${days}`);

      // Parse time
      const [hour, minute] = time.split(':').map(Number);

      // Cancel existing notifications for this reminder
      await this.cancelReminderNotifications(reminderId);

      // Get icons for different reminder types
      const icon = title.toLowerCase().includes('água') ? '💧' :
                   title.toLowerCase().includes('humor') ? '😊' :
                   title.toLowerCase().includes('dormir') ? '🌙' :
                   title.toLowerCase().includes('pausa') ? '☕' :
                   title.toLowerCase().includes('meditar') ? '🧘' :
                   title.toLowerCase().includes('gratidão') ? '💖' : '⏰';

      // Schedule notification for each selected day
      const notificationIds: string[] = [];
      
      for (const day of days) {
        const notificationId = `reminder_${reminderId}_day${day}`;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${icon} ${title}`,
            body: 'Hora de cuidar de você!',
            data: { 
              type: 'reminder',
              reminderId,
              day 
            },
            sound: 'default',
          },
          trigger: {
            weekday: day === 6 ? 1 : day + 2, // Expo uses 1=Sunday, we use 0=Monday
            hour,
            minute,
            repeats: true,
          },
          identifier: notificationId,
        });

        notificationIds.push(notificationId);
      }

      // Store notification IDs
      await this.saveNotificationIds(reminderId, notificationIds);

      console.log(`✅ Scheduled ${notificationIds.length} notifications for reminder ${reminderId}`);
    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel all notifications for a reminder
   */
  static async cancelReminderNotifications(reminderId: string): Promise<void> {
    try {
      console.log(`🔔 Canceling notifications for reminder: ${reminderId}`);

      // Get stored notification IDs
      const notificationIds = await this.getNotificationIds(reminderId);

      // Cancel each notification
      for (const notificationId of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }

      // Remove from storage
      await this.removeNotificationIds(reminderId);

      console.log(`✅ Canceled ${notificationIds.length} notifications`);
    } catch (error) {
      console.error('❌ Error canceling notifications:', error);
    }
  }

  /**
   * Update reminder notifications (cancel old and schedule new)
   */
  static async updateReminderNotifications(
    reminderId: string,
    title: string,
    time: string,
    days: number[]
  ): Promise<void> {
    await this.cancelReminderNotifications(reminderId);
    await this.scheduleReminder(reminderId, title, time, days);
  }

  /**
   * Cancel all notifications (useful for logout or disable all)
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
      console.log('✅ All notifications canceled');
    } catch (error) {
      console.error('❌ Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  static async getAllScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Total scheduled notifications: ${notifications.length}`);
      return notifications;
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      return [];
    }
  }

  // Storage helpers
  private static async saveNotificationIds(reminderId: string, notificationIds: string[]): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      const allIds = stored ? JSON.parse(stored) : {};
      allIds[reminderId] = notificationIds;
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
    } catch (error) {
      console.error('Error saving notification IDs:', error);
    }
  }

  private static async getNotificationIds(reminderId: string): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      const allIds = stored ? JSON.parse(stored) : {};
      return allIds[reminderId] || [];
    } catch (error) {
      console.error('Error getting notification IDs:', error);
      return [];
    }
  }

  private static async removeNotificationIds(reminderId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      const allIds = stored ? JSON.parse(stored) : {};
      delete allIds[reminderId];
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
    } catch (error) {
      console.error('Error removing notification IDs:', error);
    }
  }

  static async scheduleHumorReminder(): Promise<void> {
    try {
      // Cancel existing humor reminder
      await this.cancelNotification('humor_reminder');

      // Schedule new humor reminder for 6 PM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💙 Como você está se sentindo?',
          body: 'Que tal registrar seu humor hoje? Isso ajuda no seu autocuidado!',
          data: { type: 'mood_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: 18,
          minute: 0,
          repeats: true,
        },
        identifier: 'humor_reminder',
      });

      console.log('Humor reminder scheduled for 6 PM daily');
    } catch (error) {
      console.log('Error scheduling humor reminder:', error);
    }
  }

  static async scheduleMissionReminder(): Promise<void> {
    try {
      // Cancel existing mission reminder
      await this.cancelNotification('mission_reminder');

      // Schedule mission reminder for 10 AM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 Suas missões te esperam!',
          body: 'Complete suas missões de autocuidado e ganhe XP hoje!',
          data: { type: 'mission_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: 10,
          minute: 0,
          repeats: true,
        },
        identifier: 'mission_reminder',
      });

      console.log('Mission reminder scheduled for 10 AM daily');
    } catch (error) {
      console.log('Error scheduling mission reminder:', error);
    }
  }

  static async scheduleEveningReminder(): Promise<void> {
    try {
      // Cancel existing evening reminder
      await this.cancelNotification('evening_reminder');

      // Schedule evening reminder for 8 PM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Momento de reflexão',
          body: 'Que tal completar suas atividades de bem-estar antes de dormir?',
          data: { type: 'evening_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        },
        identifier: 'evening_reminder',
      });

      console.log('Evening reminder scheduled for 8 PM daily');
    } catch (error) {
      console.log('Error scheduling evening reminder:', error);
    }
  }

  static async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.log(`Error canceling notification ${identifier}:`, error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications canceled');
    } catch (error) {
      console.log('Error canceling all notifications:', error);
    }
  }

  static async setStorageItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log('AsyncStorage failed, using localStorage:', error);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      }
    }
  }

  static async getStorageItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.log('AsyncStorage failed, using localStorage:', error);
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return null;
    }
  }

  static async enableReminders(): Promise<boolean> {
    try {
      console.log('🔔 NotificationService: Starting enableReminders...');
      console.log('🔔 Platform:', Platform.OS);
      
      // For web platform, we'll simulate success but not actually schedule notifications
      if (Platform.OS === 'web') {
        console.log('🔔 Running on web - notifications not fully supported, simulating success');
        await this.setStorageItem('@notifications_enabled', 'true');
        console.log('✅ Web notifications preference saved (simulated)');
        return true;
      }
      
      const hasPermission = await this.requestPermissions();
      console.log('🔔 NotificationService: Permission result:', hasPermission);
      
      if (!hasPermission) {
        console.log('🔔 NotificationService: No permission granted, returning false');
        return false;
      }

      // Schedule all reminders
      console.log('🔔 NotificationService: Scheduling reminders...');
      await this.scheduleMissionReminder();
      await this.scheduleHumorReminder();
      await this.scheduleEveningReminder();

      // Save reminder preference
      console.log('🔔 NotificationService: Saving preference to storage...');
      await this.setStorageItem('@notifications_enabled', 'true');

      console.log('✅ NotificationService: All reminders enabled successfully');
      return true;
    } catch (error) {
      console.log('❌ NotificationService: Error enabling reminders:', error);
      return false;
    }
  }

  static async disableReminders(): Promise<void> {
    try {
      await this.cancelAllNotifications();
      await this.setStorageItem('@notifications_enabled', 'false');
      console.log('Reminders disabled');
    } catch (error) {
      console.log('Error disabling reminders:', error);
    }
  }

  static async areRemindersEnabled(): Promise<boolean> {
    try {
      const enabled = await this.getStorageItem('@notifications_enabled');
      return enabled === 'true';
    } catch (error) {
      console.log('Error checking reminder status:', error);
      return false;
    }
  }

  static async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.log('Error sending immediate notification:', error);
    }
  }

  // Check if user completed daily activities
  static async checkDailyProgress(hasMoodToday: boolean, completedMissions: number): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Don't send notifications late at night or early morning
      if (hour < 8 || hour > 22) {
        return;
      }

      // Send contextual reminders based on user progress
      if (!hasMoodToday && hour >= 18) {
        await this.sendImmediateNotification(
          '💙 Registre seu humor',
          'Como foi seu dia hoje? Que tal registrar seu humor?'
        );
      }

      if (completedMissions === 0 && hour >= 16 && hour <= 20) {
        await this.sendImmediateNotification(
          '🎯 Missões pendentes',
          'Você ainda pode completar suas missões de bem-estar hoje!'
        );
      }

      if (completedMissions < 3 && !hasMoodToday && hour >= 19) {
        await this.sendImmediateNotification(
          '🌟 Últimos momentos do dia',
          'Que tal finalizar o dia cuidando do seu bem-estar?'
        );
      }
    } catch (error) {
      console.log('Error checking daily progress:', error);
    }
  }

  // Setup notification listeners
  static setupNotificationListeners(navigation: any): void {
    // Handle notification received while app is in foreground
    const foregroundListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.type === 'mood_reminder') {
        navigation.navigate('mood-tracker');
      } else if (data?.type === 'mission_reminder' || data?.type === 'evening_reminder') {
        navigation.navigate('missions');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(foregroundListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}

export default NotificationService;