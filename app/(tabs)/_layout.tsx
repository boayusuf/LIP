import { Tabs } from 'expo-router';
import { CheckSquare, MessageCircle, User, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useGroupStore } from '../../lib/groupStore';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/theme';

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
        tabBarStyle: styles.tabBar,
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
  // No height and no padding here. BottomTabBar sizes itself as 49 plus the
  // bottom inset and reserves the home indicator inside its own background,
  // which is correct; overriding either is what broke it.
  //
  // borderTopWidth does need stating. BottomTabBar always applies a hairline
  // top border in the navigation theme's border colour, and that hairline is
  // the line above the bar. Removing it is structural, not a repaint.
  tabBar: {
    backgroundColor: Colors.primary,
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
