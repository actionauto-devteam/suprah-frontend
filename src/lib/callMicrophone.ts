const STORAGE_KEY = "suprah:call-microphone";

export interface MicrophoneOption {
  id: string;
  label: string;
}

export function savedMicrophoneId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function rememberMicrophone(id: string) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function microphoneConstraint(): MediaTrackConstraints | boolean {
  const id = savedMicrophoneId();
  return id ? { deviceId: id } : true;
}

export async function listMicrophones(): Promise<MicrophoneOption[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" && device.deviceId)
    .map((device, index) => ({ id: device.deviceId, label: device.label || `Microphone ${index + 1}` }));
}
