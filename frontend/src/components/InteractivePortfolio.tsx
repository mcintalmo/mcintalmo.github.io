import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import * as React from "react";
import { CustomChatWidget } from "./CustomChatWidget";
import { TelemetryPopoffs, useTelemetry } from "./TelemetryPopoffs";
import "@livekit/components-styles";

import type { ResumeRoot, SiteConfigRoot } from "../lib/types";
import { AgentController } from "./AgentController";
import { Home } from "./Home";
import PortfolioSections from "./PortfolioSections";

// WebRTC local development patch to allow Firefox to connect to dockerized LiveKit server
if (typeof window !== "undefined") {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.") ||
    window.location.hostname.startsWith("172.");

  if (isLocalhost) {
    const getTargetHost = (): string => {
      const globalTarget = (window as unknown as Record<string, unknown>)
        .webrtcTargetHost;
      return typeof globalTarget === "string" ? globalTarget : window.location.hostname;
    };
    const privateIpRegex =
      /(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|0\.0\.0\.0)/g;

    const rewriteCandidate = (candidateStr: string): string => {
      privateIpRegex.lastIndex = 0;
      if (!privateIpRegex.test(candidateStr)) return candidateStr;

      const host = getTargetHost();
      privateIpRegex.lastIndex = 0;
      return candidateStr.replace(privateIpRegex, host);
    };

    const rewriteSdp = (sdp: string): string => {
      const lines = sdp.split("\r\n");
      const host = getTargetHost();
      const rewrittenLines = lines.map((line) => {
        if (line.startsWith("a=candidate:")) {
          return rewriteCandidate(line);
        }
        privateIpRegex.lastIndex = 0;
        return line.replace(privateIpRegex, host);
      });
      return rewrittenLines.join("\r\n");
    };

    const originalSetRemoteDescription =
      RTCPeerConnection.prototype.setRemoteDescription;
    RTCPeerConnection.prototype.setRemoteDescription = function (
      this: RTCPeerConnection,
      description: RTCSessionDescriptionInit,
    ) {
      let finalDescription = description;
      if (description && typeof description.sdp === "string") {
        const originalSdp = description.sdp;
        const newSdp = rewriteSdp(originalSdp);
        if (newSdp !== originalSdp) {
          const host = getTargetHost();
          console.log(
            "[WebRTC Patch] Rewrote remote description SDP private IPs to:",
            host,
          );
          finalDescription = {
            type: description.type,
            sdp: newSdp,
          } as RTCSessionDescriptionInit;
        }
      }
      // biome-ignore lint/suspicious/noExplicitAny: monkey patch requires casting to call with arbitrary args
      return (originalSetRemoteDescription as any).apply(this, [finalDescription]);
    };

    const originalAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
    RTCPeerConnection.prototype.addIceCandidate = function (
      this: RTCPeerConnection,
      candidate?: RTCIceCandidateInit | RTCIceCandidate | string | null,
      ...args: unknown[]
    ) {
      let finalCandidate = candidate;
      if (candidate) {
        let candidateStr = "";
        let isInitObj = false;

        if (typeof candidate === "string") {
          candidateStr = candidate;
        } else if (
          candidate &&
          typeof candidate === "object" &&
          "candidate" in candidate &&
          candidate.candidate
        ) {
          candidateStr = candidate.candidate;
          isInitObj = true;
        }

        if (candidateStr) {
          const newCandidateStr = rewriteCandidate(candidateStr);
          if (newCandidateStr !== candidateStr) {
            const host = getTargetHost();
            console.log("[WebRTC Patch] Rewrote remote candidate IP to:", host);
            if (isInitObj && candidate && typeof candidate === "object") {
              finalCandidate = {
                candidate: newCandidateStr,
                sdpMid:
                  "sdpMid" in candidate ? (candidate as RTCIceCandidate).sdpMid : null,
                sdpMLineIndex:
                  "sdpMLineIndex" in candidate
                    ? (candidate as RTCIceCandidate).sdpMLineIndex
                    : null,
                usernameFragment:
                  "usernameFragment" in candidate
                    ? (candidate as RTCIceCandidate).usernameFragment
                    : null,
              } as RTCIceCandidateInit;
            } else {
              finalCandidate = {
                candidate: newCandidateStr,
              } as RTCIceCandidateInit;
            }
          }
        }
      }
      // biome-ignore lint/suspicious/noExplicitAny: monkey patch requires casting to call with arbitrary args
      return (originalAddIceCandidate as any).apply(this, [finalCandidate, ...args]);
    };
  }
}

type Props = {
  resume: ResumeRoot;
  config: SiteConfigRoot;
};

export function InteractivePortfolio({ resume, config }: Props) {
  const { events } = useTelemetry();
  const [tokenInfo, setTokenInfo] = React.useState<{
    token: string;
    ws_url: string;
    local_ip?: string;
  } | null>(null);
  const [shouldConnect, setShouldConnect] = React.useState(false);

  React.useEffect(() => {
    if (tokenInfo?.ws_url) {
      try {
        const url = new URL(tokenInfo.ws_url);
        const isFirefox =
          typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("firefox");
        if (isFirefox && tokenInfo.local_ip) {
          (window as unknown as Record<string, unknown>).webrtcTargetHost =
            tokenInfo.local_ip;
        } else {
          (window as unknown as Record<string, unknown>).webrtcTargetHost =
            url.hostname;
        }
      } catch (e) {
        console.error("Failed to parse token ws_url for WebRTC target:", e);
      }
    }
  }, [tokenInfo]);

  // Firefox WebRTC loopback redirect helper for local development
  React.useEffect(() => {
    if (tokenInfo?.local_ip && tokenInfo.local_ip !== "127.0.0.1") {
      const isFirefox =
        typeof navigator !== "undefined" &&
        navigator.userAgent.toLowerCase().includes("firefox");
      const isLoopback =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]";
      if (isFirefox && isLoopback) {
        const newUrl = new URL(window.location.href);
        newUrl.hostname = tokenInfo.local_ip;
        console.log(
          `[Firefox Dev Helper] Redirecting to LAN IP to allow WebRTC loopback: ${newUrl.toString()}`,
        );
        window.location.replace(newUrl.toString());
      }
    }
  }, [tokenInfo]);

  // State for internal navigation
  const [_activeSection, setActiveSection] = React.useState<string>("all");
  // 'all' could show everything scrolled, or we can use specific section names like 'work', 'projects'

  const roomNameRef = React.useRef<string | null>(null);

  const fetchToken = React.useCallback(() => {
    if (!roomNameRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      roomNameRef.current =
        urlParams.get("room") ||
        `portfolio-${Math.random().toString(36).substring(2, 11)}`;
    }
    const roomName = roomNameRef.current;
    const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
    fetch(
      `${apiUrl}/token?room_name=${roomName}&identity=user-` +
        Math.floor(Math.random() * 10000),
    )
      .then((res) => res.json())
      .then((data) =>
        setTokenInfo({
          token: data.token,
          ws_url: data.ws_url,
          local_ip: data.local_ip,
        }),
      )
      .catch(console.error);
  }, []);

  const handleStartInteraction = React.useCallback(() => {
    setShouldConnect(true);
    if (!tokenInfo) {
      fetchToken();
    }
  }, [tokenInfo, fetchToken]);

  React.useEffect(() => {
    const handleHeroSubmit = () => {
      handleStartInteraction();
    };
    window.addEventListener("hero-prompt-submit", handleHeroSubmit);
    return () => window.removeEventListener("hero-prompt-submit", handleHeroSubmit);
  }, [handleStartInteraction]);

  const _handleNavigate = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="interactive-portfolio w-full flex-1">
      {/* Main Content Rendered always */}
      <div className="main-content-wrapper flex-1 min-w-0">
        <Home
          basics={resume.basics}
          recommendedQuestions={config.agent?.["recommended-questions"]}
        />
        <div className="min-h-[3000px]">
          <PortfolioSections resume={resume} config={config} />
        </div>
      </div>

      <LiveKitRoom
        serverUrl={tokenInfo?.ws_url}
        token={tokenInfo?.token}
        connect={shouldConnect && !!tokenInfo?.token && !!tokenInfo?.ws_url}
        audio={false}
        video={false}
        style={{ display: "contents" }}
      >
        <AgentController />
        <CustomChatWidget
          onStartInteraction={handleStartInteraction}
          recommendedQuestions={config.agent?.["recommended-questions"]}
        />
        <RoomAudioRenderer />
        <TelemetryPopoffs events={events} />
      </LiveKitRoom>
    </div>
  );
}
