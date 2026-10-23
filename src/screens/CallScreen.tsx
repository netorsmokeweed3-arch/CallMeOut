import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, useColorScheme } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors } from '../constants/theme';

interface CallScreenProps {
  callerName: string;
  callerImage: string | null;
  callType: 'phone' | 'viber' | 'telegram';
  audioUri?: string | null;      
  voiceUri?: string | null;      
  onEndCall: () => void;
}

const CallScreen: React.FC<CallScreenProps> = ({ callerName, callerImage, callType, audioUri, voiceUri, onEndCall }) => {
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  const getThemeColors = () => {
    switch (callType) {
      case 'viber':
        return { background: '#665CAC', subText: '#E9D5FF', accent: '#8B5CF6' };
      case 'telegram':
        return { background: '#17212B', subText: '#788B9B', accent: '#2EA6FF' };
      default:
        return { background: '#0D0D0D', subText: '#9CA3AF', accent: '#007AFF' };
    }
  };

  const currentTheme = getThemeColors();

  // Відтворення мелодії без вильوتів помилок, якщо файл не задано
  useEffect(() => {
    let ringtoneSound: Audio.Sound | null = null;

    const playRingtone = async () => {
      try {
        let soundAsset = audioUri 
          ? { uri: audioUri } 
          : callType === 'viber' 
            ? require('../assets/sounds/viber_call.mp3') 
            : callType === 'telegram' 
              ? require('../assets/sounds/telegram_call.mp3') 
              : null; // Безпечний нульовий об'єкт замість неіснуючого дефолту

        if (soundAsset) {
          const { sound: createdSound } = await Audio.Sound.createAsync(soundAsset, { 
            shouldPlay: true, 
            isLooping: true 
          });
          ringtoneSound = createdSound;
          setSound(createdSound);
        }
      } catch (error) {
        console.log("Пропущено відтворення кастомного рингтона:", error);
      }
    };

    if (!isAnswered) {
      playRingtone();
    }

    return () => {
      if (ringtoneSound) {
        ringtoneSound.unloadAsync();
      }
    };
  }, [callType, isAnswered, audioUri]);

  useEffect(() => {
    let interval: any;
    if (isAnswered) {
      if (sound) {
        sound.stopAsync().catch(() => {});
      }

      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);

      const playVoiceMessage = async () => {
        if (!voiceUri) return;
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            allowsRecordingIOS: false,
            playThroughEarpieceAndroid: true,
          });

          const { sound: voiceSound } = await Audio.Sound.createAsync(
            { uri: voiceUri },
            { shouldPlay: true }
          );
          setSound(voiceSound);
        } catch (error) {
          console.log("Помилка відтворення голосу:", error);
        }
      };

      playVoiceMessage();
    }

    return () => clearInterval(interval);
  }, [isAnswered]);

  useEffect(() => {
    return () => { 
      if (sound && typeof sound.unloadAsync === 'function') {
        sound.unloadAsync();
      } 
    };
  }, [sound]);

  const formatTime = (secs: number) => 
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  const handleAccept = async () => { 
    if (sound) {
      await sound.stopAsync().catch(() => {});
    }
    setIsAnswered(true); 
  };

  const handleDecline = async () => {
    if (sound && typeof sound.stopAsync === 'function') {
      await sound.stopAsync().catch(() => {});
    }
    onEndCall();
  };

  const actionButtons = [
    { id: 'rec', title: 'Записати', iconName: 'radio-button-on', iconLib: MaterialIcons },
    { id: 'mute', title: 'Вимк. звук', iconName: 'mic-off', iconLib: MaterialIcons },
    { id: 'bluetooth', title: 'Bluetooth', iconName: 'bluetooth', iconLib: MaterialIcons },
    { id: 'speaker', title: 'Динамік', iconName: 'volume-up', iconLib: MaterialIcons },
    { id: 'keypad', title: 'Клавіатура', iconName: 'dialpad', iconLib: MaterialIcons },
    { id: 'more', title: 'Більше', iconName: 'more-vert', iconLib: MaterialIcons },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.topSection}>
        <View style={styles.timerRow}>
          {callType === 'viber' ? (
            <FontAwesome5 name="viber" size={14} color="#FFF" style={{ marginRight: 6 }} />
          ) : callType === 'telegram' ? (
            <FontAwesome5 name="telegram-plane" size={14} color="#FFF" style={{ marginRight: 6 }} />
          ) : (
            <MaterialIcons name="phone" size={14} color="#E5E7EB" style={{ marginRight: 6 }} />
          )}

          <Text style={[styles.callStatus, { color: '#FFF' }]}>
            {isAnswered ? formatTime(callDuration) : (
              callType === 'viber' ? 'Вхідний виклик Viber...' :
              callType === 'telegram' ? 'Вхідний виклик Telegram...' :
              'Вхідний дзвінок...'
            )}
          </Text>
        </View>

        <Text style={[styles.callerName, { color: '#FFF' }]}>{callerName}</Text>
        <Text style={[styles.callTypeSubtext, { color: currentTheme.subText }]}>
          {callType === 'viber' ? 'Виклик Viber' : callType === 'telegram' ? 'Зашифрований виклик Telegram' : 'Мобільна мережа'}
        </Text>

        {callerImage && (
          <View style={styles.avatarContainer}>
            <Image source={{ uri: callerImage }} style={styles.avatar} />
          </View>
        )}
      </View>

      <View style={styles.bottomSection}>
        {!isAnswered ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity style={[styles.callCircleButton, styles.acceptButton]} onPress={handleAccept}>
              <MaterialIcons name="phone" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.callCircleButton, styles.declineButton]} onPress={handleDecline}>
              <MaterialIcons name="phone" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeControls}>
            <View style={styles.gridContainer}>
              {actionButtons.map((btn) => {
                const IconComponent = btn.iconLib;
                return (
                  <View key={btn.id} style={styles.gridItem}>
                    <TouchableOpacity style={[styles.actionCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <IconComponent name={btn.iconName as any} size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={[styles.actionText, { color: '#FFF' }]}>{btn.title}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.callCircleButton, styles.declineButton, { marginTop: 30 }]} onPress={handleDecline}>
              <MaterialIcons name="phone" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  topSection: { alignItems: 'center', marginTop: 50, width: '100%' },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  callStatus: { fontSize: 16, fontWeight: '500' },
  callerName: { fontSize: 34, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  callTypeSubtext: { fontSize: 14, marginBottom: 10 },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, overflow: 'hidden', marginTop: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatar: { width: '100%', height: '100%' },
  bottomSection: { marginBottom: 70, width: '100%', alignItems: 'center' },
  incomingControls: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 40 },
  activeControls: { alignItems: 'center', width: '100%' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', width: '90%' },
  gridItem: { width: '30%', alignItems: 'center', marginBottom: 20 },
  actionCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { fontSize: 12, textAlign: 'center' },
  callCircleButton: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  acceptButton: { backgroundColor: '#22C55E' },
  declineButton: { backgroundColor: '#EF4444' },
});