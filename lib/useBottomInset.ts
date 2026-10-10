import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * The bottom safe-area inset, as a number, on any device.
 *
 * react-native-safe-area-context reports zero here in the standalone web build,
 * so the value has to come from CSS. But it cannot stay in CSS: React Navigation
 * measures the tab bar's height in JS to decide how much space to reserve for
 * the screen above it, and a `calc()` string is invisible to that. The bar then
 * renders taller than the space reserved for it and the difference shows as a
 * gap. So read the environment variable through a probe element and hand the
 * navigator a real number.
 *
 * Nothing here is device specific: whatever the phone reports is what gets used,
 * including zero on hardware with no home indicator.
 */
function measureBottomInset(): number {
  if (typeof document === 'undefined') return 0;

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.bottom = '0';
  probe.style.left = '0';
  probe.style.width = '0';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';

  document.body.appendChild(probe);
  const measured = parseFloat(window.getComputedStyle(probe).paddingBottom);
  probe.remove();

  return Number.isFinite(measured) ? measured : 0;
}

export function useWebBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const update = () => setInset(measureBottomInset());
    update();

    // Rotating, or moving between devices via responsive mode, changes it.
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return inset;
}
