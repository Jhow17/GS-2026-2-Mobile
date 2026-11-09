/**
 * Rotas tipadas do app (abas + pilha nativa).
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Modos do formulário. */
export type PointFormMode = 'novo_ponto' | 'bebedouro_avariado';

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Collaborate: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  PointDetail: { pointId: string };
  PointForm: { mode: PointFormMode; pointId?: string };
  MyPlaces: undefined;
  Reviewer: undefined;
};

/** Props das telas da pilha. */
export type PointDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'PointDetail'>;
export type PointFormScreenProps = NativeStackScreenProps<RootStackParamList, 'PointForm'>;
export type MyPlacesScreenProps = NativeStackScreenProps<RootStackParamList, 'MyPlaces'>;
export type ReviewerScreenProps = NativeStackScreenProps<RootStackParamList, 'Reviewer'>;

/** Props das telas das abas (podem navegar também para a pilha). */
export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type MapScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type CollaborateScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Collaborate'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Tipos usados com useNavigation / useRoute. */
export type HomeNavigation = HomeScreenProps['navigation'];
export type MapNavigation = MapScreenProps['navigation'];
export type CollaborateNavigation = CollaborateScreenProps['navigation'];
export type PointDetailNavigation = PointDetailScreenProps['navigation'];
export type PointDetailRoute = PointDetailScreenProps['route'];
export type PointFormNavigation = PointFormScreenProps['navigation'];
export type PointFormRoute = PointFormScreenProps['route'];
export type MyPlacesNavigation = MyPlacesScreenProps['navigation'];
export type ReviewerNavigation = ReviewerScreenProps['navigation'];
