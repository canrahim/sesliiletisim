import React, { useState, useEffect, useRef } from 'react';
import { Mic, Headphones, Settings, X, Radio } from 'lucide-react';
import { useVoiceSettingsStore, AudioQuality } from '../store/voice-settings.store';
import { Button } from '../components/ui/Button';
import { Slider } from '../components/ui/Slider';
import { Switch } from '../components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export const VoiceSettingsPage: React.FC = () => {
  const {
    microphoneId,
    speakerId,
    inputVolume,
    outputVolume,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    pushToTalk,
    vadEnabled,
    vadSensitivity,
    audioQuality,
    setMicrophoneId,
    setSpeakerId,
    setInputVolume,
    setOutputVolume,
    setEchoCancellation,
    setNoiseSuppression,
    setAutoGainControl,
    setPushToTalk,
    setVadEnabled,
    setVadSensitivity,
    setAudioQuality,
  } = useVoiceSettingsStore();

  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadAudioDevices();
    return () => {
      stopAudioTest();
    };
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mikrofon ${d.deviceId.slice(0, 4)}` }))
      );
      setAudioOutputs(
        devices
          .filter((d) => d.kind === 'audiooutput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Hoparlör ${d.deviceId.slice(0, 4)}` }))
      );
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const startAudioTest = async () => {
    stopAudioTest();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: microphoneId === 'default' ? undefined : { exact: microphoneId },
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      });
      localStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.85;

      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setInputLevel(average);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (error) {
      console.error('Error starting audio test:', error);
    }
  };

  const stopAudioTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setInputLevel(0);
  };

  const handleAudioQualityChange = (value: string) => {
    setAudioQuality(value as AudioQuality);
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto z-50">
      <div className="max-w-3xl w-full bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-8 my-8 border border-blue-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-blue-600" /> Ses Ayarları
          </h2>
          <button 
            onClick={handleClose} 
            className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Mikrofon Ayarları */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Mic className="w-5 h-5 text-blue-600" />
              </div>
              Mikrofon
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="microphone-select" className="block text-sm font-medium text-neutral-600 mb-1">
                  Giriş Cihazı
                </label>
                <Select value={microphoneId} onValueChange={setMicrophoneId}>
                  <SelectTrigger id="microphone-select" className="w-full">
                    <SelectValue placeholder="Mikrofon Seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Varsayılan Mikrofon</SelectItem>
                    {audioInputs.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="input-volume" className="block text-sm font-medium text-neutral-600 mb-1">
                  Giriş Sesi ({inputVolume}%)
                </label>
                <Slider
                  id="input-volume"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputVolume]}
                  onValueChange={(val) => setInputVolume(val[0])}
                />
              </div>

              {/* Mikrofon Testi */}
              <div className="border p-3 rounded-md bg-neutral-50">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Mikrofon Testi</h4>
                <div className="flex space-x-2 mb-3">
                  <Button onClick={startAudioTest} disabled={!!localStreamRef.current} className="flex-1">
                    Testi Başlat
                  </Button>
                  <Button onClick={stopAudioTest} disabled={!localStreamRef.current} variant="outline" className="flex-1">
                    Testi Durdur
                  </Button>
                </div>
                {localStreamRef.current && (
                  <div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(inputLevel, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Konuşun ve seviyeyi görün</p>
                  </div>
                )}
              </div>

              {/* Gürültü Ayarları */}
              <div className="flex items-center justify-between">
                <label htmlFor="echo-cancellation" className="text-sm font-medium text-neutral-600">
                  Yankı Engelleme
                </label>
                <Switch
                  id="echo-cancellation"
                  checked={echoCancellation}
                  onCheckedChange={setEchoCancellation}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="noise-suppression" className="text-sm font-medium text-neutral-600">
                  Gürültü Engelleme
                </label>
                <Switch
                  id="noise-suppression"
                  checked={noiseSuppression}
                  onCheckedChange={setNoiseSuppression}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="auto-gain-control" className="text-sm font-medium text-neutral-600">
                  Otomatik Ses Yüksekliği
                </label>
                <Switch
                  id="auto-gain-control"
                  checked={autoGainControl}
                  onCheckedChange={setAutoGainControl}
                />
              </div>
            </div>
          </div>

          {/* Ses Kalitesi */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Radio className="w-5 h-5 text-purple-600" />
              </div>
              Ses Kalitesi
            </h3>
            <Select value={audioQuality} onValueChange={handleAudioQualityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ses Kalitesi Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Otomatik (Önerilen)</SelectItem>
                <SelectItem value="low">Düşük (32 kbps - Düşük bant genişliği için)</SelectItem>
                <SelectItem value="medium">Orta (64 kbps - Dengeli)</SelectItem>
                <SelectItem value="high">Yüksek (128 kbps - En iyi kalite)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500 mt-2">
              Ses kalitesi, internet hızınıza göre otomatik ayarlanabilir veya manuel seçilebilir.
            </p>
          </div>

          {/* Konuşma Algılama (VAD) / Bas Konuş (PTT) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Mic className="w-5 h-5 text-green-600" />
              </div>
              Konuşma Modu
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="push-to-talk" className="text-sm font-medium text-neutral-600">
                  Bas Konuş (Push-to-Talk)
                </label>
                <Switch id="push-to-talk" checked={pushToTalk} onCheckedChange={setPushToTalk} />
              </div>
              {!pushToTalk && (
                <div className="flex items-center justify-between">
                  <label htmlFor="vad-enabled" className="text-sm font-medium text-neutral-600">
                    Konuşma Algılama (Voice Activity Detection)
                  </label>
                  <Switch id="vad-enabled" checked={vadEnabled} onCheckedChange={setVadEnabled} />
                </div>
              )}
              {vadEnabled && !pushToTalk && (
                <div>
                  <label htmlFor="vad-sensitivity" className="block text-sm font-medium text-neutral-600 mb-1">
                    Algılama Hassasiyeti ({vadSensitivity}%)
                  </label>
                  <Slider
                    id="vad-sensitivity"
                    min={0}
                    max={100}
                    step={1}
                    value={[vadSensitivity]}
                    onValueChange={(val) => setVadSensitivity(val[0])}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Daha yüksek hassasiyet, daha sessiz sesleri algılar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Hoparlör Ayarları */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Headphones className="w-5 h-5 text-indigo-600" />
              </div>
              Hoparlör
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="speaker-select" className="block text-sm font-medium text-neutral-600 mb-1">
                  Çıkış Cihazı
                </label>
                <Select value={speakerId} onValueChange={setSpeakerId}>
                  <SelectTrigger id="speaker-select" className="w-full">
                    <SelectValue placeholder="Hoparlör Seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Varsayılan Hoparlör</SelectItem>
                    {audioOutputs.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="output-volume" className="block text-sm font-medium text-neutral-600 mb-1">
                  Çıkış Sesi ({outputVolume}%)
                </label>
                <Slider
                  id="output-volume"
                  min={0}
                  max={100}
                  step={1}
                  value={[outputVolume]}
                  onValueChange={(val) => setOutputVolume(val[0])}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleClose}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Kaydet ve Kapat
          </Button>
        </div>
      </div>
    </div>
  );
};
