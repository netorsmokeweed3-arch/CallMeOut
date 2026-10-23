import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CallType = 'phone' | 'viber' | 'telegram';

interface CustomTemplate {
  id: string;
  title: string;
  callerName: string;
  callerImage: string | null;
  callType: CallType;
  firstCallMinutes: string;
  subsequentIntervals: string[];
  audioUri: string | null;
  audioName: string | null;
  voiceUri: string | null;
  voiceName: string | null;
}

interface QueueItem {
  id: string;
  number: number;
  minutes: number;
  status: 'waiting' | 'active' | 'completed';
}

interface SetupScreenProps {
  onStartCall: (
    name: string, 
    image: string | null, 
    type: CallType, 
    audioUri: string | null, 
    audioName: string | null,
    voiceUri: string | null, 
    voiceName: string | null,
    intervals: number[]
  ) => void;
  isQueueActive: boolean;
  initialSeconds: number;
  queueItems: QueueItem[];
  callerName: string;
  callType: CallType;
  audioName: string | null;
  voiceName: string | null;
  onTimerFinished: () => void;
  onCancelQueue: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ 
  onStartCall, 
  isQueueActive, 
  initialSeconds, 
  queueItems,
  callerName: propCallerName,
  callType: propCallType,
  audioName: propAudioName,
  voiceName: propVoiceName,
  onTimerFinished, 
  onCancelQueue 
}) => {
  const [callerName, setCallerName] = useState<string>('Мама');
  const [callerImage, setCallerImage] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType>('phone');
  
  const [firstCallMinutes, setFirstCallMinutes] = useState<string>('1'); 
  const [subsequentIntervals, setSubsequentIntervals] = useState<string[]>(['3', '5']);

  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);

  const [myTemplates, setMyTemplates] = useState<CustomTemplate[]>([]);

  // Живий відлік для поточного таймера
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  // Синхронізуємо секунди з пропсами від App.tsx
  useEffect(() => {
    setTimeLeftSeconds(initialSeconds);
  }, [initialSeconds]);

  // Таймер зворотного відліку
  useEffect(() => {
    let interval: any;
    if (isQueueActive && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds(prev => {
          if (prev > 1) return prev - 1;
          onTimerFinished();
          return 0;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQueueActive, timeLeftSeconds]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { Alert.alert('Помилка', 'Потрібен доступ до галереї!'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0].uri) setCallerImage(result.assets[0].uri);
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudioUri(result.assets[0].uri);
        setAudioName(result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося вибрати аудіофайл.');
    }
  };

  const pickVoiceMessage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVoiceUri(result.assets[0].uri);
        setVoiceName(result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося вибрати голосовий файл.');
    }
  };

  const addSubsequentCall = () => {
    setSubsequentIntervals([...subsequentIntervals, '3']);
  };

  const removeSubsequentCall = (index: number) => {
    const updated = subsequentIntervals.filter((_, i) => i !== index);
    setSubsequentIntervals(updated);
  };

  const updateSubsequentInterval = (text: string, index: number) => {
    const updated = [...subsequentIntervals];
    updated[index] = text;
    setSubsequentIntervals(updated);
  };

  const saveCurrentAsTemplate = () => {
    if (!callerName.trim()) { Alert.alert('Увага', 'Введіть імʼя того, хто дзвонить!'); return; }
    if (!firstCallMinutes.trim()) { Alert.alert('Увага', 'Вкажіть час першого дзвінка!'); return; }

    const newTemplate: CustomTemplate = {
      id: Date.now().toString(),
      title: `${callType.toUpperCase()} — ${callerName} (${firstCallMinutes} хв)`,
      callerName,
      callerImage,
      callType,
      firstCallMinutes,
      subsequentIntervals: [...subsequentIntervals],
      audioUri,
      audioName,
      voiceUri,
      voiceName,
    };

    setMyTemplates([...myTemplates, newTemplate]);
    Alert.alert('Успіх! 💾', 'Шаблон збережено.');
  };

  const deleteTemplate = (id: string) => {
    setMyTemplates(myTemplates.filter(t => t.id !== id));
  };

  const handleStartQueueAction = () => {
    const firstMins = parseFloat(firstCallMinutes);
    if (isNaN(firstMins) || firstMins < 0) { Alert.alert('Увага', 'Введіть коректний час для першого дзвінка!'); return; }

    const parsedSubsequent = subsequentIntervals
      .map(item => parseFloat(item))
      .filter(num => !isNaN(num) && num > 0);

    const allMinutes = [firstMins, ...parsedSubsequent];

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onStartCall(callerName, callerImage, callType, audioUri, audioName, voiceUri, voiceName, allMinutes);
  };

  const handlePlayTemplate = (tmpl: CustomTemplate) => {
    setCallerName(tmpl.callerName);
    setCallerImage(tmpl.callerImage);
    setCallType(tmpl.callType);
    setFirstCallMinutes(tmpl.firstCallMinutes);
    setSubsequentIntervals(tmpl.subsequentIntervals);
    setAudioUri(tmpl.audioUri);
    setAudioName(tmpl.audioName);
    setVoiceUri(tmpl.voiceUri);
    setVoiceName(tmpl.voiceName);

    const firstMins = parseFloat(tmpl.firstCallMinutes) || 1;
    const parsedSubsequent = tmpl.subsequentIntervals
      .map(item => parseFloat(item))
      .filter(num => !isNaN(num) && num > 0);

    const allMinutes = [firstMins, ...parsedSubsequent];

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onStartCall(tmpl.callerName, tmpl.callerImage, tmpl.callType, tmpl.audioUri, tmpl.audioName, tmpl.voiceUri, tmpl.voiceName, allMinutes);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>CallMeOut 📲</Text>
          <Text style={styles.subtitle}>Диспетчер рятівних дзвінків</Text>

          {isQueueActive ? (
            <View style={styles.compactActiveCard}>
              <View style={styles.compactHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.compactTitle}>📞 Контакт: {propCallerName}</Text>
                  <Text style={styles.compactSub}>Тип: {propCallType.toUpperCase()}</Text>
                  <Text style={styles.compactMeta}>🎵 Рингтон: {propAudioName || 'Стандартний'}</Text>
                  <Text style={styles.compactMeta}>🎙️ Голос: {propVoiceName || 'Без голосу'}</Text>
                </View>
              </View>

              <View style={styles.queueListContainer}>
                <Text style={styles.queueListTitle}>⏳ Поточна черга дзвінків:</Text>
                {queueItems.map((item) => {
                  if (item.status === 'completed') return null;
                  const isActive = item.status === 'active';
                  return (
                    <View key={item.id} style={[styles.queueItemRow, isActive && styles.queueItemActive]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons 
                          name={isActive ? "fiber-manual-record" : "alarm"} 
                          size={18} 
                          color={isActive ? "#4ADE80" : "#94A3B8"} 
                        />
                        <Text style={[styles.queueItemText, isActive && styles.queueItemTextActive]}>
                          Дзвінок №{item.number} {isActive ? '(Активний відлік)' : '(В очікуванні)'}
                        </Text>
                      </View>
                      <Text style={[styles.queueItemTimer, isActive && styles.queueItemTimerActive]}>
                        {isActive ? formatCountdown(timeLeftSeconds) : `${item.minutes} хв`}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.backgroundHintBox}>
                <MaterialIcons name="info-outline" size={16} color="#60A5FA" />
                <Text style={styles.backgroundHintText}>
                  Згорніть додаток. Відлік іде тільки після завершення попереднього дзвінка!
                </Text>
              </View>

              <TouchableOpacity style={styles.cancelButtonBottom} onPress={onCancelQueue}>
                <Text style={styles.cancelButtonBottomText}>Скасувати всю чергу ❌</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {myTemplates.length > 0 && (
                <View style={styles.templatesContainer}>
                  <Text style={styles.label}>📂 Ваші збережені шаблони:</Text>
                  {myTemplates.map((tmpl) => (
                    <View key={tmpl.id} style={styles.templateCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.templateTitle}>{tmpl.title}</Text>
                        <Text style={styles.templateSub}>Натисніть Плей для запуску</Text>
                      </View>

                      <TouchableOpacity style={styles.playTemplateBtn} onPress={() => handlePlayTemplate(tmpl)}>
                        <MaterialIcons name="play-arrow" size={22} color="#FFF" />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.deleteTemplateBtn} onPress={() => deleteTemplate(tmpl.id)}>
                        <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.imageSection}>
                <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                  {callerImage ? <Image source={{ uri: callerImage }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholderAvatar]}><Text style={styles.placeholderText}>+ Фото</Text></View>}
                </TouchableOpacity>
                <Text style={styles.imageHint}>Натисніть, щоб вибрати фото</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Хто дзвонить (Ім'я / Контакт):</Text>
                <TextInput style={styles.input} value={callerName} onChangeText={setCallerName} placeholder="Наприклад: Мама" placeholderTextColor="#888" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>📞 Перший дзвінок через (хв):</Text>
                <TextInput 
                  style={styles.input} 
                  value={firstCallMinutes} 
                  onChangeText={setFirstCallMinutes} 
                  keyboardType="numeric" 
                  placeholder="Наприклад: 1 або 0.1" 
                  placeholderTextColor="#888" 
                />
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Повторні дзвінки для порятунку:</Text>
                <TouchableOpacity style={styles.addButton} onPress={addSubsequentCall}>
                  <MaterialIcons name="add" size={18} color="#FFF" />
                  <Text style={styles.addButtonText}>Додати дзвінок (+)</Text>
                </TouchableOpacity>
              </View>

              {subsequentIntervals.map((val, index) => (
                <View key={index} style={styles.subsequentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>
                      {index === 0 
                        ? `Дзвінок №2: через скільки хв. після попереднього:` 
                        : `Дзвінок №${index + 2}: через скільки хв. після попереднього:`}
                    </Text>
                    <TextInput 
                      style={styles.input} 
                      value={val} 
                      onChangeText={(text) => updateSubsequentInterval(text, index)} 
                      keyboardType="numeric" 
                      placeholder="3" 
                      placeholderTextColor="#888" 
                    />
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => removeSubsequentCall(index)}>
                    <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={[styles.inputGroup, { marginTop: 15 }]}>
                <Text style={styles.label}>Тип дзвінка (UI):</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity style={[styles.typeButton, callType === 'phone' && styles.typeButtonActive]} onPress={() => setCallType('phone')}><Text style={styles.typeText}>📞 Телефон</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.typeButton, callType === 'viber' && styles.typeButtonActive]} onPress={() => setCallType('viber')}><Text style={styles.typeText}>🟣 Viber</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.typeButton, callType === 'telegram' && styles.typeButtonActive]} onPress={() => setCallType('telegram')}><Text style={styles.typeText}>✈️ Telegram</Text></TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Мелодія дзвінка (Рингтон):</Text>
                <TouchableOpacity style={styles.fileButton} onPress={pickAudio}>
                  <Text style={styles.fileButtonText}>{audioName ? `🎵 ${audioName}` : '📁 Вибрати файл рингтона (+)'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Голос у трубці після підняття:</Text>
                <TouchableOpacity style={styles.fileButton} onPress={pickVoiceMessage}>
                  <Text style={styles.fileButtonText}>{voiceName ? `🎙️ ${voiceName}` : '📁 Вибрати запис голосу для розмови (+)'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveTemplateButton} onPress={saveCurrentAsTemplate}>
                <MaterialIcons name="bookmark-border" size={18} color="#60A5FA" />
                <Text style={styles.saveTemplateText}>Зберегти поточні налаштування як шаблон 💾</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.startButton} onPress={handleStartQueueAction}>
                <Text style={styles.startButtonText}>Запустити чергу дзвінків ⏳</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 20, paddingTop: 30, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: 15 },
  subtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  
  templatesContainer: { marginBottom: 20, backgroundColor: '#18181b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#3f3f46' },
  templateTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  templateSub: { color: '#a1a1aa', fontSize: 11, marginTop: 2 },
  playTemplateBtn: { backgroundColor: '#22C55E', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  deleteTemplateBtn: { marginLeft: 8, padding: 4 },

  compactActiveCard: { backgroundColor: '#1e1b4b', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#3730a3', marginTop: 10 },
  compactHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 15 },
  compactTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  compactSub: { color: '#c7d2fe', fontSize: 13, fontWeight: '600', marginTop: 2 },
  compactMeta: { color: '#93c5fd', fontSize: 11, marginTop: 2 },

  queueListContainer: { backgroundColor: '#0f172a', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  queueListTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  queueItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  queueItemActive: { backgroundColor: 'rgba(74, 222, 128, 0.1)', paddingHorizontal: 6, borderRadius: 6 },
  queueItemText: { color: '#94A3B8', fontSize: 12, marginLeft: 6 },
  queueItemTextActive: { color: '#4ADE80', fontWeight: 'bold' },
  queueItemTimer: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  queueItemTimerActive: { color: '#4ADE80', fontSize: 14, fontWeight: 'bold' },

  backgroundHintBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e3a8a', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#3b82f6' },
  backgroundHintText: { color: '#93c5fd', fontSize: 12, marginLeft: 8, flex: 1 },

  imageSection: { alignItems: 'center', marginBottom: 20 },
  imageContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  placeholderAvatar: { backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  placeholderText: { color: '#aaa', fontSize: 14 },
  imageHint: { color: '#777', fontSize: 12, marginTop: 8 },
  inputGroup: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A8A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3B82F6' },
  addButtonText: { color: '#60A5FA', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  subsequentRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, backgroundColor: '#1a1a1a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2c2c2c' },
  subLabel: { color: '#bbb', fontSize: 12, marginBottom: 6, lineHeight: 16 },
  deleteButton: { marginLeft: 10, paddingBottom: 10, paddingHorizontal: 5 },
  label: { color: '#ddd', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  typeButton: { flex: 1, backgroundColor: '#1e1e1e', paddingVertical: 12, marginHorizontal: 4, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  typeButtonActive: { borderColor: '#007AFF', backgroundColor: '#007AFF22' },
  typeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fileButton: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  fileButtonText: { color: '#34C759', fontSize: 14, fontWeight: '600' },
  saveTemplateButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', marginBottom: 15 },
  saveTemplateText: { color: '#60A5FA', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  startButton: { backgroundColor: '#34C759', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButtonBottom: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButtonBottomText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});