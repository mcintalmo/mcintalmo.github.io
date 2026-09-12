import React from "react";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

export interface UseDictationOptions {
  inputRef: React.RefObject<HTMLInputElement | null>;
  lang?: string;
}

export interface UseDictationReturn {
  isDictating: boolean;
  toggleDictation: () => void;
  stopDictation: () => void;
}

export function useDictation({
  inputRef,
  lang = "en-US",
}: UseDictationOptions): UseDictationReturn {
  const [isDictating, setIsDictating] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  const getOrCreateRecognition = React.useCallback(() => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }
    if (typeof window === "undefined") {
      return null;
    }

    const SpeechRecognition = ((window as unknown as Record<string, unknown>)
      .SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
      | (new () => SpeechRecognitionInstance)
      | undefined;

    if (!SpeechRecognition) {
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      setIsDictating(true);
    };

    rec.onend = () => {
      setIsDictating(false);
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e);
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

      if (inputRef.current) {
        const baseText = inputRef.current.getAttribute("data-base-text") || "";
        inputRef.current.value = baseText + finalTranscript + interimTranscript;
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, [inputRef, lang]);

  const stopDictation = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Error stopping speech recognition:", err);
      }
    }
    setIsDictating(false);
  }, []);

  const toggleDictation = React.useCallback(() => {
    const rec = getOrCreateRecognition();
    if (!rec) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isDictating) {
      stopDictation();
    } else {
      if (inputRef.current) {
        inputRef.current.setAttribute("data-base-text", inputRef.current.value);
      }
      try {
        rec.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setIsDictating(false);
      }
    }
  }, [isDictating, getOrCreateRecognition, stopDictation, inputRef]);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on unmount
        }
      }
    };
  }, []);

  return {
    isDictating,
    toggleDictation,
    stopDictation,
  };
}
