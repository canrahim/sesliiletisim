// apps/web/src/components/voice/PTTSettings.tsx

import React, { useState, useRef } from 'react';
import { Keyboard, Mic, Activity, Settings2, Volume2, AlertCircle } from 'lucide-react';
import { PTTKeybind, PTTManager } from '@asforces/rtc';

interface PTTSettingsProps {
  pushToTalk: boolean;
  vadEnabled: boolean;
  vadSensitivity: number;
  pttKeybind: PTTKeybind;
  pttReleaseDelay: number;
  onPushToTalkChange: (enabled: boolean) => void;
  onVADEnabledChange: (enabled: boolean) => void;
  onVADSensitivityChange: (sensitivity: number) => void;
  onKeybindChange: (keybind: PTTKeybind) => void;
  onReleaseDelayChange: (delay: number) => void;
}

export const PTTSettings: React.FC<PTTSettingsProps> = ({
  pushToTalk,
  vadEnabled,
  vadSensitivity,
  pttKeybind,
  pttReleaseDelay,
  onPushToTalkChange,
  onVADEnabledChange,
  onVADSensitivityChange,
  onKeybindChange,
  onReleaseDelayChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pttManagerRef = useRef<PTTManager | null>(null);

  // Format keybind for display
  const formatKeybind = (keybind: PTTKeybind): string => {
    return PTTManager.formatKeybind(keybind);
  };

  // Start recording keybind
  const startRecordingKeybind = async () => {
    setIsRecording(true);
    setRecordingError(null);

    try {
      if (!pttManagerRef.current) {
        pttManagerRef.current = new PTTManager();
      }

      const newKeybind = await pttManagerRef.current.recordKeybind();
      onKeybindChange(newKeybind);
      setIsRecording(false);
    } catch (error: any) {
      setRecordingError(error.message);
      setIsRecording(false);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    setIsRecording(false);
    setRecordingError(null);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Settings2 className="w-5 h-5" />
        Voice Settings
      </h3>

      {/* Push-to-Talk Toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pushToTalk}
            onChange={(e) => onPushToTalkChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 text-white">
            <Mic className="w-4 h-4" />
            <span>Push to Talk</span>
          </div>
        </label>
        <p className="text-xs text-gray-400 ml-7">
          {pushToTalk
            ? 'Hold the assigned key to transmit your voice'
            : 'Your microphone is always active when unmuted'}
        </p>
      </div>

      {/* PTT Keybind */}
      {pushToTalk && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Push-to-Talk Key
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white">
              {isRecording ? (
                <span className="text-yellow-400 animate-pulse">Press any key...</span>
              ) : (
                formatKeybind(pttKeybind)
              )}
            </div>
            {isRecording ? (
              <button
                onClick={cancelRecording}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={startRecordingKeybind}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Change
              </button>
            )}
          </div>
          {recordingError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {recordingError}
            </p>
          )}
        </div>
      )}

      {/* Voice Activity Detection */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={vadEnabled}
            onChange={(e) => onVADEnabledChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-4 h-4" />
            <span>Voice Activity Detection</span>
          </div>
        </label>
        <p className="text-xs text-gray-400 ml-7">
          Automatically detect when you're speaking
        </p>
      </div>

      {/* VAD Sensitivity */}
      {vadEnabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              VAD Sensitivity
            </span>
            <span className="text-xs text-gray-400">{vadSensitivity}%</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Less</span>
            <input
              type="range"
              min="0"
              max="100"
              value={vadSensitivity}
              onChange={(e) => onVADSensitivityChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-400">More</span>
          </div>
          <p className="text-xs text-gray-400">
            Lower values detect quieter sounds, higher values require louder speech
          </p>
        </div>
      )}

      {/* Advanced Settings */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-gray-700">
          {/* Release Delay */}
          {pushToTalk && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
                <span>PTT Release Delay</span>
                <span className="text-xs text-gray-400">{pttReleaseDelay}ms</span>
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={pttReleaseDelay}
                onChange={(e) => onReleaseDelayChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-400">
                Continue transmitting for this duration after releasing the key
              </p>
            </div>
          )}

          {/* Mode Information */}
          <div className="p-3 bg-gray-700 rounded-md space-y-2">
            <h4 className="text-sm font-medium text-white">Transmission Mode</h4>
            <div className="text-xs text-gray-300 space-y-1">
              {pushToTalk && vadEnabled && (
                <p>• <strong>Hybrid Mode:</strong> PTT + VAD active</p>
              )}
              {pushToTalk && !vadEnabled && (
                <p>• <strong>PTT Only:</strong> Manual transmission control</p>
              )}
              {!pushToTalk && vadEnabled && (
                <p>• <strong>VAD Only:</strong> Automatic voice detection</p>
              )}
              {!pushToTalk && !vadEnabled && (
                <p>• <strong>Open Mic:</strong> Always transmitting when unmuted</p>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="p-3 bg-gray-700 rounded-md">
            <h4 className="text-sm font-medium text-white mb-2">Keyboard Shortcuts</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• <kbd>Ctrl+M</kbd> - Toggle mute</p>
              <p>• <kbd>Ctrl+D</kbd> - Toggle deafen</p>
              <p>• <kbd>Ctrl+Shift+S</kbd> - Voice settings</p>
              <p>• <kbd>Escape</kbd> - Leave voice channel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
