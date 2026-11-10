# Decisões Técnicas e Arquiteturais · CitizenTech

Este documento registra as decisões de arquitetura, algoritmos e limites da prova de conceito (**CitizenTech**), um aplicativo de bolso voltado ao trabalhador conectado exposto ao calor urbano (como entregadores de bicicleta e moto).

---

## 1. Por que `react-native-maps` e não `expo-maps` (nem `WebView`)

Escolhemos o `react-native-maps` (`1.27.2`, compatível com o Expo SDK 55) pelos seguintes motivos:

1. **Suporte ao Expo Go sem `WebView`:** `react-native-maps` faz parte dos módulos nativos empacotados no Expo Go, entregando renderização nativa (Apple Maps no iOS e Google Maps no Android) com gestos fluidos, `Marker` com `pinColor` e sobreposição de tiles (`UrlTile`).
2. **Maturidade frente ao `expo-maps`:** o `expo-maps` exige desenvolvimento com *dev client* customizado em vários cenários e possui API distinta da adotada no repositório da turma.
3. **Sobreposição meteorológica (`UrlTile`):** o componente `UrlTile` permite acoplar diretamente o modelo `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=...` do **Weather Maps 1.0** com `opacity={0.5}`, `zIndex={-1}` (abaixo dos marcadores) e `flipY={false}`. No iOS com Apple Maps, conforme a documentação do `react-native-maps` 1.27.2, a propriedade `zIndex` de `UrlTile` só tem efeito no provedor Google Maps; ainda assim, os `Marker` permanecem renderizados acima dos tiles por padrão. Quando não há chave configurada, a camada é omitida e o `MapLayerToggle` exibe um aviso discreto sem derrubar o mapa.

---

## 2. Motor de Regras do Índice de Calor no Cliente (e não Aprendizado de Máquina)

O cálculo em `src/services/heatIndexService.ts` **não é um modelo de aprendizado de máquina**: trata-se de um **motor determinístico de regras** baseado na equação oficial do *National Weather Service* (NOAA), combinando a aproximação de **Steadman** e a regressão múltipla de **Rothfusz** com os ajustes para baixa e alta umidade:

1. Converte-se a temperatura $T$ de °C para °F e calcula-se a fórmula simples de Steadman:
   $$\text{simples} = 0{,}5 \times \left(T + 61{,}0 + (T - 68{,}0)\times 1{,}2 + R \times 0{,}094\right)$$
2. Se a média $(\text{simples} + T)/2 < 80\ ^\circ\text{F}$, adota-se o valor simples.
3. Caso contrário, aplica-se a regressão de Rothfusz com o **Ajuste A** ($R < 13\%$ e $80 \le T \le 112\ ^\circ\text{F}$) e o **Ajuste B** ($R > 85\%$ e $80 \le T \le 87\ ^\circ\text{F}$), convertendo o resultado de volta para °C com 1 casa decimal.
   - *Verificação numérica validada:* $90\ ^\circ\text{F}$ ($32{,}2\ ^\circ\text{C}$) com $70\%$ de umidade produz $\approx 41{,}1\ ^\circ\text{C}$ ($106{,}0\ ^\circ\text{F}$); $25\ ^\circ\text{C}$ com $50\%$ produz $24{,}9\ ^\circ\text{C}$.

### Por que regras explicáveis?
- **Auditabilidade e confiança:** o trabalhador sabe exatamente por que o cartão está em `cuidado` ou `perigo` (temperatura + umidade + qualidade do ar), sem caixas-pretas.
- **Execução 100% no cliente e offline:** funções puras e síncronas rodam instantaneamente sobre o clima atual, sobre as 40 faixas de 3 horas da previsão e sobre os pontos monitorados da cidade.

### Combinação entre Calor e Qualidade do Ar
- O índice de calor gera `heatLevel` (`normal`, `atencao`, `cuidado`, `perigo`, `perigo_extremo`).
- O índice `aqi` (1 a 5) da Air Pollution API gera `airLevel` separado (`1–2 → normal`, `3 → atencao`, `4 → cuidado`, `5 → perigo`).
- A função `combineAlerts(heatLevel, airLevel)` adota sempre o **nível mais grave** entre os dois para o `AlertCard` principal, enquanto a tela inicial também exibe um selo exclusivo para a qualidade do ar e concentração de $\text{PM}_{2,5}$.

---

## 3. Perfil "Trabalhador na Rua" e Deslocamento das Faixas

As faixas tradicionais de índice de calor (27 °C, 32 °C, 39 °C e 52 °C) pressupõem uma pessoa em sombra leve e sem esforço físico intenso. Entregadores de bicicleta ou moto sob sol direto e trânsito pesado sofrem estresse térmico antes desses limiares.

Por isso, quando o interruptor **"Perfil trabalhador na rua"** está ativo, `getAlertLevel(heatIndexC, true)` desconta `WORKER_PROFILE_OFFSET_C = 2` °C de todos os limites (25 °C, 30 °C, 37 °C e 50 °C), antecipando os avisos de hidratação e pausa na sombra.

---

## 4. Camada de Services e Futura Troca por Sensores ESP32

Nenhuma tela ou componente importa `axios`, `@react-native-async-storage/async-storage` ou `expo-location` diretamente:

- `src/types/openWeather.ts` isola o contrato bruto da OpenWeather.
- `src/services/weatherService.ts` converte as respostas brutas (`mapCurrent`, `mapForecast`, `mapAirQuality`) para os modelos de domínio em `src/types/weather.ts` (`WeatherReading`, `ForecastSlot`, `AirQuality`, `WeatherBundle`).
- `src/services/mockWeatherService.ts` implementa exatamente as mesmas assinaturas com dados determinísticos para desenvolvimento sem chave ou demonstração sem internet.

**Evolução para sensores IoT (ESP32):** quando a solução integrada incluir estações meteorológicas urbanas com ESP32 (medindo temperatura e umidade em pontos de parada de entregadores) servidas por uma API própria, bastará criar um `iotWeatherService.ts` ou apontar `weatherService.ts` para o novo endpoint mantendo `WeatherReading` intacto — sem tocar em `HomeScreen`, `MapScreen` ou `heatIndexService`.

---

## 5. Estratégia de Cache (10 e 30 minutos) e Fallback Offline

Em `src/services/cacheStorage.ts`, cada leitura é gravada em `@citizentech:v1:cache:<tipo>:<lat>:<lon>` com coordenadas arredondadas a **2 casas decimais** ($\approx 1{,}1\text{ km}$):

- **Clima atual e qualidade do ar:** TTL de **10 minutos**.
- **Previsão de 5 dias / 3 horas (40 faixas):** TTL de **30 minutos**.
- Pequenos deslocamentos do entregador dentro do mesmo bairro reaproveitam o cache e economizam franquia de dados e cota da OpenWeather.
- Se a chamada de rede falhar e existir um cache vencido (`getStale`), o `weatherService` devolve os dados antigos com `isStale: true`, e a `HomeScreen` exibe o aviso *"Sem conexão: mostrando dados salvos de HH:mm"*.
- Toda leitura do `AsyncStorage` passa por `JSON.parse` dentro de `try/catch` e por **guardas de tipo** (`isWeatherReading`, `isAirQuality`, `isForecastSlotList`, `isSupportPoint`, `isCitizenProfile`, `isFountainReport`), nunca por `as Tipo`.

---

## 6. Persistência de Fotos no Expo SDK 55 (`expo-file-system`)

No Expo SDK 55, a API legada `copyAsync`/`documentDirectory` do `expo-file-system` foi substituída pela API orientada a objetos (`File`, `Directory` e `Paths.document`). Em `src/services/photoService.ts`, usamos `new Directory(Paths.document, 'citizentech-photos')` e `source.copy(destination)` para copiar a foto capturada pela câmera do cache temporário para o diretório persistente de documentos do app.

---

## 7. Limitações de Segurança da Prova de Conceito (100% no Cliente)

Por restrição da prova de conceito, toda a persistência ocorre no `AsyncStorage` do próprio aparelho e não há backend:

1. **Modo avaliador não é seguro:** o interruptor *"Modo avaliador (demonstração)"* na aba Colaborar apenas grava um booleano local (`@citizentech:v1:reviewer_mode`) para permitir demonstrar em aula o fluxo completo (*ponto enviado → em análise → aprovado → visível no mapa*).
2. **Posse e desativação de pontos:** o controle de quem é dono (`ownerId === profile.id`) depende do perfil salvo localmente (`@citizentech:v1:profile`). Se o usuário limpar os dados do app, perderá o vínculo com o `id` anterior.
3. **Dados não compartilhados entre aparelhos:** pontos cadastrados, aprovações e relatos de bebedouros avariados ficam apenas no dispositivo onde foram criados.
4. **Chave da OpenWeather no cliente:** variáveis `EXPO_PUBLIC_OPENWEATHER_API_KEY` são embutidas no pacote JavaScript do app. Para mitigar exposição acidental em logs ou telas, `src/services/api.ts` injeta `appid` via interceptor em `config.params` e registra apenas método, `config.url` e status HTTP — jamais a chave ou parâmetros.

---

## 8. Tratamento Formal de Permissões Nativas

Tanto localização (`expo-location` via `locationService.ts` e `useLocation.ts`) quanto câmera (`expo-camera` via `CameraCapture.tsx`) distinguem explicitamente:

- `granted`: recurso liberado (`showsUserLocation` no mapa, captura de foto na câmera).
- `undetermined` / `denied` (`canAskAgain === true`): exibe o `PermissionNotice` com botão **"Permitir"**, que aciona o diálogo nativo.
- `blocked` (`canAskAgain === false`) ou `services_disabled`: exibe explicação clara e botão **"Abrir configurações"** (`Linking.openSettings()`), revalidando o estado automaticamente quando o usuário retorna ao app (`AppState`).
- Sem permissão de localização, o app **nunca trava**: utiliza `DEFAULT_REGION` (Praça da Sé, SP) e permite posicionar novos pontos tocando diretamente no mini mapa do formulário.

---

## 9. O que Seria Feito em Produção com um Backend

Em uma versão de produção:
- **Autenticação e papéis reais:** login leve (OAuth / OTP por telefone) para autores e controle de acesso baseado em papéis (RBAC) no servidor para moderadores.
- **Banco geoespacial compartilhado:** PostgreSQL + PostGIS (ou serviço equivalente) para busca por raio, paginação e sincronização entre todos os usuários da cidade, além de armazenamento de fotos em *object storage* com CDN.
- **Proxy para OpenWeather + ingestão IoT:** um backend intermediaria as chamadas à OpenWeather (mantendo a API key secreta no servidor e fazendo cache compartilhado por célula geográfica) e receberia telemetria MQTT/HTTP das estações ESP32 instaladas na cidade.
