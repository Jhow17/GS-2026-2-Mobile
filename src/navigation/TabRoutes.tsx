/**
 * Barra de abas inferiores com visibilidade dinâmica por perfil (M4 - Opção 3A)
 * e ícones vetoriais (zero emojis - M1):
 * - Visitante (deslogado): Início · Mapa · Clima · Entrar
 * - Usuário logado ('user'): Início · Mapa · Clima · Colaborar · Conta
 * - Administrador ('admin'): Início · Mapa · Clima · Colaborar · Admin (com badge de pendências)
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import { AppIcon } from '../components/AppIcon';
import { useAuth } from '../hooks/useAuth';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { AccountScreen } from '../screens/AccountScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { CollaborateScreen } from '../screens/CollaborateScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { StartScreen } from '../screens/StartScreen';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/spacing';
import type { RootTabParamList } from '../types/navigation';
import type { AppIconName } from '../utils/formatters';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, AppIconName> = {
  Start: 'home',
  Map: 'map',
  Weather: 'thermometer',
  Collaborate: 'plus-circle',
  Admin: 'shield',
  Account: 'user',
};

export function TabRoutes() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { points, reports } = useSupportPoints();

  const pendingBadgeCount =
    points.filter((p) => p.status === 'pending').length +
    reports.filter((r) => r.status === 'open').length;

  return (
    <Tab.Navigator
      initialRouteName="Start"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color, size }) => (
          <AppIcon
            name={TAB_ICONS[route.name]}
            size={size ?? 20}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Start"
        component={StartScreen}
        options={{ title: 'Início' }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Mapa' }}
      />
      <Tab.Screen
        name="Weather"
        component={HomeScreen}
        options={{ title: 'Clima' }}
      />

      {isAuthenticated ? (
        <Tab.Screen
          name="Collaborate"
          component={CollaborateScreen}
          options={{ title: 'Colaborar' }}
        />
      ) : null}

      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: 'Admin',
            tabBarBadge: pendingBadgeCount > 0 ? pendingBadgeCount : undefined,
          }}
        />
      ) : (
        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{
            title: isAuthenticated ? 'Conta' : 'Entrar',
            tabBarIcon: ({ color, size }) => (
              <AppIcon
                name={isAuthenticated ? 'user' : 'log-in'}
                size={size ?? 20}
                color={color}
              />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    minHeight: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
});
