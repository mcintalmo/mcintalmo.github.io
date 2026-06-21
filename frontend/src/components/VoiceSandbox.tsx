import {
  Chat,
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Bot, LogOut, Mic, RefreshCw, Volume2, Wifi, WifiOff } from "lucide-react";
import * as React from "react";
import "@livekit/components-styles";
import { useInputControls } from "../hooks/agents-ui/use-agent-control-bar";
import { AgentAudioVisualizerAura } from "./agents-ui/agent-audio-visualizer-aura";
import { AgentDisconnectButton } from "./agents-ui/agent-disconnect-button";
import { AgentTrackControl } from "./agents-ui/agent-track-control";

// Internal sub-component that uses RoomContext safely inside LiveKitRoom
const SandboxInner = () => {
  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const {
    microphoneTrack,
    microphoneToggle,
    handleAudioDeviceChange,
    handleMicrophoneDeviceSelectError,
  } = useInputControls();

  const micEnabled = microphoneToggle.enabled;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
      {/* Voice Assistant Visualizer & Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40 text-center flex flex-col items-center">
          <div className="relative mb-6">
            <div
              className={`absolute -inset-1 rounded-full opacity-35 blur-sm transition-all duration-500 ${
                state === "speaking"
                  ? "bg-emerald-500 animate-pulse"
                  : state === "listening"
                    ? "bg-accent-cyan animate-pulse"
                    : "bg-accent-indigo"
              }`}
            />
            <div className="relative bg-slate-950 p-6 rounded-full border border-slate-800">
              <Bot
                className={`h-12 w-12 transition-colors duration-300 ${
                  state === "speaking"
                    ? "text-emerald-400"
                    : state === "listening"
                      ? "text-accent-cyan"
                      : "text-slate-400"
                }`}
              />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white capitalize">{state || "idle"}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {state === "speaking"
              ? "Agent is speaking to you..."
              : state === "listening"
                ? "Speak now, agent is listening..."
                : state === "thinking"
                  ? "Agent is processing response..."
                  : "Voice agent is connected and waiting."}
          </p>

          {/* Visualizer widget */}
          <div className="h-28 w-full mt-6 flex items-center justify-center bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800/60 relative">
            {audioTrack ? (
              <AgentAudioVisualizerAura
                state={state}
                audioTrack={audioTrack}
                className="h-full"
              />
            ) : (
              <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                <Volume2 className="h-5 w-5 opacity-40" />
                No audio track active
              </div>
            )}
          </div>

          <div className="w-full border-t border-slate-800/80 my-6" />

          {/* Connection status table */}
          <div className="w-full text-left space-y-2.5 text-xs text-slate-400">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Room Session</span>
              <span className="font-mono text-white">{room.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Participant Name</span>
              <span className="font-mono text-white">
                {room.localParticipant.identity}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Microphone Status</span>
              <span
                className={`font-semibold flex items-center gap-1 ${micEnabled ? "text-emerald-400" : "text-amber-500"}`}
              >
                <Mic className="h-3.5 w-3.5" />
                {micEnabled ? "Active" : "Muted"}
              </span>
            </div>
          </div>

          {/* Control Bar */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800/40 flex justify-center gap-2 items-center">
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
              className="rounded-full bg-slate-950 border border-slate-800/60 [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full hover:bg-slate-900/40"
            />
            <AgentDisconnectButton
              variant="destructive"
              className="rounded-full bg-red-950/40 border border-red-900/30 hover:border-red-500 hover:bg-red-950/60 text-red-300 text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer shadow-lg shadow-red-950/20"
            >
              <span>END CALL</span>
            </AgentDisconnectButton>
          </div>
        </div>
      </div>

      {/* Chat logs panel */}
      <div className="lg:col-span-2 flex flex-col h-[550px] glass-panel rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            Live Agent Interaction Logs
          </span>
          <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/20">
            text + voice synchronization
          </span>
        </div>
        <div className="flex-1 overflow-hidden bg-slate-950 flex flex-col">
          <Chat />
        </div>
      </div>
    </div>
  );
};

export const VoiceSandbox = () => {
  const [tokenInfo, setTokenInfo] = React.useState<{
    token: string;
    ws_url: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState(false);

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${apiUrl}/token?room_name=alex-chat&identity=sandbox-user-${Math.floor(
          Math.random() * 1000,
        )}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch connection token: status ${response.status}`);
      }
      const data = await response.json();
      setTokenInfo({ token: data.token, ws_url: data.ws_url });
      setConnected(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch LiveKit token. Ensure auth server is running on port 8000.",
      );
    } finally {
      setLoading(false);
    }
  };

  const endSession = () => {
    setConnected(false);
    setTokenInfo(null);
  };

  return (
    <div className="voice-sandbox max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-accent-indigo to-accent-cyan">
            <Mic className="h-8 w-8 text-accent-cyan" />
            Voice Agent Playground & Sandbox
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Debug and evaluate the voice assistant agent in real-time. Test
            speech-to-text, text-to-speech, and tool triggers.
          </p>
        </div>

        {connected && (
          <button
            type="button"
            onClick={endSession}
            className="flex items-center gap-2 bg-red-950/40 border border-red-900/30 hover:border-red-500 hover:bg-red-950/60 text-red-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Disconnect Session
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 items-center">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={startSession}
            className="underline font-semibold ml-auto hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!connected ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 bg-slate-900/40 text-center max-w-xl mx-auto mt-12 flex flex-col items-center">
          <div className="bg-slate-950 p-6 rounded-full border border-slate-800 mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-accent-cyan/10 animate-ping opacity-75" />
            <Mic className="h-10 w-10 text-accent-cyan" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Initialize Voice Agent Session
          </h2>
          <p className="text-slate-400 text-xs mb-8 leading-relaxed max-w-sm">
            To start evaluating the voice system, click the button below. This will
            fetch a session token from the local auth server and connect to LiveKit.
          </p>
          <button
            type="button"
            onClick={startSession}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-accent-indigo to-accent-cyan hover:opacity-90 active:scale-95 px-6 py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-accent-indigo/15"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                Establish Agent Connection
              </>
            )}
          </button>
        </div>
      ) : (
        tokenInfo && (
          <LiveKitRoom
            serverUrl={tokenInfo.ws_url}
            token={tokenInfo.token}
            connect={true}
            audio={true}
            video={false}
            style={{ display: "contents" }}
          >
            <SandboxInner />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )
      )}
    </div>
  );
};
