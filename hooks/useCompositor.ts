import { useEffect, useRef, useState } from 'react';
import { BackgroundStyle, LayoutConfig, CameraShape } from '../types';

interface UseCompositorProps {
  userStream: MediaStream | null;
  displayStream: MediaStream | null;
  layoutConfig: LayoutConfig;
}

export const useCompositor = ({ userStream, displayStream, layoutConfig }: UseCompositorProps) => {
  const [compositeStream, setCompositeStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const displayVideoRef = useRef<HTMLVideoElement | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const userVid = document.createElement('video');
    userVid.muted = true;
    userVid.autoplay = true;
    userVid.playsInline = true;
    userVideoRef.current = userVid;

    const displayVid = document.createElement('video');
    displayVid.muted = true;
    displayVid.autoplay = true;
    displayVid.playsInline = true;
    displayVideoRef.current = displayVid;

    return () => {
      if (userVid.srcObject) (userVid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      if (displayVid.srcObject) (displayVid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (userVideoRef.current && userStream) {
      userVideoRef.current.srcObject = userStream;
      userVideoRef.current.play().catch(e => console.log('Composite user play err', e));
    }
  }, [userStream]);

  useEffect(() => {
    if (displayVideoRef.current && displayStream) {
      displayVideoRef.current.srcObject = displayStream;
      displayVideoRef.current.play().catch(e => console.log('Composite display play err', e));
    }
  }, [displayStream]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    canvasRef.current = canvas;

    const stream = canvas.captureStream(30); 
    
    if (displayStream) {
      displayStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    if (userStream) {
       userStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }

    setCompositeStream(stream);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // 1. Draw Background
      if (layoutConfig.background === BackgroundStyle.SOLID_DARK) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (layoutConfig.background === BackgroundStyle.BLURRED) {
        ctx.fillStyle = '#e2e8f0'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (layoutConfig.background === BackgroundStyle.GRADIENT_1) {
          grad.addColorStop(0, '#e0e7ff');
          grad.addColorStop(0.5, '#f3e8ff');
          grad.addColorStop(1, '#fce7f3');
        } else {
          grad.addColorStop(0, '#dbeafe');
          grad.addColorStop(0.5, '#e0f2fe');
          grad.addColorStop(1, '#cffafe');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw Screen Share
      if (displayVideoRef.current && displayStream && displayVideoRef.current.readyState >= 2) {
        const vid = displayVideoRef.current;
        const { x, y, width, height } = layoutConfig.screenTransform;
        
        const targetX = x * canvas.width;
        const targetY = y * canvas.height;
        const targetW = width * canvas.width;
        const targetH = height * canvas.height;

        ctx.save();
        const radius = 20;
        roundRect(ctx, targetX, targetY, targetW, targetH, radius);
        ctx.clip();
        
        const vidAspect = vid.videoWidth / vid.videoHeight;
        const targetAspect = targetW / targetH;
        let drawW = targetW;
        let drawH = targetH;
        let ox = targetX;
        let oy = targetY;

        if (vidAspect > targetAspect) {
          drawH = targetW / vidAspect;
          oy = targetY + (targetH - drawH) / 2;
        } else {
          drawW = targetH * vidAspect;
          ox = targetX + (targetW - drawW) / 2;
        }

        ctx.drawImage(vid, ox, oy, drawW, drawH);
        ctx.restore();
      }

      // 3. Draw Camera
      if (userVideoRef.current && userStream && userVideoRef.current.readyState >= 2) {
        const cam = userVideoRef.current;
        const { x, y, width, height } = layoutConfig.cameraTransform;
        
        const targetX = x * canvas.width;
        const targetY = y * canvas.height;
        const targetW = width * canvas.width;
        const targetH = height * canvas.height;
        
        ctx.save();
        
        if (layoutConfig.cameraShape === CameraShape.CIRCLE) {
           ctx.beginPath();
           // Draw ellipse/circle based on rect
           const centerX = targetX + targetW / 2;
           const centerY = targetY + targetH / 2;
           // Ensure it is a circle based on shortest side if distorted, but transform enforces aspect 1:1 usually
           const radius = Math.min(targetW, targetH) / 2;
           ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
           ctx.clip();
        } else {
           const radius = 24; 
           roundRect(ctx, targetX, targetY, targetW, targetH, radius);
           ctx.clip();
        }
        
        const camAspect = cam.videoWidth / cam.videoHeight;
        const targetAspect = targetW / targetH;
        let drawW = targetW;
        let drawH = targetH;
        let ox = targetX;
        let oy = targetY;

        if (camAspect > targetAspect) {
          drawW = targetH * camAspect;
          ox = targetX - (drawW - targetW) / 2;
        } else {
          drawH = targetW / camAspect;
          oy = targetY - (drawH - targetH) / 2;
        }
        
        ctx.drawImage(cam, ox, oy, drawW, drawH);
        ctx.restore();

        // Border
        ctx.lineWidth = 4; 
        ctx.strokeStyle = '#ffffff';
        if (layoutConfig.cameraShape === CameraShape.CIRCLE) {
           const centerX = targetX + targetW / 2;
           const centerY = targetY + targetH / 2;
           const radius = Math.min(targetW, targetH) / 2;
           ctx.beginPath();
           ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
           ctx.stroke();
        } else {
           roundRect(ctx, targetX, targetY, targetW, targetH, 24);
           ctx.stroke();
        }
      }

      rafId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [layoutConfig, userStream, displayStream]);

  return compositeStream;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}