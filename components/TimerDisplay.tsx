import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts, Spacing } from '../constants/theme';

interface TimerDisplayProps {
  timerStartedAt: string | null;
  timerElapsedSec: number;
  estimatedMin: number;
}

export default function TimerDisplay({
  timerStartedAt,
  timerElapsedSec,
  estimatedMin,
}: TimerDisplayProps) {
  const [displaySeconds, setDisplaySeconds] = useState(timerElapsedSec);

  useEffect(() => {
    if (!timerStartedAt) {
      setDisplaySeconds(timerElapsedSec);
      return;
    }
    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(timerStartedAt).getTime()) / 1000
      );
      setDisplaySeconds(timerElapsedSec + elapsed);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timerStartedAt, timerElapsedSec]);

  const formatTime = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedSec = estimatedMin * 60;
  const isOvertime = displaySeconds > estimatedSec;
  const isRunning = !!timerStartedAt;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.time,
          isRunning && styles.timeRunning,
          isOvertime && styles.timeOvertime,
        ]}
      >
        {formatTime(displaySeconds)}
      </Text>
      <Text style={styles.estimate}>/ {estimatedMin}min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  time: {
    fontFamily: Fonts.bold, fontSize: 14,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timeRunning: {
    color: Colors.accent,
  },
  timeOvertime: {
    color: Colors.red,
  },
  estimate: {
    fontFamily: Fonts.regular, fontSize: 11,
    color: Colors.textMuted,
  },
});