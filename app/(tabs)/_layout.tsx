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
  // No height and no bottom padding here on purpose. React Navigation's tab bar
  // already adds the safe-area inset itself, so setting either one again stacks
  // a second home-indicator gap underneath the icons and reads as a thick band.
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontFamily: Fonts.semibold, fontSize: 11,
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
