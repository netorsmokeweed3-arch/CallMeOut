import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SetupScreen } from './src/screens/SetupScreen';
import CallScreen from './src/screens/CallScreen';

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

  const [queueItems, setQueueItems] = useState<QueueItemData[]>([]);
  const [isQueueActive, setIsQueueActive] = useState<boolean>(false);
  const [currentWaitSeconds, setCurrentWaitSeconds] = useState<number>(0);

  // Перевірка натискання на сповіщення при відкритті з фону або заблокованого екрана
  useEffect(() => {
    // 1. Перевірка, чи додаток відкрився саме через тап по сповіщенню (з холодного стану)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data && data.openCallScreen) {
          setIsInCall(true);
        }
      }
    });

    // 2. Слухачі подій у реальному часі (коли додаток згорнутий або активний)
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.openCallScreen) {
        setIsInCall(true);
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener(_notification => {
      setIsInCall(true);
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

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

    const builtQueue: QueueItemData[] = intervals.map((mins, idx) => ({
      id: String(idx + 1),
      number: idx + 1,
      minutes: mins,
      status: idx === 0 ? 'active' : 'waiting',
    }));

    setQueueItems(builtQueue);
    setIsQueueActive(true);
    
    const exactSeconds = Math.round(intervals[0] * 60);
    setCurrentWaitSeconds(exactSeconds);
  };

  const handleTimerFinished = () => {
    setIsInCall(true);
  };

  const handleEndCall = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setIsInCall(false);

    setQueueItems(prev => {
      const activeIndex = prev.findIndex(item => item.status === 'active');
      const updated = [...prev];

      if (activeIndex !== -1) {
        updated[activeIndex].status = 'completed';
      }

      const nextActiveIndex = updated.findIndex(item => item.status === 'waiting');
      
      if (nextActiveIndex !== -1) {
        updated[nextActiveIndex].status.toString(); // maintain type safety
        updated[nextActiveIndex].status = 'active';
        const nextMinutes = updated[nextActiveIndex].minutes;
        const nextSeconds = Math.round(nextMinutes * 60);

        setTimeout(() => {
          setCurrentWaitSeconds(nextSeconds);
          setIsQueueActive(true);
        }, 150);

        return updated;
      } else {
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
          onCancelQueue={async () => {
            await Notifications.cancelAllScheduledNotificationsAsync();
            setIsQueueActive(false);
            setCurrentWaitSeconds(0);
            setQueueItems([]);
          }}
        />
      )}
    </>
  );
}