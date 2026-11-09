/**
 * Raiz do CitizenTech.
 * Ordem dos providers: ProfileProvider -> SupportPointsProvider -> NavigationContainer.
 * Somente o App.tsx usa exportação padrão (export default function App()).
 */
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileProvider } from './src/contexts/ProfileContext';
import { SupportPointsProvider } from './src/contexts/SupportPointsContext';
import { AppRoutes } from './src/navigation/AppRoutes';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider style={styles.root}>
      <ProfileProvider>
        <SupportPointsProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppRoutes />
          </NavigationContainer>
        </SupportPointsProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
