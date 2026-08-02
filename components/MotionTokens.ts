export const Motion = {
  durations: {
    short: 150,
    medium: 200,
    long: 300,
  },
  spring: {
    // Reanimated spring config shape: stiffness, damping, mass, overshootClamping (optional)
    stiffness: 150,
    damping: 12,
    mass: 1,
  },
  scale: {
    press: 0.96,
  },
  colors: {
    accent: '#FF1F1F', // Ascend red
    accentGlow: 'rgba(255,31,31,0.18)',
    background: '#000000',
    foreground: '#FFFFFF',
  },
  elevation: {
    low: 2,
    medium: 6,
    high: 12,
  },
  easing: {
    // small helper easing names (can be extended)
    easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  },
};

export type MotionTokens = typeof Motion;
