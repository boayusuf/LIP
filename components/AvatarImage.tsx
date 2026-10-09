import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/theme';

interface Props {
  avatarUrl: string | null;
  name: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export default function AvatarImage({ avatarUrl, name, size, style }: Props) {
  const radius = size / 2;
  const fontSize = size * 0.4;
  const base: ViewStyle = { width: size, height: size, borderRadius: radius, overflow: 'hidden' };

  if (avatarUrl) {
    return (
      <View style={[base, style]}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={[styles.initials, base, style]}>
      <Text style={[styles.initialsText, { fontSize }]}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    backgroundColor: Colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontFamily: Fonts.bold,
    color: Colors.accent,
  },
});
