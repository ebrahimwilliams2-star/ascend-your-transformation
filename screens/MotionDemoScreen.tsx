import React, {useState} from 'react';
import {View, StyleSheet, SafeAreaView, Text} from 'react-native';
import AnimatedButton from '../components/AnimatedButton';
import XPCount from '../components/XPCount';
import {Motion} from '../components/MotionTokens';

export default function MotionDemoScreen() {
  const [xp, setXp] = useState(1200);

  const addXp = (amount: number) => {
    setXp((s) => s + amount);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>Motion demo</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>XP</Text>
            <XPCount value={xp} duration={800} style={styles.xp} />
          </View>
        </View>

        <View style={styles.spacer} />

        <AnimatedButton onPress={() => addXp(25)} style={styles.button}>
          +25 XP
        </AnimatedButton>

        <View style={{height: 12}} />

        <AnimatedButton onPress={() => addXp(250)} style={styles.button}>
          +250 XP (Level)
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Motion.colors.background,
  },
  container: {
    padding: 24,
  },
  header: {
    color: Motion.colors.foreground,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 6,
  },
  xp: {
    color: Motion.colors.foreground,
    fontSize: 28,
    fontWeight: '800',
  },
  spacer: {
    height: 28,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
