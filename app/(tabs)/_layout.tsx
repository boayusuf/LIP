import { Tabs } from 'expo-router';
import { CheckSquare, MessageCircle, User, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIndicatorFloor } from '../../constants/safeArea';
import { useGroupStore } from '../../lib/groupStore';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/theme';

/**
 * The bar is built from its parts rather than given a round number, because
 * every one of them is fixed by BottomTabItem and none of them is guesswork.
 *
 * `padding: 5` on the item is the one piece that cannot be overridden:
 * tabBarItemStyle lands on the wrapper, not on the pressable that carries it.
 */
const TAB_ITEM_PADDING = 5;

/**
 * TabBarIcon's own wrapper is 31x28 for a 23pt glyph, so nearly 5pt of the
 * row is air around the icon. 25 keeps the glyph at its size and drops the
 * air; tabBarIconStyle is applied after the wrapper's own style, so it wins.
 */
const TAB_ICON_BOX_HEIGHT = 25;

/** Matches tabLabel.lineHeight below. Stated once, used in both places. */
const TAB_LABEL_LINE_HEIGHT = 14;

/** Exactly what the icon and label need, with nothing left over to sit empty. */
const TAB_BAR_CONTENT_HEIGHT =
  TAB_ITEM_PADDING * 2 + TAB_ICON_BOX_HEIGHT + TAB_LABEL_LINE_HEIGHT;

/**
 * What the bar reserves below that row for the home indicator.
 *
 * BottomTabBar's own default is the whole bottom inset -- 34pt here -- which
 * is UIKit's figure for a 49pt bar and reads as a dead band under an 11pt
 * label. HomeIndicatorFloor is the real limit; the item's own bottom padding
 * already covers part of it, so the bar reserves only the rest.
 */
const HOME_INDICATOR_CLEARANCE = HomeIndicatorFloor - TAB_ITEM_PADDING;

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
        // Stated, not inferred. Left to itself the navigator picks the layout
        // from the viewport width, so the bar it draws on a phone and the one
        // it draws anywhere wider are different shapes. This app is a phone
        // app; the icon sits above its label at every width.
        tabBarLabelPosition: 'below-icon',
        tabBarIconStyle: styles.tabIcon,
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
  tabIcon: {
    height: TAB_ICON_BOX_HEIGHT,
  },
  // An explicit lineHeight: without one the line box can grow past the row the
  // navigator allots it and the descenders get sliced off.
  tabLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: TAB_LABEL_LINE_HEIGHT,
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
