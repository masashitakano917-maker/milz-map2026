import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.10';
const CORE_BASE_ST = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const CORE_BASE_MT = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm`;

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

const canUseMultiThread = () => {
  try {
    return typeof SharedArrayBuffer !== 'undefined' && (globalThis as any).crossOriginIsolated === true;
  } catch {
    return false;
  }
};

async function loadFFmpeg(onProgress?: (msg: string) => void) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ff = new FFmpeg();
    const useMT = canUseMultiThread();
    const base = useMT ? CORE_BASE_MT : CORE_BASE_ST;
    onProgress?.(useMT ? 'Loading FFmpeg (multi-thread)...' : 'Loading FFmpeg...');

    const config: { coreURL: string; wasmURL: string; workerURL?: string } = {
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    };
    if (useMT) {
      config.workerURL = await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript');
    }

    await ff.load(config);
    ffmpegInstance = ff;
    return ff;
  })();

  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    throw err;
  }
}

export interface TranscodeOptions {
  onStatus?: (msg: string) => void;
  onProgress?: (ratio: number) => void;
}

const isLikelyIosCompatibleMp4 = async (file: File): Promise<boolean> => {
  if (!(file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4'))) return false;
  return await new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      v.src = '';
      resolve(ok);
    };
    v.onloadedmetadata = () => {
      const ok = Number.isFinite(v.duration) && v.duration > 0;
      finish(ok);
    };
    v.onerror = () => finish(false);
    setTimeout(() => finish(false), 4000);
    v.src = url;
  });
};

export async function transcodeToIosMp4(file: File, opts: TranscodeOptions = {}): Promise<File> {
  const { onStatus, onProgress } = opts;

  const SKIP_TRANSCODE_MAX_BYTES = 8 * 1024 * 1024;
  if (file.size <= SKIP_TRANSCODE_MAX_BYTES && await isLikelyIosCompatibleMp4(file)) {
    onStatus?.('Already iOS-compatible MP4. Skipping transcode.');
    return file;
  }

  onStatus?.('Preparing video transcoder...');
  const ff = await loadFFmpeg(onStatus);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
      onProgress?.(progress);
    }
  };
  ff.on('progress', progressHandler);

  try {
    const inputName = 'input';
    const outputName = 'output.mp4';
    onStatus?.('Loading file into FFmpeg...');
    await ff.writeFile(inputName, await fetchFile(file));

    onStatus?.('Transcoding to H.264 / AAC MP4...');
    await ff.exec([
      '-i', inputName,
      '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',fps=30",
      '-c:v', 'libx264',
      '-profile:v', 'main',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '26',
      '-maxrate', '2200k',
      '-bufsize', '4400k',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ac', '2',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ff.readFile(outputName);
    const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });

    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}

    const baseName = (file.name || 'video').replace(/\.[^./\\]+$/, '');
    const outFile = new File([blob], `${baseName}_ios.mp4`, { type: 'video/mp4' });
    onStatus?.('Transcode complete.');
    return outFile;
  } finally {
    ff.off('progress', progressHandler);
  }
}
