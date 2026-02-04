import { useCallback, useRef, useState } from 'react';
import './Knob.css';

interface KnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  label: string;
  color?: string;
}

export function Knob({ value, onChange, label, color = '#e0e0e0' }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Convert value (0-100) to rotation angle (-135 to 135 degrees)
  const rotation = (value / 100) * 270 - 135;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    // Vertical drag: moving up increases value
    const deltaY = dragStartY.current - e.clientY;
    const sensitivity = 0.5; // Adjust for feel
    const newValue = Math.min(100, Math.max(0, dragStartValue.current + deltaY * sensitivity));
    onChange(newValue);
  }, [isDragging, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    const newValue = Math.min(100, Math.max(0, value + delta));
    onChange(newValue);
  }, [value, onChange]);

  return (
    <div className="knob-container">
      <div
        className={`knob ${isDragging ? 'dragging' : ''}`}
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{ '--knob-color': color } as React.CSSProperties}
      >
        {/* Outer ring with notches */}
        <div className="knob-ring">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="knob-notch"
              style={{
                transform: `rotate(${-135 + i * 27}deg) translateY(-52px)`,
                opacity: (i * 10) <= value ? 1 : 0.3
              }}
            />
          ))}
        </div>

        {/* Main knob body */}
        <div
          className="knob-body"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Metal texture ridges */}
          <div className="knob-ridges">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="knob-ridge" style={{ transform: `rotate(${i * 15}deg)` }} />
            ))}
          </div>

          {/* Center cap */}
          <div className="knob-cap" />

          {/* Position indicator */}
          <div className="knob-indicator" />
        </div>
      </div>

      <div className="knob-label">{label}</div>
    </div>
  );
}
