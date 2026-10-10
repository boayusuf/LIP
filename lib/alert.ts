import { Alert, Platform } from 'react-native';

/**
 * Cross-platform replacement for Alert.alert.
 *
 * react-native-web does not implement Alert.alert -- it is a no-op there. The
 * app used it for every error and every destructive confirmation, so on the web
 * build a failed login, a validation error and a "delete this task?" prompt all
 * silently did nothing. On web this falls back to the browser's own dialogs:
 * alert() when there is nothing to decide, confirm() when there is.
 */

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;

  // Nothing to choose between: just tell them, then run the single handler.
  if (!buttons || buttons.length <= 1) {
    window.alert(body);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two or more buttons means a decision. Treat the non-cancel one as confirm.
  const cancel = buttons.find((b) => b.style === 'cancel');
  const confirm = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (window.confirm(body)) {
    confirm?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
