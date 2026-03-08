import { Directive, EventEmitter, HostListener, Input, NgZone, OnDestroy, Output } from '@angular/core';

/**
 * Makes a divider element draggable to resize an adjacent panel.
 *
 * Usage:
 *   <div appResizableDivider
 *        orientation="vertical"
 *        [currentSize]="sidebarWidth()"
 *        [minSize]="180"
 *        [maxSize]="600"
 *        (sizeChange)="onSidebarResize($event)">
 *   </div>
 *
 * @param orientation  'vertical' for left/right resize, 'horizontal' for top/bottom.
 * @param currentSize  The current pixel size of the primary panel (read at drag start).
 * @param minSize      Minimum allowed size for the primary panel.
 * @param maxSize      Maximum allowed size for the primary panel.
 * @param invertDelta  Set true when the primary panel is *after* the divider (below/right),
 *                     so dragging toward it makes it larger rather than smaller.
 * @param sizeChange   Emits the new pixel size of the primary panel while dragging.
 */
@Directive({
  selector: '[appResizableDivider]',
  standalone: true,
  host: { '[class.is-dragging]': 'isDragging' },
})
export class ResizableDividerDirective implements OnDestroy {
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() currentSize = 0;
  @Input() minSize = 80;
  @Input() maxSize = 9999;
  @Input() invertDelta = false;
  @Output() sizeChange = new EventEmitter<number>();

  isDragging = false;

  private startSize = 0;
  private startPos = 0;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;
  private touchMoveListener?: (e: TouchEvent) => void;
  private touchEndListener?: (e: TouchEvent) => void;

  constructor(private ngZone: NgZone) {}

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    this.startDrag(this.orientation === 'vertical' ? e.clientX : e.clientY);

    this.mouseMoveListener = (ev: MouseEvent) =>
      this.onMove(this.orientation === 'vertical' ? ev.clientX : ev.clientY);
    this.mouseUpListener = () => this.endDrag();

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.mouseMoveListener!);
      document.addEventListener('mouseup', this.mouseUpListener!);
    });
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(this.orientation === 'vertical' ? touch.clientX : touch.clientY);

    this.touchMoveListener = (ev: TouchEvent) => {
      if (ev.touches.length === 1) {
        const t = ev.touches[0];
        this.onMove(this.orientation === 'vertical' ? t.clientX : t.clientY);
      }
    };
    this.touchEndListener = () => this.endDrag();

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchmove', this.touchMoveListener!, { passive: false });
      document.addEventListener('touchend', this.touchEndListener!);
    });
  }

  private startDrag(pos: number): void {
    this.isDragging = true;
    this.startSize = this.currentSize;
    this.startPos = pos;
  }

  private onMove(pos: number): void {
    const delta = pos - this.startPos;
    const rawSize = this.startSize + (this.invertDelta ? -delta : delta);
    const newSize = Math.max(this.minSize, Math.min(this.maxSize, rawSize));
    this.ngZone.run(() => this.sizeChange.emit(newSize));
  }

  private endDrag(): void {
    this.isDragging = false;
    if (this.mouseMoveListener) document.removeEventListener('mousemove', this.mouseMoveListener);
    if (this.mouseUpListener) document.removeEventListener('mouseup', this.mouseUpListener);
    if (this.touchMoveListener) document.removeEventListener('touchmove', this.touchMoveListener);
    if (this.touchEndListener) document.removeEventListener('touchend', this.touchEndListener);
    this.mouseMoveListener = undefined;
    this.mouseUpListener = undefined;
    this.touchMoveListener = undefined;
    this.touchEndListener = undefined;
  }

  ngOnDestroy(): void {
    this.endDrag();
  }
}
