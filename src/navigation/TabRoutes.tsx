/**
 * Navegação em abas: Início (HomeScreen), Mapa (MapScreen) e Colaborar (CollaborateScreen).
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';

import { CollaborateScreen } from '../screens/CollaborateScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/spacing';
import type { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

function renderTabIcon(symbol: string, focused: boolean) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{symbol}</Text>;
}

export function TabRoutes() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => renderTabIcon('☀️', focused),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => renderTabIcon('🗺️', focused),
        }}
      />
      <Tab.Screen
        name="Collaborate"
        component={CollaborateScreen}
        options={{
          title: 'Colaborar',
          tabBarIcon: ({ focused }) => renderTabIcon('🤝', focused),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  icon: {
    fontSize: fontSize.title,
    opacity: 0.7,
  },
  iconFocused: {
    opacity: 1,
  },
});
