import { Tabs } from 'expo-router';
import { CheckSquare, MessageCircle, User, Users } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { useGroupStore } from '../../lib/groupStore';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/theme';

/** Icon plus label plus breathing room, before the home indicator. */
const TAB_BAR_CONTENT_HEIGHT = 58;

/**
 * react-native-safe-area-context reports a zero bottom inset in the standalone
 * web build, so the home indicator has to be reserved from CSS. Doing it on the
 * bar itself rather than on the page keeps the bar's background running to the
 * bottom of the screen, instead of leaving a dead strip underneath it.
 */
const webSafeAreaTabBar =
  Platform.OS === 'web'
    ? ({
        height: `calc(${TAB_BAR_CONTENT_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      } as any)
    // On native the inset resolves correctly, so the navigator sizes the bar.
    // Pinning a height here is what broke it in the first place.
    : null;

export default function TabLayout() {
  const { groups, dmGroups, unreadByGroup } = useGroupStore();
  const sumUnread = (list: { id: string }[]) =>
    list.reduce((total, g) => total + (unreadByGroup[g.id] || 0), 0);
  const groupUnread = sumUnread(groups);
  const dmUnread = sumUnread(dmGroups);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, webSafeAreaTabBar],
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBadgeStyle: styles.tabBadge,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'To-Do',
          tabBarIcon: ({ color, size }) => (
            <CheckSquare color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarBadge: groupUnread > 0 ? (groupUnread > 99 ? '99+' : groupUnread) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: dmUnread > 0 ? (dmUnread > 99 ? '99+' : dmUnread) : undefined,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size - 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  // An explicit lineHeight: without one the line box can grow past the row the
  // navigator allots it and the descenders get sliced off.
  tabLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
  },
  tabBadge: {
    backgroundColor: Colors.red,
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    minWidth: 16,
  },
});
