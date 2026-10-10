import { Tabs } from 'expo-router';
import { CheckSquare, MessageCircle, User, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroupStore } from '../../lib/groupStore';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/theme';

/** Icons and labels. The home indicator is added on top of this. */
const TAB_BAR_ROW_HEIGHT = 54;

export default function TabLayout() {
  const { groups, dmGroups, unreadByGroup } = useGroupStore();

  // Stated outright rather than left to the navigator's defaults. These values
  // replace what BottomTabBar would compute, they do not add to it, so the
  // indicator is reserved exactly once -- inside the bar, where the bar's own
  // background covers it and nothing shows underneath.
  const insets = useSafeAreaInsets();
  const tabBarSizing = {
    height: TAB_BAR_ROW_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom,
  };
  const sumUnread = (list: { id: string }[]) =>
    list.reduce((total, g) => total + (unreadByGroup[g.id] || 0), 0);
  const groupUnread = sumUnread(groups);
  const dmUnread = sumUnread(dmGroups);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, tabBarSizing],
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
  // The bar takes the screen background, not the surface colour. While the two
  // differed, any gap between the screen and the bar -- content not filling,
  // scroll padding, inset rounding -- showed up as a visible band. Matching
  // them makes the seam invisible whatever the geometry does, and the border
  // and shadow go for the same reason.
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
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
