import React from 'react';
import { usePosture } from '@/context/PostureContext';

const PostureControls: React.FC = () => {
  const {
    // Remove handleCalibration here, assuming it's handled by PostureView's button
    isDetecting, 
    startPostureDetection, 
    stopPostureDetection,
    isCalibrating, 
    isLoadingDetector, 
    cameraError,
    sensitivityPercentage,
    setSensitivityPercentage
  } = usePosture();

  const handleToggleDetection = () => {
    if (isDetecting) {
      stopPostureDetection();
    } else {
      // Optionally check for cameraError before starting?
      // if (cameraError) { alert("Cannot start camera due to error: " + cameraError); return; }
      startPostureDetection();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 mt-4 pb-2">
      <div className="flex justify-center space-x-4">
        {/* Camera Toggle Button */} 
        <button
          onClick={handleToggleDetection}
          // Disable if loading detector OR if calibrating
          disabled={isLoadingDetector || isCalibrating} 
          className={`px-4 py-2 rounded font-semibold text-sm text-white transition-colors ${ 
            isDetecting 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700' 
          } ${isLoadingDetector || isCalibrating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isDetecting ? 'Stop Camera' : 'Start Camera'}
        </button>
        {/* Consider adding the Calibrate button here instead of PostureView 
            if you want all controls together. Pass handleCalibration 
            and necessary disabled states from usePosture. */}
      </div>

      {/* Sensitivity Slider */}
      <div className="w-full max-w-xs px-4 sm:px-0">
        <label htmlFor="sensitivity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
          Sensitivity ({sensitivityPercentage}%)
        </label>
        <input
          type="range"
          id="sensitivity"
          min="5"
          max="30"
          step="1"
          value={sensitivityPercentage}
          onChange={(e) => setSensitivityPercentage(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 dark:accent-blue-400"
          disabled={isCalibrating || isLoadingDetector}
        />
      </div>
    </div>
  );
};

export default PostureControls; 