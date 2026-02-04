import { useCallback, useRef, useState } from 'react';
import './Knob.css';

interface KnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  onInteractionStart?: () => void; // Called on first interaction
  label: string;
  color?: string;
}

export function Knob({ value, onChange, onInteractionStart, label, color = '#e0e0e0' }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);
  const hasInteracted = useRef(false);

  // Convert value (0-100) to rotation angle (-135 to 135 degrees)
  const rotation = (value / 100) * 270 - 135;

  // Arc parameters for SVG level indicator
  const size = 140;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // degrees from top
  const totalAngle = 270; // total sweep
  const arcLength = (totalAngle / 360) * circumference;
  const filledLength = (value / 100) * arcLength;

  const triggerInteraction = useCallback(() => {
    if (!hasInteracted.current && onInteractionStart) {
      hasInteracted.current = true;
      onInteractionStart();
    }
  }, [onInteractionStart]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    triggerInteraction();
  }, [value, triggerInteraction]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaY = dragStartY.current - e.clientY;
    const sensitivity = 0.4;
    const newValue = Math.min(100, Math.max(0, dragStartValue.current + deltaY * sensitivity));
    onChange(newValue);
  }, [isDragging, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    triggerInteraction();
    const delta = e.deltaY > 0 ? -3 : 3;
    const newValue = Math.min(100, Math.max(0, value + delta));
    onChange(newValue);
  }, [value, onChange, triggerInteraction]);

  const handleDoubleClick = useCallback(() => {
    onChange(0);
  }, [onChange]);

  return (
    <div
      className="knob-container"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* SVG Arc Level Indicator */}
      <svg
        className="knob-arc"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={-((360 - totalAngle) / 2 / 360) * circumference}
          strokeLinecap="round"
          transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeDashoffset={-((360 - totalAngle) / 2 / 360) * circumference}
          strokeLinecap="round"
          transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
          style={{
            filter: value > 0 ? `drop-shadow(0 0 6px ${color})` : 'none',
            transition: 'stroke-dasharray 0.1s ease-out'
          }}
        />
      </svg>

      <div
        className={`knob ${isDragging ? 'dragging' : ''} ${isHovering ? 'hovering' : ''}`}
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{ '--knob-color': color } as React.CSSProperties}
      >
        {/* Knob base plate */}
        <div className="knob-plate" />

        {/* Main knob body */}
        <div
          className="knob-body"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Outer edge highlight */}
          <div className="knob-edge" />

          {/* Metal texture - concentric rings */}
          <div className="knob-texture" />

          {/* Grip ridges */}
          <div className="knob-ridges">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="knob-ridge"
                style={{ transform: `rotate(${i * 11.25}deg)` }}
              />
            ))}
          </div>

          {/* Center cap */}
          <div className="knob-cap">
            <div className="knob-cap-inner" />
          </div>

          {/* Position indicator */}
          <div className="knob-indicator" />
        </div>
      </div>

      <div className="knob-label">{label}</div>
      <div className="knob-value" style={{ color: value > 0 ? color : 'rgba(255,255,255,0.3)' }}>
        {Math.round(value)}
      </div>
    </div>
  );
}
