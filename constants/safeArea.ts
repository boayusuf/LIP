/**
 * Safe-area edge sets, stated as records rather than arrays.
 *
 * `edges={['top']}` does not mean "top only" on web. The native SafeAreaView
 * fills every edge the array leaves out with 'off' before handing it to the
 * native view, but the web implementation does not: an omitted edge reaches
 * `getEdgeValue` as `undefined`, and its switch falls through to the
 * 'additive' default. So on web the array form pads the bottom by the full
 * inset no matter what the array says.
 *
 * Under the tab bar that reserved the home indicator a second time -- once in
 * the screen, once inside the bar -- and the band it left between the two is
 * what cut the bottom off the profile cards. Naming every edge is handled
 * identically by both implementations.
 */
import type { Edge, EdgeMode } from 'react-native-safe-area-context';

/** For screens inside the tab navigator: the tab bar owns the bottom. */
export const TopEdgeOnly: Record<Edge, EdgeMode> = {
  top: 'additive',
  right: 'off',
  bottom: 'off',
  left: 'off',
};

/** For full-screen pushes with no tab bar, where the bottom is the screen's. */
export const TopAndBottomEdges: Record<Edge, EdgeMode> = {
  top: 'additive',
  right: 'off',
  bottom: 'additive',
  left: 'off',
};
