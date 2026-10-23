import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SetupScreen } from './src/screens/SetupScreen';
import { CallScreen } from './src/screens/CallScreen';

type CallType = 'phone' | 'viber' | 'telegram';

interface QueueItemData {
  id: string;
  number: number;
  minutes: number;
  status: 'waiting' | 'active' | 'completed';
}

export default function App() {
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [callParams, setCallParams] = useState({
    callerName: 'Мама',
    callerImage: null as string | null,
    callType: 'phone' as CallType,
    audioUri: null as string | null,
    audioName: null as string | null,
    voiceUri: null as string | null,
    voiceName: null as string | null,
  });

  // Повна черга дзвінків
  const [queueItems, setQueueItems] = useState<QueueItemData[]>([]);
  const [isQueueActive, setIsQueueActive] = useState<boolean>(false);
  const [currentWaitSeconds, setCurrentWaitSeconds] = useState<number>(0);

  // Запуск черги з налаштувань (приймає повний набір аргументів із SetupScreen)
  const handleStartQueue = (
    name: string, 
    image: string | null, 
    type: CallType, 
    audioUri: string | null, 
    audioName: string | null, 
    voiceUri: string | null, 
    voiceName: string | null, 
    intervals: number[]
  ) => {
    if (intervals.length === 0) return;

    setCallParams({
      callerName: name,
      callerImage: image,
      callType: type,
      audioUri,
      audioName,
      voiceUri,
      voiceName,
    });

    // Формуємо масив черги для відображення
    const builtQueue: QueueItemData[] = intervals.map((mins, idx) => ({
      id: String(idx + 1),
      number: idx + 1,
      minutes: mins,
      status: idx === 0 ? 'active' : 'waiting',
    }));

    setQueueItems(builtQueue);
    setIsQueueActive(true);

    // Перший інтервал у секундах
    setCurrentWaitSeconds(Math.round(intervals[0] * 60));
  };

  // Коли таймер очікування добіг кінця — відкриваємо дзвінок
  const handleTimerFinished = () => {
    setTimeout(() => {
      setIsInCall(true);
    }, 0);
  };

  // КОЛИ ДЗВІНОК ЗАВЕРШИВСЯ (ти поклав трубку)
  const handleEndCall = () => {
    setIsInCall(false);

    // Оновлюємо статус черги: перший елемент стає виконаним, наступний — активним
    setQueueItems(prev => {
      const activeIndex = prev.findIndex(item => item.status === 'active');
      const updated = [...prev];

      if (activeIndex !== -1) {
        updated[activeIndex].status = 'completed';
      }

      const nextActiveIndex = updated.findIndex(item => item.status === 'waiting');
      
      if (nextActiveIndex !== -1) {
        // Є наступний дзвінок у черзі! Вмикаємо його статус і задаємо час
        updated[nextActiveIndex].status = 'active';
        setTimeout(() => {
          setCurrentWaitSeconds(Math.round(updated[nextActiveIndex].minutes * 60));
          setIsQueueActive(true);
        }, 0);
        return updated;
      } else {
        // ДЗВІНКИ СКІНЧИЛИСЯ: повністю закриваємо плашку черги
        setTimeout(() => {
          setIsQueueActive(false);
          setCurrentWaitSeconds(0);
        }, 0);
        return [];
      }
    });
  };

  return (
    <>
      <StatusBar style="light" />
      {isInCall ? (
        <CallScreen
          callerName={callParams.callerName}
          callerImage={callParams.callerImage}
          callType={callParams.callType}
          audioUri={callParams.audioUri}
          voiceUri={callParams.voiceUri}
          onEndCall={handleEndCall}
        />
      ) : (
        <SetupScreen 
          onStartCall={handleStartQueue} 
          isQueueActive={isQueueActive}
          initialSeconds={currentWaitSeconds}
          queueItems={queueItems}
          callerName={callParams.callerName}
          callType={callParams.callType}
          audioName={callParams.audioName}
          voiceName={callParams.voiceName}
          onTimerFinished={handleTimerFinished}
          onCancelQueue={() => {
            setIsQueueActive(false);
            setCurrentWaitSeconds(0);
            setQueueItems([]);
          }}
        />
      )}
    </>
  );
}