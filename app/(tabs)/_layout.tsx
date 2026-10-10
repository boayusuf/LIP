import { Tabs } from 'expo-router';
import { CheckSquare, MessageCircle, User, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroupStore } from '../../lib/groupStore';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/theme';

/**
 * The row the icons and labels live in. UIKit's is 49; these labels are 11pt
 * with a 14pt line box, so 52 holds icon and label without crowding either.
 */
const TAB_BAR_CONTENT_HEIGHT = 52;

/**
 * What the bar reserves below that row for the home indicator.
 *
 * BottomTabBar's own default is the whole bottom inset -- 34pt on this phone.
 * That is UIKit's figure, sized for a 49pt bar whose labels sit higher up the
 * screen. The indicator itself is a 5pt pill 8pt off the bottom edge, so 14
 * clears it, and the remaining 20pt stop reading as a dead band under the
 * labels. Zero on hardware with no indicator, where there is nothing to clear.
 */
const HOME_INDICATOR_CLEARANCE = 14;

export default function TabLayout() {
  const { groups, dmGroups, unreadByGroup } = useGroupStore();
  const insets = useSafeAreaInsets();

  // Stated together: BottomTabBar derives its height from tabBarStyle.height
  // when one is given, so height and paddingBottom have to agree or the scene
  // above is laid out against a bar size that is not the one being drawn.
  const bottomReserve = insets.bottom > 0 ? HOME_INDICATOR_CLEARANCE : 0;
  const tabBarSizing = {
    height: TAB_BAR_CONTENT_HEIGHT + bottomReserve,
    paddingBottom: bottomReserve,
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
  // Two separate edges were showing as lines, and each has its own cause.
  //
  // The upper one is BottomTabBar's border: it applies a hairline
  // borderTopWidth in the navigation theme's border colour on every render,
  // before tabBarStyle. It is a real border on a real element, so it goes by
  // setting the width to 0.
  //
  // The lower one is a colour step, not a border. The bar was painted
  // Colors.primary while every screen is Colors.background, so both of its
  // edges stood out against the canvas -- the lower one wherever the app did
  // not reach the bottom of the screen. The bar is part of the canvas, not a
  // card sitting on it, so it takes the canvas colour and neither edge exists
  // to be drawn.
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
