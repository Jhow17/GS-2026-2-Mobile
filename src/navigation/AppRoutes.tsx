/**
 * Pilha principal de navegação: abas na base + telas empilhadas
 * (detalhe do ponto, formulário de ponto, meus pontos, login e cadastro).
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/LoginScreen';
import { MyPlacesScreen } from '../screens/MyPlacesScreen';
import { PointDetailScreen } from '../screens/PointDetailScreen';
import { PointFormScreen } from '../screens/PointFormScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { TabRoutes } from './TabRoutes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppRoutes() {
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
