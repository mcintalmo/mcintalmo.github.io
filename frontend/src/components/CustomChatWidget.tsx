import * as React from 'react';
import { Chat, VoiceAssistantControlBar, BarVisualizer, useChat, useVoiceAssistant, useRoomContext } from '@livekit/components-react';
import { Bot, X, Maximize2, Minimize2, SquarePen, Mic, MessageSquareText } from 'lucide-react';
import { Button } from './ui/button';

export function CustomChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [chatMode, setChatMode] = React.useState<'text' | 'voice'>('text');
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  
  const room = useRoomContext();
  const { send } = useChat();
  const { state, audioTrack } = useVoiceAssistant();
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);

  const handleNewChat = () => {
    console.log("New chat initiated");
  };

  const enableVoiceMode = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      setChatMode('voice');
    } catch (e) {
      console.error("Microphone permission denied", e);
      setChatMode('text');
    }
  };

  React.useEffect(() => {
    if (isOpen && pendingMessage && send) {
      send(pendingMessage).catch(console.error);
      setPendingMessage(null);
    }
  }, [isOpen, pendingMessage, send]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open-chat') === 'true' || urlParams.get('expand') === 'true') {
      setIsOpen(true);
      if (urlParams.get('expand') === 'true') setIsExpanded(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleHeroSubmit = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsOpen(true);
      
      if (detail?.mode === 'voice') {
        enableVoiceMode();
      } else if (detail?.message) {
        setChatMode('text');
        setPendingMessage(detail.message);
      }
    };

    window.addEventListener('hero-prompt-submit', handleHeroSubmit);
    return () => window.removeEventListener('hero-prompt-submit', handleHeroSubmit);
  }, [room]);

  React.useEffect(() => {
    if (isOpen) document.body.classList.add('chat-open');
    else document.body.classList.remove('chat-open');
    if (isExpanded) document.body.classList.add('chat-expanded');
    else document.body.classList.remove('chat-expanded');

    return () => {
      document.body.classList.remove('chat-open');
      document.body.classList.remove('chat-expanded');
    };
  }, [isOpen, isExpanded]);

  const showFab = !isOpen;

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`transition-all duration-500 ease-in-out border-l bg-background hidden md:block shrink-0 fixed top-0 right-0 h-[100dvh] z-40 ${
          isOpen 
            ? (isExpanded ? 'w-full !z-[60] translate-x-0' : 'w-[400px] opacity-100 translate-x-0') 
            : 'w-[400px] opacity-0 translate-x-full pointer-events-none'
        }`}
      >
        <div className={`h-full flex flex-col shadow-2xl glass-panel ${isExpanded ? 'w-full' : 'w-[400px]'}`}>
          <div className="p-4 pt-[4.5rem] border-b flex justify-between items-center z-10 bg-background/95 backdrop-blur">
            <h2 className="font-semibold flex items-center gap-2 font-sans text-lg">
              <Bot className="h-6 w-6 text-accent-cyan animate-pulse" /> 
              Alex's AI Agent
              {state === 'speaking' && <Mic className="h-4 w-4 text-green-500 animate-pulse ml-2" />}
            </h2>
            <div className="flex items-center gap-1">
              <Button 
                variant={chatMode === 'text' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setChatMode('text')}
                title="Text Chat"
              >
                <MessageSquareText className="h-4 w-4" />
              </Button>
              <Button 
                variant={chatMode === 'voice' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={enableVoiceMode}
                title="Voice Chat"
              >
                <Mic className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-border mx-1"></div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive" onClick={() => { setIsOpen(false); setIsExpanded(false); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative pb-24 flex flex-col">
             <div className="flex-1 overflow-y-auto">
               <Chat />
             </div>
             
             {chatMode === 'voice' && (
               <div className="p-4 border-t bg-background flex flex-col items-center gap-4">
                 {state !== 'disconnected' && (
                   <div className="h-24 w-full flex items-center justify-center bg-muted/30 rounded-xl overflow-hidden">
                     <BarVisualizer state={state} barCount={7} trackRef={audioTrack} className="h-full w-full" />
                   </div>
                 )}
                 <VoiceAssistantControlBar />
               </div>
             )}
          </div>
        </div>
      </div>

      {showFab && (
        <Button 
          id="chat-fab"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 flex items-center justify-center p-0 hover:scale-105 transition-transform bg-gradient-to-r from-accent-indigo to-accent-cyan text-white"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}
