/**
 * Pilha nativa raiz: Tabs, PointDetail, PointForm, MyPlaces e Reviewer.
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';

import { MyPlacesScreen } from '../screens/MyPlacesScreen';
import { PointDetailScreen } from '../screens/PointDetailScreen';
import { PointFormScreen } from '../screens/PointFormScreen';
import { ReviewerScreen } from '../screens/ReviewerScreen';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/spacing';
import type { RootStackParamList } from '../types/navigation';
import { TabRoutes } from './TabRoutes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppRoutes() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen name="Tabs" component={TabRoutes} options={{ headerShown: false }} />
      <Stack.Screen
        name="PointDetail"
        component={PointDetailScreen}
        options={{ title: 'Detalhes do ponto' }}
      />
      <Stack.Screen
        name="PointForm"
        component={PointFormScreen}
        options={({ route }) => ({
          title:
            route.params.mode === 'bebedouro_avariado'
              ? 'Reportar bebedouro'
              : 'Novo ponto de apoio',
        })}
      />
      <Stack.Screen
        name="MyPlaces"
        component={MyPlacesScreen}
        options={{ title: 'Meus espaços' }}
      />
      <Stack.Screen
        name="Reviewer"
        component={ReviewerScreen}
        options={{ title: 'Modo avaliador' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
