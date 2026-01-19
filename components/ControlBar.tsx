"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Square,
  Circle,
  ChevronUp,
  Check,
  AlertCircle,
  FlipHorizontal,
} from "lucide-react";
import { clsx } from "clsx";
import { MediaDevice } from "@/types";
import { useAudioLevel } from "@/hooks/useAudioLevel.next";

interface ControlBarProps {
  isRecording: boolean;
  recordingTime: number;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  hasDisplayStream: boolean;
  audioDevices: MediaDevice[];
  videoDevices: MediaDevice[];
  selectedAudioId: string;
  selectedVideoId: string;
  userStream: MediaStream | null;
  displayStream: MediaStream | null;
  mediaError?: Error | null; // Added prop
  isMirrored: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onStartRecording: () => void;
  onAudioDeviceChange: (id: string) => void;
  onVideoDeviceChange: (id: string) => void;
  onToggleMirror: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const AudioMeter: React.FC<{
  level: number;
  active: boolean;
  colorClass?: string;
}> = ({ level, active, colorClass = "bg-green-500" }) => {
  return (
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
      {active && (
        <div
          className={clsx("h-full transition-all duration-75", colorClass)}
          style={{ width: `${Math.min(100, level * 100)}%` }}
        />
      )}
    </div>
  );
};

export const ControlBar: React.FC<ControlBarProps> = ({
  isRecording,
  recordingTime,
  isAudioEnabled,
  isVideoEnabled,
  hasDisplayStream,
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  userStream,
  displayStream,
  mediaError,
  isMirrored,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onStartRecording,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onToggleMirror,
}) => {
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  const audioMenuRef = useRef<HTMLDivElement>(null);
  const videoMenuRef = useRef<HTMLDivElement>(null);

  const micLevel = useAudioLevel(userStream);
  const systemAudioLevel = useAudioLevel(displayStream);
  const hasSystemAudio = displayStream?.getAudioTracks().length
    ? displayStream.getAudioTracks().length > 0
    : false;

  const hasError = !!mediaError;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        audioMenuRef.current &&
        !audioMenuRef.current.contains(event.target as Node)
      ) {
        setShowAudioMenu(false);
      }
      if (
        videoMenuRef.current &&
        !videoMenuRef.current.contains(event.target as Node)
      ) {
        setShowVideoMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 ring-1 ring-black/5 transition-all relative">
      {/* Audio Controls */}
      <div
        className="flex items-center bg-slate-100 rounded-xl relative group"
        ref={audioMenuRef}
      >
        <button
          onClick={onToggleAudio}
          className={clsx(
            "p-3 rounded-l-xl transition-colors relative",
            isAudioEnabled
              ? "text-slate-700 hover:bg-slate-200"
              : "text-red-500 hover:bg-red-100 bg-red-50",
          )}
          title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          <AudioMeter level={micLevel} active={isAudioEnabled} />
        </button>
        <div className="w-px h-6 bg-slate-300"></div>
        <button
          onClick={() => setShowAudioMenu(!showAudioMenu)}
          className="p-1.5 pr-2 rounded-r-xl hover:bg-slate-200 text-slate-500"
        >
          <ChevronUp
            size={14}
            className={clsx(
              "transition-transform",
              showAudioMenu && "rotate-180",
            )}
          />
        </button>

        {showAudioMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              Microphones
            </div>
            {audioDevices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => {
                  onAudioDeviceChange(device.deviceId);
                  setShowAudioMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center justify-between group"
              >
                <span className="truncate">{device.label}</span>
                {selectedAudioId === device.deviceId && (
                  <Check size={14} className="text-purple-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Controls with Mirror Toggle */}
      <div
        className="flex items-center bg-slate-100 rounded-xl relative"
        ref={videoMenuRef}
      >
        <button
          onClick={onToggleMirror}
          disabled={isRecording}
          className={clsx(
            "p-3 rounded-l-xl transition-colors",
            isMirrored
              ? "text-indigo-600 hover:bg-indigo-100"
              : "text-slate-500 hover:bg-slate-200",
            isRecording && "opacity-50 cursor-not-allowed",
          )}
          title={isMirrored ? "Disable Camera Mirror" : "Enable Camera Mirror"}
        >
          <FlipHorizontal size={20} />
        </button>
        <div className="w-px h-6 bg-slate-300"></div>
        <button
          onClick={onToggleVideo}
          className={clsx(
            "p-3 transition-colors",
            hasError
              ? "text-red-600 bg-red-100 hover:bg-red-200" // Error state
              : isVideoEnabled
                ? "text-slate-700 hover:bg-slate-200"
                : "text-red-500 hover:bg-red-100 bg-red-50", // Normal off state
          )}
          title={
            hasError
              ? "Camera Unavailable"
              : isVideoEnabled
                ? "Turn Off Camera"
                : "Turn On Camera"
          }
        >
          {hasError ? (
            <AlertCircle size={20} />
          ) : isVideoEnabled ? (
            <Video size={20} />
          ) : (
            <VideoOff size={20} />
          )}
        </button>
        <div className="w-px h-6 bg-slate-300"></div>
        <button
          onClick={() => setShowVideoMenu(!showVideoMenu)}
          className="p-1.5 pr-2 rounded-r-xl hover:bg-slate-200 text-slate-500"
        >
          <ChevronUp
            size={14}
            className={clsx(
              "transition-transform",
              showVideoMenu && "rotate-180",
            )}
          />
        </button>

        {showVideoMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              Cameras
            </div>
            {videoDevices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => {
                  onVideoDeviceChange(device.deviceId);
                  setShowVideoMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center justify-between group"
              >
                <span className="truncate">{device.label}</span>
                {selectedVideoId === device.deviceId && (
                  <Check size={14} className="text-purple-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Screen Share Toggle */}
      <div className="relative">
        <button
          onClick={onToggleScreen}
          disabled={isRecording}
          className={clsx(
            "p-3 rounded-xl transition-colors relative",
            hasDisplayStream
              ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            isRecording && "opacity-50 cursor-not-allowed",
          )}
          title="Share Screen"
        >
          {hasDisplayStream ? <MonitorOff size={20} /> : <Monitor size={20} />}
          <AudioMeter
            level={systemAudioLevel}
            active={hasSystemAudio}
            colorClass="bg-purple-500"
          />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-slate-200 mx-2" />

      {/* Record Button */}
      <div className="flex items-center gap-3">
        {isRecording && (
          <div className="font-mono font-medium text-red-500 w-12 text-center">
            {formatTime(recordingTime)}
          </div>
        )}

        <button
          onClick={onStartRecording}
          disabled={!userStream && !hasDisplayStream && !isRecording}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg",
            isRecording
              ? "bg-white border-2 border-red-500 text-red-500 hover:bg-red-50"
              : "bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/25",
            !userStream &&
              !hasDisplayStream &&
              !isRecording &&
              "opacity-50 cursor-not-allowed grayscale",
          )}
        >
          {isRecording ? (
            <>
              <Square size={18} fill="currentColor" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Circle size={18} fill="currentColor" />
              <span>Rec</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
