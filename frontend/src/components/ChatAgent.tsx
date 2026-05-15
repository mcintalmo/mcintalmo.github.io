import * as React from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { CustomChatWidget } from './CustomChatWidget';
import { TelemetryPopoffs, useTelemetry } from './TelemetryPopoffs';
import '@livekit/components-styles';

export const ChatAgent = () => {
  const { events, triggerTelemetry } = useTelemetry();
  const [tokenInfo, setTokenInfo] = React.useState<{token: string, ws_url: string} | null>(null);

  React.useEffect(() => {
    (window as any).__triggerTelemetry = triggerTelemetry;
    return () => { 
      delete (window as any).__triggerTelemetry; 
    };
  }, [triggerTelemetry]);

  React.useEffect(() => {
    // Fetch token from local FastAPI backend
    fetch('http://localhost:8000/token?room_name=alex-chat&identity=user-' + Math.floor(Math.random() * 10000))
      .then(res => res.json())
      .then(data => setTokenInfo({ token: data.token, ws_url: data.ws_url }))
      .catch(console.error);
  }, []);

  if (!tokenInfo) {
    return null; // or a loading spinner
  }

  return (
    <LiveKitRoom
      serverUrl={tokenInfo.ws_url}
      token={tokenInfo.token}
      connect={true}
      audio={true}
      video={false}
      style={{ display: 'contents' }}
    >
      <CustomChatWidget />
      <RoomAudioRenderer />
      <TelemetryPopoffs events={events} />
    </LiveKitRoom>
  );
};
