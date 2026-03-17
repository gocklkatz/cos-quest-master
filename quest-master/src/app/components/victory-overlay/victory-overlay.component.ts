import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

function rankForLevel(level: number): string {
  if (level <= 2)  return 'Novice';
  if (level <= 5)  return 'Apprentice';
  if (level <= 8)  return 'Journeyman';
  if (level <= 11) return 'Adept';
  if (level <= 13) return 'Expert';
  if (level <= 14) return 'Master';
  return 'Grand Master';
}

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number;
}

interface Rocket {
  x: number; y: number;
  vy: number;
  apexY: number;
  hue: number;
}

@Component({
  selector: 'app-victory-overlay',
  standalone: true,
  imports: [DecimalPipe],
  host: { '[class.active]': 'visible()' },
  templateUrl: './victory-overlay.component.html',
  styleUrl: './victory-overlay.component.scss',
})
export class VictoryOverlayComponent implements OnChanges, AfterViewInit, OnDestroy {
  trigger    = input(0);
  playerName = input('Adventurer');
  level      = input(1);
  xp         = input(0);
  prestigeLevel    = input(0);
  totalXpAllTime   = input(0);
  prestigeTitle    = input('Initiate');

  dismissed = output<void>();
  prestige  = output<void>();

  visible = signal(false);

  get rank(): string { return rankForLevel(this.level()); }

  @ViewChild('fireworks', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private rafId = 0;
  private rockets: Rocket[] = [];
  private sparks: Spark[] = [];
  private frameCount = 0;
  private launchInterval = 0;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  ngOnChanges(): void {
    if (this.trigger() === 0) return;
    this.visible.set(true);
    this.resizeCanvas();
    this.rockets = [];
    this.sparks = [];
    this.frameCount = 0;
    this.launchInterval = 60 + Math.random() * 40;
    this.animate();
  }

  onDismiss(): void {
    this.visible.set(false);
    this.stopAnimation();
    this.dismissed.emit();
  }

  onPrestige(): void {
    this.visible.set(false);
    this.stopAnimation();
    this.prestige.emit();
  }

  protected nextPrestigeTitle(): string {
    const labels = ['Initiate', 'Journeyman', 'Practitioner', 'Expert', 'Master'];
    return labels[Math.min(this.prestigeLevel() + 1, labels.length - 1)];
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  private resizeCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private stopAnimation(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private animate(): void {
    if (!this.visible()) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx    = this.ctx;
    const W = canvas.width;
    const H = canvas.height;

    // Fade trail
    ctx.fillStyle = 'rgba(5, 3, 18, 0.22)';
    ctx.fillRect(0, 0, W, H);

    this.frameCount++;

    // Launch rocket
    if (this.frameCount >= this.launchInterval) {
      this.frameCount = 0;
      this.launchInterval = 45 + Math.random() * 60;
      const apexY = H * 0.1 + Math.random() * H * 0.45;
      this.rockets.push({
        x: W * 0.1 + Math.random() * W * 0.8,
        y: H,
        vy: -(12 + Math.random() * 6),
        apexY,
        hue: Math.random() * 360,
      });
    }

    // Update rockets
    this.rockets = this.rockets.filter(r => {
      r.y += r.vy;
      // Draw rocket trail
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${r.hue}, 100%, 90%)`;
      ctx.fill();

      if (r.y <= r.apexY) {
        this.explode(r.x, r.y, r.hue);
        return false;
      }
      return true;
    });

    // Update sparks
    this.sparks = this.sparks.filter(s => {
      s.x  += s.vx;
      s.y  += s.vy;
      s.vy += 0.12; // gravity
      s.vx *= 0.98;
      s.life--;

      const alpha = s.life / s.maxLife;
      const size  = 1.5 + alpha * 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 100%, 65%, ${alpha})`;
      ctx.fill();

      return s.life > 0;
    });

    this.rafId = requestAnimationFrame(() => this.animate());
  }

  private explode(x: number, y: number, hue: number): void {
    const count = 70 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      const life  = 60 + Math.floor(Math.random() * 40);
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life, maxLife: life,
        hue: hue + (Math.random() - 0.5) * 40,
      });
    }
  }
}
