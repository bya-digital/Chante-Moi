"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_DURATION_SECONDS = 120;

interface VoiceRecorderProps {
  onTranscribed: (transcript: string) => void;
}

export function VoiceRecorder({ onTranscribed }: VoiceRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "recorded" | "transcribing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        setStatus("recorded");
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_DURATION_SECONDS) stopRecording();
          return e + 1;
        });
      }, 1000);
    } catch {
      toast.error("Impossible d'accéder au microphone. Vérifiez les autorisations du navigateur.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function reset() {
    blobRef.current = null;
    setStatus("idle");
    setElapsed(0);
  }

  async function transcribe() {
    if (!blobRef.current) return;
    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blobRef.current, "story.webm");
      form.append("language", "fr");
      const res = await fetch("/api/story/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la transcription");
      onTranscribed(data.cleanedStory ?? data.transcript);
      toast.success("Histoire transcrite avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la transcription");
      setStatus("recorded");
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
      {status === "idle" && (
        <>
          <Button
            type="button"
            size="lg"
            onClick={startRecording}
            className="h-16 w-16 rounded-full p-0 shadow-lg shadow-primary/20"
          >
            <Mic className="h-6 w-6" />
          </Button>
          <p className="text-sm text-muted-foreground">Appuyez pour commencer à raconter votre histoire</p>
        </>
      )}

      {status === "recording" && (
        <>
          <Button
            type="button"
            size="lg"
            variant="destructive"
            onClick={stopRecording}
            className="h-16 w-16 animate-pulse rounded-full p-0"
          >
            <Square className="h-5 w-5" />
          </Button>
          <p className="font-mono text-sm text-muted-foreground">
            {mm}:{ss} / {String(Math.floor(MAX_DURATION_SECONDS / 60)).padStart(2, "0")}:00
          </p>
        </>
      )}

      {status === "recorded" && (
        <>
          <audio controls src={blobRef.current ? URL.createObjectURL(blobRef.current) : undefined} className="w-full max-w-xs" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Réenregistrer
            </Button>
            <Button type="button" onClick={transcribe}>
              Utiliser cet enregistrement
            </Button>
          </div>
        </>
      )}

      {status === "transcribing" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Transcription en cours...</p>
        </>
      )}
    </div>
  );
}
