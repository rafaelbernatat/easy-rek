import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Stage } from './components/Stage';
import { ControlBar } from './components/ControlBar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { PreviewModal } from './components/PreviewModal';
import { useUserMedia } from './hooks/useUserMedia';
import { useDisplayMedia } from './hooks/useDisplayMedia';
import { useMultiRecorder } from './hooks/useMultiRecorder';
import { useCompositor } from './hooks/useCompositor';
import { LayoutConfig, CameraSize, BackgroundStyle, CameraShape, BorderType, ShadowStyle, ProjectMetadata } from './types';
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    cameraShape: CameraShape.HORIZONTAL,
    cameraSize: CameraSize.MEDIUM,
    background: BackgroundStyle.GRADIENT_1,
    border: BorderType.ROUNDED,
    shadow: ShadowStyle.SOFT,
    cameraTransform: {
      x: 0.73,
      y: 0.65,
      width: 0.25,
      height: 0.30, 
      aspectRatio: 16/9
    },
    // Default Screen Transform with Padding
    screenTransform: {
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
      aspectRatio: 16/9
    }
  });

  const [metadata, setMetadata] = useState<ProjectMetadata>({
    name: ''
  });

  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Media Hooks
  const { 
    stream: userStream, 
    error: userMediaError, 
    toggleAudio, 
    toggleVideo, 
    isAudioEnabled, 
    isVideoEnabled,
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setAudioDevice,
    setVideoDevice,
    retryMedia,
    stopUserMedia
  } = useUserMedia();

  const { 
    stream: displayStream, 
    error: displayMediaError, 
    startDisplayMedia, 
    stopDisplayMedia 
  } = useDisplayMedia();

  // Create Composite Stream
  const compositeStream = useCompositor({
    userStream,
    displayStream,
    layoutConfig
  });

  // Recorder Hook
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordings,
    clearRecordings
  } = useMultiRecorder({ userStream, displayStream, compositeStream });

  // Effects
  useEffect(() => {
    if (displayStream) {
      displayStream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
        stopDisplayMedia();
      };
    }
  }, [displayStream, isRecording, stopRecording, stopDisplayMedia]);

  useEffect(() => {
    if (pendingStart) {
      if (displayStream) {
        startRecording();
        setPendingStart(false);
      } else if (displayMediaError) {
        setPendingStart(false);
      }
    }
  }, [pendingStart, displayStream, displayMediaError, startRecording]);

  // Transition to Preview when recordings are ready
  useEffect(() => {
    if (recordings) {
        setShowPreview(true);
    }
  }, [recordings]);

  const handleStartRecording = async () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }
    if (!displayStream) {
      setPendingStart(true);
      await startDisplayMedia();
    } else {
      startRecording();
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const startEditing = () => {
    // Release live resources when starting to edit
    stopUserMedia();
    stopDisplayMedia();
    setShowPreview(false);
    setIsEditing(true);
  };

  const closeEditor = () => {
    // Refresh the page to reset media state properly or implement restart logic
    // For simplicity in this architecture, a reload is often safest to reset WebRTC states
    window.location.reload(); 
  };

  const closePreview = () => {
    setShowPreview(false);
    clearRecordings();
    // User might want to record again with same streams
  };

  if (isEditing && recordings) {
    return (
        <Editor 
            recordings={recordings}
            initialLayoutConfig={layoutConfig}
            onClose={closeEditor}
        />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Error Banner for Camera/Mic */}
      {userMediaError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <div>
                <p className="font-semibold text-sm">Camera/Microphone Access Denied</p>
                <p className="text-xs opacity-90">Please allow access in your browser settings.</p>
            </div>
            <button 
              onClick={retryMedia} 
              className="ml-2 p-2 hover:bg-red-100 rounded-lg transition-colors text-red-700"
              title="Retry Access"
            >
              <RefreshCw size={16} />
            </button>
        </div>
      )}

      {/* Error Banner for Screen Share */}
      {displayMediaError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <div>
                <p className="font-semibold text-sm">Screen Recording Failed</p>
                <p className="text-xs opacity-90">{displayMediaError.message || "Permission denied or cancelled."}</p>
            </div>
            <button 
              onClick={() => startDisplayMedia()} 
              className="ml-2 p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-800"
              title="Retry"
            >
              <RefreshCw size={16} />
            </button>
        </div>
      )}

      {showPreview && recordings && (
        <PreviewModal 
            recordings={recordings} 
            onClose={closePreview} 
            onEdit={startEditing}
        />
      )}

      <div className="flex-1 flex flex-col relative h-full">
        <Layout>
          <Stage 
            userStream={userStream}
            displayStream={displayStream}
            layoutConfig={layoutConfig}
            onLayoutConfigChange={setLayoutConfig}
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
          />
        </Layout>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl flex justify-center">
          <ControlBar 
            isRecording={isRecording}
            recordingTime={recordingTime}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            hasDisplayStream={!!displayStream}
            audioDevices={audioDevices}
            videoDevices={videoDevices}
            selectedAudioId={selectedAudioId}
            selectedVideoId={selectedVideoId}
            userStream={userStream}
            displayStream={displayStream}
            mediaError={userMediaError}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreen={displayStream ? stopDisplayMedia : startDisplayMedia}
            onStartRecording={handleStartRecording}
            onAudioDeviceChange={setAudioDevice}
            onVideoDeviceChange={setVideoDevice}
          />
        </div>
      </div>

      <Sidebar 
        layoutConfig={layoutConfig} 
        onChange={setLayoutConfig}
        metadata={metadata}
        onMetadataChange={setMetadata}
        isRecording={isRecording}
      />
    </div>
  );
};

export default App;