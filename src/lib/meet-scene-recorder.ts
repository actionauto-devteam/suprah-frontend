"use client";

/**
 * Paints the meeting scene onto a hidden canvas and exposes it as a
 * MediaStream. Published as a Chime content share while recording, so the
 * capture pipeline always has something to composite — live camera video
 * when a participant's camera is on, their avatar/initials tile when it's
 * off. The MP4 therefore records the scene, never black frames.
 */

export interface ScenePerson {
  attendeeId: string;
  name: string;
  avatar?: string | null; // resolved absolute URL, or null
  muted: boolean;
  speaking: boolean;
  isSelf: boolean;
  videoEl?: HTMLVideoElement | null;
}

export interface SceneData {
  title: string;
  code: string;
  people: ScenePerson[];
}

const W = 1280;
const H = 720;
const FPS = 12;

const BG = "#071410";
const TILE_BG = "#0f1f19";
const BORDER = "rgba(52,211,153,0.25)";
const SPEAK = "#34d399";
const TEXT = "#d1fae5";
const DIM = "rgba(209,250,229,0.6)";
const REC = "#fb7185";

export class MeetSceneRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stream: MediaStream | null = null;
  private startedAt = 0;
  /** Avatar cache: HTMLImageElement once loaded, "failed" if CORS/404 blocks it. */
  private avatars = new Map<string, HTMLImageElement | "failed">();

  constructor(private getScene: () => SceneData) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
  }

  start(): MediaStream {
    this.startedAt = Date.now();
    this.draw();
    this.timer = setInterval(() => this.draw(), Math.round(1000 / FPS));
    this.stream = this.canvas.captureStream(FPS);
    return this.stream;
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /* ── Avatar loading (crossOrigin so the canvas never taints; on any
     failure we fall back to initials and the recording keeps working) ── */
  private avatarFor(url: string | null | undefined): HTMLImageElement | null {
    if (!url) return null;
    const cached = this.avatars.get(url);
    if (cached === "failed") return null;
    if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => this.avatars.set(url, "failed");
    img.src = url;
    this.avatars.set(url, img);
    return null;
  }

  /* ── Drawing ─────────────────────────────────────────────────────── */
  private draw() {
    let scene: SceneData;
    try { scene = this.getScene(); } catch { return; }
    const { ctx } = this;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    this.drawHeader(scene);

    const people = scene.people;
    const areaY = 64, areaH = H - areaY - 16, areaX = 16, areaW = W - 32;

    if (people.length === 0) {
      ctx.fillStyle = DIM;
      ctx.font = "500 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Recording…", W / 2, H / 2);
      ctx.textAlign = "left";
      return;
    }

    const cols = people.length <= 1 ? 1 : people.length <= 4 ? 2 : 3;
    const rows = Math.ceil(people.length / cols);
    const gap = 12;
    const tw = (areaW - gap * (cols - 1)) / cols;
    const th = (areaH - gap * (rows - 1)) / rows;

    people.forEach((p, i) => {
      const x = areaX + (i % cols) * (tw + gap);
      const y = areaY + Math.floor(i / cols) * (th + gap);
      this.drawTile(p, x, y, tw, th);
    });
  }

  private drawHeader(scene: SceneData) {
    const { ctx } = this;
    ctx.fillStyle = TEXT;
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(scene.title || "Suprah Meet", 20, 32);

    ctx.font = "400 15px system-ui, sans-serif";
    ctx.fillStyle = DIM;
    const titleWidth = ctx.measureText("").width; // baseline set
    ctx.fillText(scene.code, 24 + this.textWidth(scene.title || "Suprah Meet", "600 22px system-ui, sans-serif"), 34);

    // REC badge + elapsed, right-aligned
    const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
    const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillStyle = TEXT;
    ctx.font = "500 16px system-ui, sans-serif";
    ctx.fillText(clock, W - 20, 32);
    ctx.fillStyle = REC;
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText("● REC", W - 80, 32);
    ctx.textAlign = "left";
  }

  private textWidth(text: string, font: string) {
    this.ctx.save();
    this.ctx.font = font;
    const w = this.ctx.measureText(text).width;
    this.ctx.restore();
    return w;
  }

  private rounded(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  private drawTile(p: ScenePerson, x: number, y: number, w: number, h: number) {
    const { ctx } = this;

    // Tile background, clipped to rounded corners
    ctx.save();
    this.rounded(x, y, w, h, 16);
    ctx.fillStyle = TILE_BG;
    ctx.fill();
    ctx.clip();

    const video = p.videoEl;
    const hasVideo = Boolean(
      video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    );

    if (hasVideo && video) {
      // Cover-crop the camera frame into the tile
      const vw = video.videoWidth, vh = video.videoHeight;
      const scale = Math.max(w / vw, h / vh);
      const sw = w / scale, sh = h / scale;
      const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
      try {
        ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
      } catch { /* frame not ready — leave the dark tile this frame */ }
    } else {
      // Avatar circle or initials
      const r = Math.min(w, h) * 0.18;
      const cx = x + w / 2, cy = y + h / 2 - 8;
      const img = this.avatarFor(p.avatar);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        try { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); }
        catch { this.avatars.set(p.avatar!, "failed"); }
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52,211,153,0.12)";
        ctx.fill();
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = SPEAK;
        ctx.font = `700 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initials = p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
        ctx.fillText(initials, cx, cy + 2);
        ctx.textAlign = "left";
      }
    }

    // Name pill (bottom-left) with mute dot
    const label = `${p.name}${p.isSelf ? " (you)" : ""}`;
    ctx.font = "500 14px system-ui, sans-serif";
    const pillW = Math.min(ctx.measureText(label).width + 34, w - 20);
    const pillH = 26;
    const px = x + 10, py = y + h - pillH - 10;
    this.rounded(px, py, pillW, pillH, 13);
    ctx.fillStyle = "rgba(7,20,16,0.85)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 14, py + pillH / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.muted ? REC : SPEAK;
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + 26, py + pillH / 2 + 1, pillW - 34);

    ctx.restore();

    // Speaking / normal border
    this.rounded(x, y, w, h, 16);
    ctx.strokeStyle = p.speaking ? SPEAK : BORDER;
    ctx.lineWidth = p.speaking ? 3 : 1.5;
    ctx.stroke();
  }
}