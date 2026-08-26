'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SlideToPayProps {
  onSuccess: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  disabledLabel?: string;
}

export function SlideToPay({
  onSuccess,
  disabled = false,
  loading = false,
  label = 'Slide to Lock & Pay',
  loadingLabel = 'Waiting for wallet…',
  disabledLabel = 'Enter amount to pay',
}: SlideToPayProps) {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragProgress > 0.75 && !disabled && !loading) {
      setDragProgress(1);
      setConfirmed(true);
      onSuccess();
    } else {
      setDragProgress(0);
    }
  }, [isDragging, dragProgress, disabled, loading, onSuccess]);

  useEffect(() => {
    if (!loading && !disabled) {
      setConfirmed(false);
      setDragProgress(0);
    }
  }, [loading, disabled]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || loading || confirmed) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const handleWidth = 46;
    const maxDistance = rect.width - handleWidth - 8;
    const currentX = e.clientX - rect.left - handleWidth / 2;
    const progress = Math.max(0, Math.min(1, currentX / maxDistance));
    setDragProgress(progress);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    handleDragEnd();
  };

  const displayText = loading
    ? loadingLabel
    : disabled
    ? disabledLabel
    : confirmed
    ? 'Processing…'
    : label;

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        width: '100%',
        height: 52,
        borderRadius: 9999,
        background: disabled ? 'var(--card)' : 'var(--card-raised)',
        border: '1px solid var(--hairline)',
        boxShadow: disabled ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Progress fill */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `calc(${dragProgress * 100}% + 24px)`,
          background: 'linear-gradient(90deg, rgba(19, 145, 226, 0.15) 0%, rgba(19, 145, 226, 0.25) 100%)',
          borderRadius: 9999,
          pointerEvents: 'none',
          transition: isDragging ? 'none' : 'width 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      {/* Center shimmering text */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: disabled ? 'var(--ink-3)' : 'var(--ink)',
          pointerEvents: 'none',
          paddingLeft: 46,
          paddingRight: 16,
          letterSpacing: '-0.01em',
          opacity: 1 - dragProgress * 0.7,
          transition: isDragging ? 'none' : 'opacity 200ms ease',
        }}
      >
        {displayText}
      </div>

      {/* Draggable handle */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          transform: `translateX(${dragProgress * (trackRef.current ? trackRef.current.clientWidth - 54 : 260)}px)`,
          width: 44,
          height: 44,
          borderRadius: 9999,
          background: disabled
            ? 'var(--ink-3)'
            : confirmed || loading
            ? 'var(--accent)'
            : 'var(--pill)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease',
          zIndex: 2,
        }}
      >
        {loading || confirmed ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
