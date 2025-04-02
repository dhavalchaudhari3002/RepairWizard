import React, { useState, useRef } from "react";
import { AlertCircle, Mic, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "@/hooks/use-toast";

interface AudioUploadProps {
  onAudioCaptured: (audioData: string) => void;
  onAudioRemoved?: () => void;
  existingAudio?: string;
  className?: string;
}

const AudioUpload: React.FC<AudioUploadProps> = ({
  onAudioCaptured,
  onAudioRemoved,
  existingAudio,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(existingAudio || null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start audio recording
  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Audio = e.target?.result as string;
          setAudioPreview(base64Audio);
          onAudioCaptured(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Automatically stop recording after 15 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
          toast({
            title: "Recording complete",
            description: "Maximum recording length reached (15 seconds)",
          });
        }
      }, 15000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setRecordingError("Could not access microphone. Please check permissions.");
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle audio file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Audio file must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Audio = e.target?.result as string;
      setAudioPreview(base64Audio);
      onAudioCaptured(base64Audio);
    };
    reader.readAsDataURL(file);
  };

  // Remove audio
  const removeAudio = () => {
    setAudioPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onAudioRemoved) {
      onAudioRemoved();
    }
  };

  // Trigger file input click
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`w-full ${className || ''}`}>
      <input 
        type="file" 
        ref={fileInputRef}
        accept="audio/*" 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {recordingError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{recordingError}</AlertDescription>
        </Alert>
      )}

      {!audioPreview ? (
        <div className="flex gap-2 mb-2">
          {isRecording ? (
            <Button 
              onClick={stopRecording} 
              variant="destructive" 
              className="flex items-center gap-2"
            >
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Stop Recording
            </Button>
          ) : (
            <>
              <Button 
                onClick={startRecording} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Record Sound
              </Button>
              <Button 
                onClick={triggerFileUpload} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Audio
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="border rounded-md p-3 mb-3 bg-muted/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Audio Recording</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={removeAudio} 
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <audio controls className="w-full h-10">
            <source src={audioPreview} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default AudioUpload;