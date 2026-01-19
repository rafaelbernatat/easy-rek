import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaDevice } from '../types';

export const useUserMedia = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const activeStreamRef = useRef<MediaStream | null>(null);

  const getDevices = useCallback(async () => {
    try {
      // In some browsers, enumerateDevices returns empty labels before permission is granted.
      // We call this after permission success as well.
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0,5)}...` })));
      setVideoDevices(devices.filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0,5)}...` })));
    } catch (e) {
      console.error("Error enumerating devices", e);
    }
  }, []);

  // Initialize or restart stream when devices change
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      // Stop old tracks immediately before requesting new ones to release hardware
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      setStream(null);
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          video: selectedVideoId 
            ? { deviceId: { exact: selectedVideoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        };

        const userStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (mounted) {
          activeStreamRef.current = userStream;
          setStream(userStream);
          setError(null);
          
          // Apply current toggle state
          userStream.getAudioTracks().forEach(t => t.enabled = isAudioEnabled);
          userStream.getVideoTracks().forEach(t => t.enabled = isVideoEnabled);
          
          // Refresh devices now that we have permissions
          getDevices();
        } else {
            // Component unmounted while waiting
            userStream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        if (mounted) {
          console.error("Error accessing user media:", err);
          setError(err as Error);
          // Try getting devices anyway (labels might be missing, but we can see availability)
          getDevices();
        }
      }
    };

    initMedia();

    return () => {
      mounted = false;
      // Cleanup happens in next run or unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId, selectedVideoId, retryCount]); // Add retryCount to dependency array

  // Handle toggles effect
  useEffect(() => {
      if (stream) {
          stream.getAudioTracks().forEach(t => t.enabled = isAudioEnabled);
          stream.getVideoTracks().forEach(t => t.enabled = isVideoEnabled);
      }
  }, [isAudioEnabled, isVideoEnabled, stream]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => getDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [getDevices]);
  
  // Final cleanup
  useEffect(() => {
      return () => {
          if (activeStreamRef.current) {
              activeStreamRef.current.getTracks().forEach(t => t.stop());
          }
      };
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled(prev => !prev);
  }, []);
  
  const retryMedia = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  const stopUserMedia = useCallback(() => {
      if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(t => t.stop());
          activeStreamRef.current = null;
          setStream(null);
      }
  }, []);

  return { 
    stream, 
    error, 
    toggleAudio, 
    toggleVideo, 
    isAudioEnabled, 
    isVideoEnabled,
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setAudioDevice: setSelectedAudioId,
    setVideoDevice: setSelectedVideoId,
    retryMedia,
    stopUserMedia
  };
};