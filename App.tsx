/**
 * Raiz do aplicativo CitizenTech: providers de área segura, autenticação,
 * perfil, pontos de apoio e container de navegação.
 */
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { SupportPointsProvider } from './src/contexts/SupportPointsContext';
import { AppRoutes } from './src/navigation/AppRoutes';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <SupportPointsProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <AppRoutes />
            </NavigationContainer>
          </SupportPointsProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
