import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';

interface TouchGestureConfig {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useTouchGestures({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: TouchGestureConfig) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If movement is significant, consider it a drag
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Only process gestures that are quick enough (< 300ms) and significant enough
    if (deltaTime < 300 && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
      // Determine primary direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < -threshold && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    touchStartRef.current = null;
    setIsDragging(false);
  };

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isDragging,
  };
}
