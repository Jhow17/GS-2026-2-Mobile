/**
 * Mapa interativo baseado em Leaflet + OpenStreetMap/Carto Voyager + OpenWeather Tiles
 * sobre react-native-webview (Opção 1B aprovada).
 *
 * Resolve definitivamente o problema da área preta do Google Maps SDK sem chave no
 * Expo Go (Android/iOS, SDK 55 / RN 0.83 New Architecture), mantendo:
 * - Mapa base nítido sem necessidade de chave do Google Cloud nem Development Build;
 * - Marcadores categorizados por cor (bebedouro, sombra, descanso, parceiro);
 * - Seleção de marcador com destaque e centralização suave (flyTo);
 * - Posição do usuário em tempo real;
 * - Sobreposição de camadas da OpenWeather (temp_new, precipitation_new, clouds_new, wind_new);
 * - Modo de seleção/arraste de pino para o mini-mapa de confirmação de endereço por CEP (M8).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors, pointTypeColors } from '../theme/colors';
import type { Coordinates } from '../types/location';
import type { PointType, SupportPoint } from '../types/supportPoint';
import { pointTypeLabels } from '../utils/formatters';
import { isRecord } from '../utils/validation';

export interface InteractiveMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  type: PointType;
  color: string;
}

interface InteractiveMapViewProps {
  center: Coordinates;
  zoom?: number;
  points?: SupportPoint[];
  selectedPointId?: string | null;
  userLocation?: Coordinates | null;
  weatherTileUrlTemplate?: string;
  /** Quando definido, exibe um pino editável (toque no mapa ou arraste) para a M8. */
  pickerPin?: Coordinates | null;
  onSelectPoint?: (pointId: string) => void;
  onPickCoordinates?: (coords: Coordinates) => void;
  style?: StyleProp<ViewStyle>;
}

interface WebViewInboundMessage {
  type: 'ready' | 'markerPress' | 'mapPick';
  pointId?: string;
  latitude?: number;
  longitude?: number;
}

function isWebViewInboundMessage(value: unknown): value is WebViewInboundMessage {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  return (
    value.type === 'ready' ||
    value.type === 'markerPress' ||
    value.type === 'mapPick'
  );
}

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      transition: transform 0.15s ease;
    }
    .custom-pin-selected {
      border: 3px solid #0F172A;
      box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.35), 0 4px 10px rgba(15, 23, 42, 0.45);
      transform: scale(1.22);
      z-index: 1000 !important;
    }
    .user-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #0284C7;
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 0 5px rgba(2, 132, 199, 0.25);
    }
    .picker-pin {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: #0F766E;
      border: 3px solid #FFFFFF;
      transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.4);
    }
    .leaflet-control-attribution {
      font-size: 10px;
      background: rgba(255,255,255,0.75) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function() {
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([-23.5505, -46.6333], 13);

      var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var fallbackActivated = false;
      osmLayer.on('tileerror', function() {
        if (!fallbackActivated) {
          fallbackActivated = true;
          map.removeLayer(osmLayer);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap &copy; Esri'
          }).addTo(map);
        }
      });

      var weatherLayer = null;
      var currentWeatherUrl = '';
      var markersLayer = L.layerGroup().addTo(map);
      var userMarker = null;
      var pickerMarker = null;
      var pickModeEnabled = false;

      function postToRN(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function badgeLetter(type) {
        if (type === 'bebedouro') return 'B';
        if (type === 'sombra') return 'S';
        if (type === 'descanso') return 'D';
        return 'P';
      }

      map.on('click', function(e) {
        if (pickModeEnabled && e && e.latlng) {
          postToRN({
            type: 'mapPick',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          });
        }
      });

      window.__updateMapState = function(state) {
        if (!state) return;

        pickModeEnabled = Boolean(state.enablePick);

        if (state.weatherTileUrlTemplate !== currentWeatherUrl) {
          currentWeatherUrl = state.weatherTileUrlTemplate || '';
          if (weatherLayer) {
            map.removeLayer(weatherLayer);
            weatherLayer = null;
          }
          if (currentWeatherUrl.length > 0) {
            weatherLayer = L.tileLayer(currentWeatherUrl, {
              maxZoom: 19,
              opacity: 0.65,
              zIndex: 5
            }).addTo(map);
          }
        }

        if (state.userLocation) {
          var uLatLng = [state.userLocation.latitude, state.userLocation.longitude];
          if (!userMarker) {
            var uIcon = L.divIcon({
              className: '',
              html: '<div class="user-dot"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            userMarker = L.marker(uLatLng, { icon: uIcon, interactive: false }).addTo(map);
          } else {
            userMarker.setLatLng(uLatLng);
          }
        } else if (userMarker) {
          map.removeLayer(userMarker);
          userMarker = null;
        }

        if (state.pickerPin) {
          var pLatLng = [state.pickerPin.latitude, state.pickerPin.longitude];
          if (!pickerMarker) {
            var pIcon = L.divIcon({
              className: '',
              html: '<div class="picker-pin"></div>',
              iconSize: [28, 28],
              iconAnchor: [14, 28]
            });
            pickerMarker = L.marker(pLatLng, { icon: pIcon, draggable: true }).addTo(map);
            pickerMarker.on('dragend', function(ev) {
              var pos = ev.target.getLatLng();
              postToRN({
                type: 'mapPick',
                latitude: pos.lat,
                longitude: pos.lng
              });
            });
          } else {
            pickerMarker.setLatLng(pLatLng);
          }
        } else if (pickerMarker) {
          map.removeLayer(pickerMarker);
          pickerMarker = null;
        }

        markersLayer.clearLayers();
        var markers = state.markers || [];
        var selectedId = state.selectedPointId || null;

        for (var i = 0; i < markers.length; i++) {
          (function(m) {
            var isSelected = m.id === selectedId;
            var size = isSelected ? 34 : 28;
            var cls = isSelected ? 'custom-pin custom-pin-selected' : 'custom-pin';
            var html = '<div class="' + cls + '" style="width:' + size + 'px;height:' + size + 'px;background:' + m.color + ';">' + badgeLetter(m.type) + '</div>';
            var icon = L.divIcon({
              className: '',
              html: html,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2]
            });
            var marker = L.marker([m.latitude, m.longitude], { icon: icon });
            marker.on('click', function(ev) {
              L.DomEvent.stopPropagation(ev);
              postToRN({ type: 'markerPress', pointId: m.id });
            });
            markersLayer.addLayer(marker);
          })(markers[i]);
        }
      };

      window.__flyTo = function(lat, lng, zoom) {
        if (typeof lat === 'number' && typeof lng === 'number') {
          map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.45 });
        }
      };

      postToRN({ type: 'ready' });
    })();
  </script>
</body>
</html>`;

export function InteractiveMapView({
  center,
  zoom = 13,
  points = [],
  selectedPointId = null,
  userLocation = null,
  weatherTileUrlTemplate = '',
  pickerPin = null,
  onSelectPoint,
  onPickCoordinates,
  style,
}: InteractiveMapViewProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastCenterRef = useRef<string>('');

  const markers = useMemo<InteractiveMapMarker[]>(
    () =>
      points.map((pt) => ({
        id: pt.id,
        latitude: pt.latitude,
        longitude: pt.longitude,
        title: pt.name,
        subtitle: pointTypeLabels[pt.type],
        type: pt.type,
        color: pointTypeColors[pt.type],
      })),
    [points],
  );

  // Sincroniza marcadores, seleção, posição do usuário e camada climática
  useEffect(() => {
    if (!mapReady || !webViewRef.current) {
      return;
    }
    const payload = JSON.stringify({
      markers,
      selectedPointId,
      userLocation,
      weatherTileUrlTemplate,
      pickerPin,
      enablePick: Boolean(onPickCoordinates),
    });
    webViewRef.current.injectJavaScript(
      `window.__updateMapState && window.__updateMapState(${payload}); true;`,
    );
  }, [
    mapReady,
    markers,
    selectedPointId,
    userLocation,
    weatherTileUrlTemplate,
    pickerPin,
    onPickCoordinates,
  ]);

  // Centraliza o mapa quando `center` muda significativamente
  useEffect(() => {
    if (!mapReady || !webViewRef.current) {
      return;
    }
    const centerKey = `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${zoom}`;
    if (lastCenterRef.current === centerKey) {
      return;
    }
    lastCenterRef.current = centerKey;
    webViewRef.current.injectJavaScript(
      `window.__flyTo && window.__flyTo(${center.latitude}, ${center.longitude}, ${zoom}); true;`,
    );
  }, [mapReady, center.latitude, center.longitude, zoom]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      try {
        const parsed: unknown = JSON.parse(event.nativeEvent.data);
        if (!isWebViewInboundMessage(parsed)) {
          return;
        }
        if (parsed.type === 'ready') {
          setMapReady(true);
          return;
        }
        if (
          parsed.type === 'markerPress' &&
          typeof parsed.pointId === 'string' &&
          onSelectPoint
        ) {
          onSelectPoint(parsed.pointId);
          return;
        }
        if (
          parsed.type === 'mapPick' &&
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number' &&
          onPickCoordinates
        ) {
          onPickCoordinates({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          });
        }
      } catch {
        // Ignora mensagens malformadas
      }
    },
    [onSelectPoint, onPickCoordinates],
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: INITIAL_HTML, baseUrl: 'https://citizentech.org' }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
