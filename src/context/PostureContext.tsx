import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { detectPostureWithBaseline } from '../utils/postureDetect';
import { Landmarks } from '../utils/poseMath';

type PoseCtx = {
  good: boolean; 
  neck: number; 
  torso: number;
  landmarks: Landmarks | null;
  calibrate: () => void;
};

const Context = createContext<PoseCtx | null>(null);
export const usePosture = () => useContext(Context)!;

export const PostureProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [good, setGood] = useState(true);
  const [angles, setAngles] = useState({neck: 0, torso: 0});
  const [landmarks, setLM] = useState<Landmarks | null>(null);
  const baselineRef = useRef<Landmarks | null>(null);
  const latestRef = useRef<Landmarks | null>(null);

  // mount once
  useEffect(() => {
    const video = document.createElement('video');
    video.playsInline = true; 
    video.muted = true; 
    video.autoplay = true;
    video.style.display = 'none';       // hidden element
    document.body.appendChild(video);

    const pose = new Pose({ 
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    pose.onResults((res: Results) => {
      if (res.poseLandmarks) {
        const lm = res.poseLandmarks.map(p => ({...p}));
        latestRef.current = lm;
        setLM(lm);
        if (baselineRef.current) {
          const {good, angles} = detectPostureWithBaseline(lm, baselineRef.current, 1);
          setGood(good); 
          setAngles({neck: angles.neckPitch, torso: angles.torsoAngle});
        }
      }
    });

    const cam = new Camera(video, {
      width: 640, 
      height: 480, 
      onFrame: async () => pose.send({image: video})
    });
    
    cam.start().then(() => console.log('[Posture] singleton camera started'));
    
    return () => { 
      cam.stop(); 
      pose.close(); 
      video.remove(); 
    };
  }, []);

  const calibrate = () => { 
    if (latestRef.current) baselineRef.current = latestRef.current; 
  };

  return (
    <Context.Provider value={{
      good,
      neck: angles.neck,
      torso: angles.torso,
      landmarks,
      calibrate
    }}>
      {children}
    </Context.Provider>
  );
}; 