// packages/rtc/src/utils.ts

/**
 * WebRTC desteğini kontrol et
 */
export function checkWebRTCSupport(): {
  supported: boolean;
  missingFeatures: string[];
} {
  const missingFeatures: string[] = [];
  
  if (!window.RTCPeerConnection) {
    missingFeatures.push('RTCPeerConnection');
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    missingFeatures.push('getUserMedia');
  }
  
  if (!window.RTCSessionDescription) {
    missingFeatures.push('RTCSessionDescription');
  }
  
  if (!window.RTCIceCandidate) {
    missingFeatures.push('RTCIceCandidate');
  }
  
  if (!window.MediaStream) {
    missingFeatures.push('MediaStream');
  }
  
  return {
    supported: missingFeatures.length === 0,
    missingFeatures,
  };
}

/**
 * Medya izinlerini kontrol et
 */
export async function checkMediaPermissions(): Promise<{
  microphone: PermissionState;
  camera: PermissionState;
}> {
  const permissions = {
    microphone: 'prompt' as PermissionState,
    camera: 'prompt' as PermissionState,
  };
  
  try {
    // Mikrofon izni
    const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    permissions.microphone = micPermission.state;
  } catch (error) {
    console.warn('Mikrofon izni kontrol edilemedi:', error);
  }
  
  try {
    // Kamera izni
    const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    permissions.camera = camPermission.state;
  } catch (error) {
    console.warn('Kamera izni kontrol edilemedi:', error);
  }
  
  return permissions;
}

/**
 * Ses seviyesi hesaplama
 */
export function calculateAudioLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  
  const average = sum / dataArray.length;
  return Math.min(100, Math.round((average / 255) * 100));
}

/**
 * SDP codec önceliklerini ayarla (Opus tercih et)
 */
export function preferOpus(sdp: string): string {
  // Opus codec'ini tercih et
  const lines = sdp.split('\r\n');
  const mLineIndex = lines.findIndex(line => line.startsWith('m=audio'));
  
  if (mLineIndex === -1) {
    return sdp;
  }
  
  const mLine = lines[mLineIndex];
  const elements = mLine.split(' ');
  const payloadTypes = elements.slice(3);
  
  // Opus payload type'ını bul
  const opusPayload = payloadTypes.find(pt => {
    const rtpMapLine = lines.find(line => 
      line.startsWith(`a=rtpmap:${pt}`) && 
      line.toLowerCase().includes('opus')
    );
    return rtpMapLine !== undefined;
  });
  
  if (opusPayload) {
    // Opus'u başa al
    const newPayloadTypes = [
      opusPayload,
      ...payloadTypes.filter(pt => pt !== opusPayload),
    ];
    elements.splice(3, payloadTypes.length, ...newPayloadTypes);
    lines[mLineIndex] = elements.join(' ');
  }
  
  return lines.join('\r\n');
}

/**
 * Bitrate sınırlarını ayarla
 */
export function setBitrateLimit(sdp: string, bitrate: number): string {
  const lines = sdp.split('\r\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    
    // Opus codec satırını bul ve bitrate ekle
    if (lines[i].includes('opus/48000')) {
      newLines.push(`a=fmtp:${lines[i].split(':')[1].split(' ')[0]} maxaveragebitrate=${bitrate}`);
    }
  }
  
  return newLines.join('\r\n');
}

/**
 * Network kalitesini hesapla
 */
export function calculateNetworkQuality(stats: {
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
}): 'excellent' | 'good' | 'fair' | 'poor' {
  const { packetsLost, jitter, roundTripTime } = stats;
  
  // Basit kalite hesaplaması
  let score = 100;
  
  // Paket kaybı (0-5% kabul edilebilir)
  if (packetsLost > 0) {
    score -= Math.min(30, packetsLost * 6);
  }
  
  // Jitter (0-30ms ideal)
  if (jitter > 30) {
    score -= Math.min(30, (jitter - 30) * 0.5);
  }
  
  // RTT (0-150ms ideal)
  if (roundTripTime > 150) {
    score -= Math.min(40, (roundTripTime - 150) * 0.2);
  }
  
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}
