/**
 * WebRTC local development patch to allow Firefox and local LAN clients
 * to connect to a dockerized or local LiveKit server.
 */

let patchApplied = false;

export function applyWebRtcDevPatch(): void {
  if (
    typeof window === "undefined" ||
    typeof RTCPeerConnection === "undefined" ||
    patchApplied
  ) {
    return;
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.") ||
    window.location.hostname.startsWith("172.");

  if (!isLocalhost) return;
  patchApplied = true;

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

  const originalSetRemoteDescription = RTCPeerConnection.prototype.setRemoteDescription;
  RTCPeerConnection.prototype.setRemoteDescription = function (
    this: RTCPeerConnection,
    description: RTCSessionDescriptionInit,
  ) {
    let finalDescription = description;
    if (description && typeof description.sdp === "string") {
      const originalSdp = description.sdp;
      const newSdp = rewriteSdp(originalSdp);
      if (newSdp !== originalSdp) {
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
