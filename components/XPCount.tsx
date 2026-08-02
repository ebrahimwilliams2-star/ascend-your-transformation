import React, {useEffect, useRef, useState} from 'react';
import {TextStyle, Text} from 'react-native';

type Props = {
  value: number;
  duration?: number; // ms
  style?: TextStyle | any;
  format?: (v: number) => string;
};

// JS-thread count-up animation using requestAnimationFrame — simple, reliable, and dependency-free.
export default function XPCount({value, duration = 800, style, format}: Props) {
  const [display, setDisplay] = useState<number>(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef<number>(value);

  useEffect(() => {
    // If the value hasn't changed, do nothing.
    if (value === fromRef.current) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    startRef.current = start;
    const from = fromRef.current ?? 0;
    const delta = value - from;

    const step = (now: number) => {
      const elapsed = Math.min(now - start, duration);
      const t = duration === 0 ? 1 : elapsed / duration;
      // ease out quad
      const eased = 1 - Math.pow(1 - t, 2);
      const current = Math.round(from + delta * eased);
      setDisplay(current);
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // finish
        fromRef.current = value;
        rafRef.current = null;
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  const text = format ? format(display) : `${display}`;
  return <Text style={style}>{text}</Text>;
}
