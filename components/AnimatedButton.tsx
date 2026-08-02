import React from 'react';
import {Pressable, StyleSheet, Text, ViewStyle, Platform} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {Motion} from './MotionTokens';

type Props = {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | any;
  disabled?: boolean;
  testID?: string;
};

const AnimatedView = Animated.createAnimatedComponent(Pressable);
const InnerAnimatedView = Animated.createAnimatedComponent('View');
const InnerText = Animated.createAnimatedComponent(Text);

export default function AnimatedButton({children, onPress, style, disabled, testID}: Props) {
  const pressed = useSharedValue(0);
  const glow = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const scale = pressed.value ? Motion.scale.press : 1;
    return {
      transform: [{scale: withSpring(scale, Motion.spring)}],
    };
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = glow.value ? withTiming(1, {duration: Motion.durations.medium}) : withTiming(0, {duration: Motion.durations.medium});
    // Android uses elevation rather than shadowOpacity; animate elevation numeric fallback
    const elevation = glow.value ? withTiming(Motion.elevation.medium, {duration: Motion.durations.medium}) : withTiming(Motion.elevation.low, {duration: Motion.durations.medium});
    return {
      shadowColor: Motion.colors.accent,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: glow.value ? withTiming(0.22, {duration: Motion.durations.medium}) : withTiming(0, {duration: Motion.durations.medium}),
      shadowRadius: glow.value ? withTiming(12, {duration: Motion.durations.medium}) : withTiming(0, {duration: Motion.durations.medium}),
      elevation,
      backgroundColor: glow.value ? Motion.colors.background : Motion.colors.background,
    };
  }, []);

  const handlePressIn = () => {
    if (disabled) return;
    pressed.value = 1;
    glow.value = 1;
    try {
      Haptics.selectionAsync();
    } catch {
      // optional: ignore if haptics not available
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    pressed.value = 0;
    glow.value = 0;
  };

  const handlePress = () => {
    if (disabled) return;
    // Slight delay is OK, but do not block the tap — call onPress immediately.
    onPress?.();
  };

  return (
    <Animated.View style={[styles.wrapper, style as any]}>
      <InnerAnimatedView style={[styles.glow, animatedGlowStyle]} />
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Pressable
          testID={testID}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={({pressed: nativePressed}) => [
            styles.pressable,
            nativePressed && {opacity: 0.98},
          ]}
          accessibilityRole="button"
          disabled={disabled}
        >
          <Text style={styles.text}>{children}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  glow: {
    ...Platform.select({
      ios: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        backgroundColor: Motion.colors.accentGlow,
        zIndex: -1,
      },
      android: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        backgroundColor: Motion.colors.accentGlow,
        zIndex: -1,
      },
    }),
  },
  container: {
    borderRadius: 12,
    overflow: 'visible',
  },
  pressable: {
    backgroundColor: '#111111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    color: Motion.colors.foreground,
    fontWeight: '600',
    fontSize: 16,
  },
});
