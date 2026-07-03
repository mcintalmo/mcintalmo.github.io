import {
  type AgentState,
  type TrackReferenceOrPlaceholder,
  useChat,
  useRoomContext,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import {
  AudioLines,
  Bot,
  Maximize2,
  MessageSquareText,
  Mic,
  Minimize2,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useInputControls } from "../hooks/agents-ui/use-agent-control-bar";
import { AgentAudioVisualizerWave } from "./agents-ui/agent-audio-visualizer-wave";
import { AgentTrackControl } from "./agents-ui/agent-track-control";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";

type UnifiedMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: number;
};

import type { SuggestedQuestion } from "../lib/types";

interface CustomChatWidgetProps {
  onStartInteraction?: () => void;
  recommendedQuestions?: SuggestedQuestion[];
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  onresult: (event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal: boolean;
        length: number;
        [index: number]: { transcript: string };
      };
    };
  }) => void;
  start: () => void;
  stop: () => void;
}

interface VoicePanelInnerProps {
  state: AgentState;
  audioTrack: TrackReferenceOrPlaceholder | undefined;
  chatMode: "text" | "voice";
  enableTextMode: () => void;
  enableVoiceMode: () => void;
}

function VoicePanelInner({
  state,
  audioTrack,
  chatMode,
  enableTextMode,
  enableVoiceMode,
}: VoicePanelInnerProps) {
  const {
    microphoneTrack,
    microphoneToggle,
    handleAudioDeviceChange,
    handleMicrophoneDeviceSelectError,
  } = useInputControls();

  const { theme } = useTheme();
  const visualizerColor = theme === "dark" ? "#22d3ee" : "#0284c7";

  const getStatusText = () => {
    switch (state) {
      case "connecting":
        return "Connecting to Voice Agent...";
      case "listening":
        return "Listening... Speak now";
      case "thinking":
        return "Thinking...";
      case "speaking":
        return "Agent is speaking...";
      default:
        return "Voice chat ready";
    }
  };

  return (
    <div className="p-4 border-t bg-background flex flex-col items-center gap-4 w-full">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 animate-pulse h-4 flex items-center justify-center">
        {getStatusText()}
      </div>
      {state !== "disconnected" && (
        <div className="h-24 w-full flex items-center justify-center bg-muted/30 rounded-xl overflow-hidden relative">
          <AgentAudioVisualizerWave
            state={state}
            audioTrack={audioTrack}
            size="sm"
            color={visualizerColor}
            className="w-full h-full !aspect-auto"
          />
        </div>
      )}
      <div className="flex items-center gap-4 w-full justify-between">
        {/* Bottom Toggle in Voice Mode */}
        <div className="relative flex bg-muted/60 p-0.5 rounded-full border border-border/10 w-20 h-8 items-center cursor-pointer select-none shrink-0">
          <div
            className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-background rounded-full shadow-sm border border-border/10 transition-all duration-300 ease-out ${
              chatMode === "text" ? "left-0.5" : "left-[calc(50%)]"
            }`}
          />
          <button
            type="button"
            onClick={enableTextMode}
            className={`flex-1 flex justify-center items-center h-full relative z-10 transition-colors duration-300 rounded-full focus:outline-hidden ${
              chatMode === "text"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Text Chat"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={enableVoiceMode}
            className={`flex-1 flex justify-center items-center h-full relative z-10 transition-colors duration-300 rounded-full focus:outline-hidden ${
              chatMode === "voice"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Voice Chat"
          >
            <AudioLines className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          id="voice-assistant-control-bar"
          className="flex-1 flex justify-end items-center gap-2"
        >
          <AgentTrackControl
            kind="audioinput"
            source="microphone"
            variant="outline"
            pressed={microphoneToggle.enabled}
            disabled={microphoneToggle.pending}
            audioTrack={microphoneTrack}
            onPressedChange={microphoneToggle.toggle}
            onActiveDeviceChange={handleAudioDeviceChange}
            onMediaDeviceError={handleMicrophoneDeviceSelectError}
            className="rounded-full bg-background border border-border/10 [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full hover:bg-muted/30"
          />
        </div>
      </div>
    </div>
  );
}

export function CustomChatWidget({
  onStartInteraction,
  recommendedQuestions,
}: CustomChatWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [chatMode, setChatMode] = React.useState<"text" | "voice">(() => {
    if (typeof window !== "undefined") {
      const pending = (window as unknown as Record<string, unknown>).pendingChatMode;
      if (pending === "voice" || pending === "text") {
        delete (window as unknown as Record<string, unknown>).pendingChatMode;
        return pending;
      }
    }
    return "text";
  });
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const room = useRoomContext();
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).room = room;
    }
  }, [room]);
  const { chatMessages, send, isSending } = useChat();
  const transcriptions = useTranscriptions();
  const { state, audioTrack } = useVoiceAssistant();
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);
  const [isAgentOnline, setIsAgentOnline] = React.useState(false);

  const [unifiedMessages, setUnifiedMessages] = React.useState<UnifiedMessage[]>([]);
  const hasUserMessages = React.useMemo(() => {
    return unifiedMessages.some((msg) => msg.sender === "user");
  }, [unifiedMessages]);
  const [followups, setFollowups] = React.useState<SuggestedQuestion[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic === "portfolio.followups") {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          if (data && Array.isArray(data.questions)) {
            const normalized = data.questions.map((q: unknown) => {
              if (typeof q === "string") return { title: q, prompt: q };
              const obj = q as { title?: string; prompt?: string };
              return {
                title: obj?.title || obj?.prompt || "",
                prompt: obj?.prompt || obj?.title || "",
              };
            });
            setFollowups(normalized);
          }
        } catch (e) {
          console.error("Failed to parse followups:", e);
        }
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room]);
  const textInputRef = React.useRef<HTMLInputElement>(null);
  const [roomState, setRoomState] = React.useState(room.state);

  // Dictation state and SpeechRecognition initialization
  const [isDictating, setIsDictating] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = ((window as unknown as Record<string, unknown>)
        .SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
        | (new () => SpeechRecognitionInstance)
        | undefined;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsDictating(true);
        };

        rec.onend = () => {
          setIsDictating(false);
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error", e);
          setIsDictating(false);
        };

        rec.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (textInputRef.current) {
            const baseText = textInputRef.current.getAttribute("data-base-text") || "";
            textInputRef.current.value = baseText + finalTranscript + interimTranscript;
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen && recognitionRef.current && isDictating) {
      recognitionRef.current.stop();
    }
  }, [isOpen, isDictating]);

  const toggleDictation = React.useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isDictating) {
      recognitionRef.current.stop();
    } else {
      if (textInputRef.current) {
        textInputRef.current.setAttribute("data-base-text", textInputRef.current.value);
      }
      recognitionRef.current.start();
    }
  }, [isDictating]);

  const isConnecting =
    roomState === "connecting" || (roomState === "connected" && !isAgentOnline);

  React.useEffect(() => {
    const updateStatus = () => {
      setIsAgentOnline(room.remoteParticipants.size > 0);
      setRoomState(room.state);
    };

    updateStatus();
    room.on("participantConnected", updateStatus);
    room.on("participantDisconnected", updateStatus);
    room.on("connectionStateChanged", updateStatus);

    return () => {
      room.off("participantConnected", updateStatus);
      room.off("participantDisconnected", updateStatus);
      room.off("connectionStateChanged", updateStatus);
    };
  }, [room]);

  const enableVoiceMode = React.useCallback(async () => {
    try {
      if (recognitionRef.current && isDictating) {
        recognitionRef.current.stop();
      }

      // Proactive Microphone Permission Check
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          for (const track of stream.getTracks()) {
            track.stop(); // release immediately
          }
        } catch (err) {
          console.warn("Microphone permission denied:", err);
          toast.error("Microphone Access Blocked", {
            description:
              "Microphone access is required for voice mode. Please click the lock/settings icon in the browser address bar, allow microphone access, and try again.",
          });
          setChatMode("text");
          return;
        }
      }

      if (room.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      setChatMode("voice");
    } catch (e) {
      console.error("Failed to enable voice mode:", e);
      toast.error("Microphone Access Blocked", {
        description:
          "Please click the lock/settings icon in the browser address bar, set 'Microphone' to 'Allow', and reload.",
      });
      setChatMode("text");
    }
  }, [room, isDictating]);

  const enableTextMode = React.useCallback(async () => {
    try {
      if (room.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
      setChatMode("text");
    } catch (e) {
      console.error("Error disabling microphone", e);
      setChatMode("text");
    }
  }, [room]);

  // Ensure microphone is enabled when the room is connected and we are in voice mode
  React.useEffect(() => {
    if (
      chatMode === "voice" &&
      room.localParticipant &&
      !room.localParticipant.isMicrophoneEnabled
    ) {
      room.localParticipant.setMicrophoneEnabled(true).catch((e) => {
        console.error("Failed to enable mic on room connection:", e);
        toast.error("Microphone Access Blocked", {
          description:
            "Please click the lock/settings icon in the browser address bar, set 'Microphone' to 'Allow', and reload.",
        });
        setChatMode("text");
      });
    }
  }, [chatMode, room.localParticipant]);

  // Sync chat mode with backend agent via RPC
  React.useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncChatMode = async (retries = 5, delay = 500) => {
      if (!active) return;
      const agentParticipant = Array.from(room.remoteParticipants.values())[0];
      if (agentParticipant && room.localParticipant) {
        try {
          await room.localParticipant.performRpc({
            destinationIdentity: agentParticipant.identity,
            method: "set_chat_mode",
            payload: JSON.stringify({ mode: chatMode }),
          });
          console.log(`Successfully sync'd chat mode ${chatMode} to agent`);
        } catch (e) {
          console.warn(
            `Failed to sync chat mode to agent (retries left: ${retries}):`,
            e,
          );
          if (retries > 0 && active) {
            timeoutId = setTimeout(() => {
              syncChatMode(retries - 1, delay * 1.5);
            }, delay);
          }
        }
      } else if (retries > 0 && active) {
        // Agent or local participant not yet present, retry shortly
        timeoutId = setTimeout(() => {
          syncChatMode(retries - 1, delay);
        }, delay);
      }
    };

    syncChatMode();

    const handleParticipantConnected = () => {
      syncChatMode();
    };

    room.on("participantConnected", handleParticipantConnected);
    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      room.off("participantConnected", handleParticipantConnected);
    };
  }, [room, chatMode]);

  // Unify and de-duplicate chatMessages and transcriptions
  React.useEffect(() => {
    setUnifiedMessages((prev) => {
      const msgMap = new Map<string, UnifiedMessage>();
      for (const m of prev) {
        msgMap.set(m.id, m);
      }

      // 1. Process chatMessages (text chat)
      for (const msg of chatMessages) {
        const id = msg.id || `${msg.timestamp}-${msg.message}`;
        const isLocal = msg.from?.isLocal ?? false;

        // In voice mode, we ignore assistant chat messages because they will be covered by transcriptions
        if (chatMode === "voice" && !isLocal) {
          continue;
        }

        const isDuplicate = Array.from(msgMap.values()).some(
          (m) => m.text.trim() === msg.message.trim(),
        );
        if (isDuplicate) {
          continue;
        }

        msgMap.set(id, {
          id,
          sender: isLocal ? "user" : "assistant",
          text: msg.message,
          timestamp: msg.timestamp,
        });
      }

      // 2. Process transcriptions (voice chat)
      for (const trans of transcriptions) {
        const segmentId =
          trans.streamInfo?.attributes?.["lk.segment_id"] ||
          trans.streamInfo?.id ||
          Math.random().toString();
        const isLocal =
          trans.participantInfo?.identity === room.localParticipant?.identity;

        if (!trans.text.trim()) {
          continue;
        }

        const isDuplicate = Array.from(msgMap.values()).some(
          (m) => m.id !== segmentId && m.text.trim() === trans.text.trim(),
        );
        if (isDuplicate) {
          const dup = Array.from(msgMap.values()).find(
            (m) => m.id !== segmentId && m.text.trim() === trans.text.trim(),
          );
          if (dup) {
            msgMap.delete(dup.id);
          }
        }

        msgMap.set(segmentId, {
          id: segmentId,
          sender: isLocal ? "user" : "assistant",
          text: trans.text,
          timestamp: msgMap.get(segmentId)?.timestamp || Date.now(),
        });
      }

      return Array.from(msgMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    });
  }, [chatMessages, transcriptions, room.localParticipant?.identity, chatMode]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on changes
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [unifiedMessages, state]);

  const handleSuggestedQuestionClick = React.useCallback(
    async (question: string) => {
      if (isSending || isConnecting || !isAgentOnline) return;
      if (recognitionRef.current && isDictating) {
        recognitionRef.current.stop();
      }
      setFollowups([]);
      await send(question);
    },
    [send, isSending, isConnecting, isAgentOnline, isDictating],
  );

  // Handle manual text sending
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recognitionRef.current && isDictating) {
      recognitionRef.current.stop();
    }
    const inputEl = textInputRef.current;
    if (inputEl?.value.trim()) {
      const text = inputEl.value.trim();
      inputEl.value = "";
      setFollowups([]);
      await send(text);
      inputEl.focus();
    }
  };

  React.useEffect(() => {
    if (isOpen && pendingMessage && isAgentOnline && send) {
      send(pendingMessage).catch(console.error);
      setPendingMessage(null);
    }
  }, [isOpen, pendingMessage, isAgentOnline, send]);

  const openChat = React.useCallback(() => {
    setIsOpen(true);
    onStartInteraction?.();
  }, [onStartInteraction]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("open-chat") === "true" || urlParams.get("expand") === "true") {
      openChat();
      if (urlParams.get("expand") === "true") setIsExpanded(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleHeroSubmit = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      openChat();

      if (detail?.mode === "voice") {
        enableVoiceMode();
      } else if (detail?.message) {
        enableTextMode();
        setPendingMessage(detail.message);
      }
    };

    window.addEventListener("hero-prompt-submit", handleHeroSubmit);
    return () => window.removeEventListener("hero-prompt-submit", handleHeroSubmit);
  }, [enableVoiceMode, enableTextMode, openChat]);

  React.useEffect(() => {
    if (isOpen) document.body.classList.add("chat-open");
    else document.body.classList.remove("chat-open");
    if (isExpanded) document.body.classList.add("chat-expanded");
    else document.body.classList.remove("chat-expanded");

    return () => {
      document.body.classList.remove("chat-open");
      document.body.classList.remove("chat-expanded");
    };
  }, [isOpen, isExpanded]);

  const showFab = !isOpen;

  return (
    <>
      <div
        ref={sidebarRef}
        className={`transition-all duration-500 ease-in-out border-l bg-background hidden md:block shrink-0 fixed top-0 right-0 h-[100dvh] z-40 ${
          isOpen
            ? isExpanded
              ? "w-full !z-[60] translate-x-0"
              : "w-[400px] opacity-100 translate-x-0"
            : "w-[400px] opacity-0 translate-x-full pointer-events-none"
        }`}
      >
        <div
          className={`h-full flex flex-col shadow-2xl glass-panel ${isExpanded ? "w-full" : "w-[400px]"}`}
        >
          <div className="p-4 pt-[4.5rem] border-b flex justify-between items-center z-10 bg-background/95 backdrop-blur">
            <h2 className="font-semibold flex items-center gap-2 font-sans text-lg">
              <Bot className="h-6 w-6 text-accent-cyan animate-pulse" />
              Alex's AI Agent
              <span
                id="agent-status"
                className={`text-xs ml-2 ${
                  isAgentOnline
                    ? "text-green-500 font-medium"
                    : isConnecting
                      ? "text-yellow-500 font-medium animate-pulse"
                      : "text-muted-foreground"
                }`}
              >
                {isAgentOnline
                  ? "(Online)"
                  : isConnecting
                    ? "(Connecting...)"
                    : "(Offline)"}
              </span>
              {state === "speaking" && (
                <AudioLines className="h-4 w-4 text-green-500 animate-pulse ml-2" />
              )}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-grow overflow-y-auto p-4">
              <div className="flex flex-col justify-end min-h-full space-y-4">
                {unifiedMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center p-4 space-y-6 my-auto">
                    <div className="p-4 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-accent-indigo animate-bounce duration-3000">
                      <Bot className="h-8 w-8 text-accent-cyan" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-base font-semibold font-sans text-foreground">
                        Ask Alex's AI Assistant
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                        I can tell you about Alex's professional experience, educational
                        background, or skills. Try selecting one of the questions below
                        or typing your own.
                      </p>
                    </div>
                  </div>
                )}
                {unifiedMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`lk-chat-entry flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                      data-lk-message-origin={isUser ? "local" : "remote"}
                    >
                      <div
                        className={`lk-message-body rounded-2xl px-4 py-2.5 max-w-[85%] text-sm shadow-sm border ${
                          isUser
                            ? "bg-gradient-to-r from-accent-indigo to-primary text-white rounded-br-none border-primary/20"
                            : "bg-card text-foreground rounded-bl-none border-border/30"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {!hasUserMessages &&
                  recommendedQuestions &&
                  recommendedQuestions.length > 0 && (
                    <div className="w-full space-y-2 pt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium text-left px-1 font-sans">
                        Suggested Questions
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {recommendedQuestions.map((q) => (
                          <button
                            key={q.prompt}
                            type="button"
                            onClick={() => handleSuggestedQuestionClick(q.prompt)}
                            disabled={isSending || isConnecting || !isAgentOnline}
                            className="w-full text-left p-3 text-xs rounded-xl border border-border/40 bg-card/50 hover:bg-accent-indigo/5 hover:border-accent-indigo/20 transition-all duration-200 text-foreground/80 hover:text-foreground font-medium flex items-center justify-between group cursor-pointer shadow-xs disabled:opacity-50 disabled:pointer-events-none font-sans"
                          >
                            <span className="truncate">{q.title}</span>
                            <span className="text-muted-foreground group-hover:text-accent-indigo transition-colors duration-200 shrink-0 ml-1 text-[10px]">
                              →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {hasUserMessages && followups && followups.length > 0 && (
                  <div className="w-full space-y-2 pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium text-left px-1 font-sans">
                      Suggested Follow-ups
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {followups.map((q) => (
                        <button
                          key={q.prompt}
                          type="button"
                          onClick={() => handleSuggestedQuestionClick(q.prompt)}
                          disabled={isSending || isConnecting || !isAgentOnline}
                          className="px-3 py-1.5 text-[11px] rounded-full border border-border/40 bg-card/60 hover:bg-accent-indigo/5 hover:border-accent-indigo/20 transition-all duration-200 text-foreground/80 hover:text-foreground font-medium cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-sans"
                        >
                          {q.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {state === "thinking" && (
                  <div className="flex justify-start">
                    <div className="bg-card text-muted-foreground rounded-2xl px-4 py-2.5 max-w-[85%] text-sm rounded-bl-none flex items-center gap-1.5 shadow-sm border border-border/30">
                      <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce duration-1000"></span>
                      <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce duration-1000 delay-150"></span>
                      <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce duration-1000 delay-300"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {chatMode === "text" && (
              <form
                onSubmit={handleSend}
                className="p-4 border-t bg-background flex gap-2 items-center"
              >
                {/* Bottom Toggle in Text Mode */}
                <div className="relative flex bg-muted/60 p-0.5 rounded-full border border-border/10 w-20 h-8 items-center cursor-pointer select-none shrink-0">
                  <div className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-background rounded-full shadow-sm border border-border/10 transition-all duration-300 ease-out left-0.5" />
                  <button
                    type="button"
                    onClick={enableTextMode}
                    className="flex-1 flex justify-center items-center h-full relative z-10 transition-colors duration-300 rounded-full focus:outline-hidden text-foreground"
                    title="Text Chat"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={enableVoiceMode}
                    className="flex-1 flex justify-center items-center h-full relative z-10 transition-colors duration-300 rounded-full focus:outline-hidden text-muted-foreground hover:text-foreground"
                    title="Voice Chat"
                  >
                    <AudioLines className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Input Field wrapper for Dictation */}
                <div className="relative flex-1 min-w-0 flex items-center">
                  <input
                    id="chat-message-input"
                    name="message"
                    ref={textInputRef}
                    type="text"
                    placeholder={
                      isConnecting
                        ? "Connecting to agent..."
                        : !isAgentOnline
                          ? "Agent offline. Click FAB to connect."
                          : "Type a message..."
                    }
                    disabled={isSending || isConnecting || !isAgentOnline}
                    className="lk-chat-form-input w-full pr-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onInput={(ev) => ev.stopPropagation()}
                    onKeyDown={(ev) => ev.stopPropagation()}
                    onKeyUp={(ev) => ev.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={toggleDictation}
                    disabled={isSending || isConnecting || !isAgentOnline}
                    className={`absolute right-2 p-1.5 rounded-full hover:bg-muted transition-colors ${
                      isDictating
                        ? "text-red-500 animate-pulse bg-red-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isDictating ? "Stop Dictation" : "Dictate text"}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isSending || isConnecting || !isAgentOnline}
                >
                  {isConnecting ? "Connecting" : "Send"}
                </Button>
              </form>
            )}

            {chatMode === "voice" && roomState !== "disconnected" && (
              <VoicePanelInner
                state={state}
                audioTrack={audioTrack}
                chatMode={chatMode}
                enableTextMode={enableTextMode}
                enableVoiceMode={enableVoiceMode}
              />
            )}
          </div>
        </div>
      </div>

      {showFab && (
        <Button
          id="chat-fab"
          onClick={openChat}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 flex items-center justify-center p-0 hover:scale-105 transition-transform bg-gradient-to-r from-accent-indigo to-accent-cyan text-white"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}
