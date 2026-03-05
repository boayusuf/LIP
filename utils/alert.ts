import { Alert } from 'react-native';

export function showError(title: string, message: string) {
  Alert.alert(title, message, [{ text: 'OK' }]);
}
