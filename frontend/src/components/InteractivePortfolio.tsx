import * as React from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { CustomChatWidget } from './CustomChatWidget';
import { TelemetryPopoffs, useTelemetry } from './TelemetryPopoffs';
import '@livekit/components-styles';

import { Home } from './Home';
import PortfolioSections from './PortfolioSections';
import type { ResumeRoot, SiteConfigRoot } from '../lib/types';

import { AgentController } from './AgentController';

type Props = {
  resume: ResumeRoot;
  config: SiteConfigRoot;
};

export function InteractivePortfolio({ resume, config }: Props) {
  const { events, triggerTelemetry } = useTelemetry();
  const [tokenInfo, setTokenInfo] = React.useState<{token: string, ws_url: string} | null>(null);
  
  // State for internal navigation
  const [activeSection, setActiveSection] = React.useState<string>('all'); 
  // 'all' could show everything scrolled, or we can use specific section names like 'work', 'projects'

  React.useEffect(() => {
    // We will connect to the local Python backend
    // For now, this is a placeholder URL that assumes a local token endpoint
    // In production, this would hit the fastAPI/Livekit token generator
    fetch('http://localhost:8000/token?room_name=alex-portfolio&identity=user-' + Math.floor(Math.random() * 10000))
      .then(res => res.json())
      .then(data => setTokenInfo({ token: data.token, ws_url: data.ws_url }))
      .catch(console.error);
  }, []);

  const handleNavigate = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="interactive-portfolio w-full flex-1">
      {/* Main Content Rendered always */}
      <div className="main-content-wrapper flex-1 min-w-0">
        <Home basics={resume.basics} />
        <div className="min-h-[3000px]">
          <PortfolioSections resume={resume} config={config} />
        </div>
      </div>
      
      {/* Conditionally render LiveKit pieces when token is available */}
      {tokenInfo ? (
        <LiveKitRoom
          serverUrl={tokenInfo.ws_url}
          token={tokenInfo.token}
          connect={true}
          audio={true}
          video={false}
          style={{ display: 'contents' }}
        >
          <AgentController />
          <CustomChatWidget />
          <RoomAudioRenderer />
          <TelemetryPopoffs events={events} />
        </LiveKitRoom>
      ) : (
        <div className="fixed bottom-4 right-4 bg-muted text-muted-foreground p-3 rounded-lg text-sm z-50">
          Connecting to Voice Agent...
        </div>
      )}
    </div>
  );
}
