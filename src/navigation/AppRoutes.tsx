/**
 * Pilha principal de navegação: abas na base + telas empilhadas
 * (detalhe do ponto, formulário de ponto, meus pontos, login e cadastro).
 * Também escuta o toque em notificações de alerta térmico para abrir a tela inicial.
 */
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { LoginScreen } from '../screens/LoginScreen';
import { MyPlacesScreen } from '../screens/MyPlacesScreen';
import { PointDetailScreen } from '../screens/PointDetailScreen';
import { PointFormScreen } from '../screens/PointFormScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import * as notificationService from '../services/notificationService';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { TabRoutes } from './TabRoutes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppRoutes() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    void notificationService.ensureNotificationSetup();
    const unsubscribe = notificationService.subscribeToNotificationResponses(() => {
      navigation.navigate('Tabs');
    });
    return () => {
      unsubscribe();
    };
  }, [navigation]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabRoutes}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PointDetail"
        component={PointDetailScreen}
        options={{ title: 'Detalhes do ponto' }}
      />
      <Stack.Screen
        name="PointForm"
        component={PointFormScreen}
        options={{ title: 'Ponto de apoio' }}
      />
      <Stack.Screen
        name="MyPlaces"
        component={MyPlacesScreen}
        options={{ title: 'Meus pontos cadastrados' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Criar conta' }}
      />
    </Stack.Navigator>
  );
}
