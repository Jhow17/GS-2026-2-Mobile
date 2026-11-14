# DECISÕES TÉCNICAS E LIMITES DA PROVA DE CONCEITO

Este documento registra as escolhas arquiteturais, os algoritmos adotados e os limites conhecidos do **CitizenTech**, mantendo o código enxuto, legível e fiel aos padrões da disciplina (**Expo SDK 58**, **TypeScript estrito** com validação `unknown`, `StyleSheet.create` e separação rigorosa entre `screens`, `components`, `contexts`, `hooks`, `services`, `types`, `utils` e `theme`).

---

## 1. Execução 100% no Cliente (`AsyncStorage`) e Chaves Persistidas

- **Como foi feito**: Toda a persistência utiliza `@react-native-async-storage/async-storage` encapsulado por `src/services/cacheStorage.ts`, com validação de tipos (`unknown` $\rightarrow$ tipo de domínio) antes de entregar dados às camadas superiores.
- **Chaves utilizadas sob o prefixo `@citizentech:v1:`**:
  - `@citizentech:v1:points` — Pontos de apoio (7 pontos iniciais de São Paulo `seed_1` a `seed_7` + pontos sugeridos pelos usuários);
  - `@citizentech:v1:deleted_seeds` — IDs de pontos iniciais excluídos pelo administrador (evita recriação no `ensureSeed`);
  - `@citizentech:v1:reports` — Relatos de defeito em bebedouros e pontos de apoio;
  - `@citizentech:v1:accounts` e `@citizentech:v1:session` — Contas cadastradas localmente e sessão autenticada ativa;
  - `@citizentech:v1:profile`, `@citizentech:v1:worker_mode` e `@citizentech:v1:heat_alerts_enabled` — Perfil legado, preferência *"Trabalho na rua"* e preferência de notificações de calor;
  - `@citizentech:v1:last_heat_alert` — Registro do último alerta térmico disparado para controle de *cooldown* de 2 horas;
  - `@citizentech:v1:cache:*` — Cache com TTL para clima atual (15 min), previsão (30 min), qualidade do ar (15 min) e ranking de pontos quentes.
- **Aviso de Segurança (Conta de Administrador Semeada)**:
  - A conta de administrador (`admin@citizentech.org` / `Admin@2026`, configurável via `EXPO_PUBLIC_ADMIN_EMAIL` e `EXPO_PUBLIC_ADMIN_PASSWORD`) não pode ser criada pela tela pública de cadastro; ela é semeada automaticamente na inicialização do `authStorage.ts` com hash determinístico local (`FNV-1a`).
  - **Limite conhecido**: Em qualquer aplicação 100% client-side, variáveis `EXPO_PUBLIC_*` e dados no `AsyncStorage` residem no dispositivo do usuário. Em um ambiente de produção real, a autenticação, o hash de senhas (Argon2/bcrypt) e a verificação de papel (`role === 'admin'`) devem ocorrer obrigatoriamente em um backend seguro (API REST + JWT/OAuth2).

---

## 2. Privacidade e Minimização de Dados (LGPD) no Cadastro por CEP

- **Como foi feito**: Ao criar uma conta (`RegisterScreen.tsx`), o usuário informa o CEP (`00000-000`), validado em tempo real na API pública gratuita **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`).
- **Minimização de dados**: Embora o ViaCEP confirme a existência do CEP e retorne o logradouro, na conta do trabalhador (`UserAccount`) armazenamos apenas o **CEP, bairro, cidade e UF** para referência regional, sem exigir número residencial pessoal.

---

## 3. Mapa Interativo Compatível com Expo Go (`InteractiveMapView.tsx`)

- **Diagnóstico técnico**: No Android sob a *New Architecture / Fabric* no Expo Go, o `react-native-maps` utiliza o Google Maps SDK nativo por padrão. Sem uma chave `android.config.googleMaps.apiKey` vinculada a uma conta de faturamento no Google Cloud e compilada em uma *Development Build*, o motor OpenGL do Google Maps exibe apenas o logotipo `"Google"` sobre um canvas escuro, sem desenhar os tiles nem os marcadores.
- **Como foi resolvido**: Implementamos o componente [`InteractiveMapView.tsx`](file:///C:/Users/Jonathan%20Silva/FIAP/GS/Mobile/src/components/InteractiveMapView.tsx) utilizando `react-native-webview` + Leaflet 1.9 + tiles abertos (Carto Voyager / OpenStreetMap) + sobreposição das camadas da OpenWeather (`temp_new`, `precipitation_new`, `clouds_new`, `wind_new`).
- **Vantagens**:
  1. Funciona **100% no Expo Go (SDK 58)** no Android e no iOS sem tela preta e sem exigir cartão de crédito no Google Cloud;
  2. Exibe marcadores coloridos por categoria (`bebedouro`, `sombra`, `descanso`, `parceiro`), posição do usuário e camadas meteorológicas;
  3. Serve também como mini-mapa interativo no formulário de pontos (`PointFormScreen.tsx`), permitindo tocar ou arrastar o pino para ajustar a coordenada exata.

---

## 4. Endereço por CEP e Geocodificação em Cascata (`geocodingService.ts`)

- **Como foi feito**: No cadastro/edição de ponto de apoio (`PointFormScreen.tsx`), o usuário pode escolher entre **"Informar endereço (CEP)"** e **"Usar meu GPS"**.
- **Cascata de Geocodificação**:
  1. Tenta primeiro `Location.geocodeAsync` (`expo-location`) quando a permissão de GPS está ativa (alta precisão para rua + número);
  2. Caso a permissão de GPS tenha sido negada ou não retorne resultado, consulta o geocodificador aberto **Nominatim (OpenStreetMap)** via HTTP com cabeçalho `User-Agent` identificado;
  3. Como terceiro nível de segurança, consulta a **BrasilAPI CEP v2** (`/api/cep/v2/{cep}`), que fornece coordenadas geográficas do CEP, posicionando o pino no mini-mapa para confirmação ou ajuste manual.

---

## 5. Cálculo do Índice de Calor, Qualidade do Ar e Educação em Saúde (`heatIndexService.ts`)

- **Fórmula de Rothfusz / NOAA**:
  - Converte a temperatura para Fahrenheit e aplica primeiro a fórmula simples de Steadman. Quando a média com a temperatura é $\ge 80\ ^\circ\text{F}$, aplica a regressão polinomial completa de 9 termos de Rothfusz com os ajustes oficiais do NWS/NOAA para baixa umidade ($RH < 13\%$) e alta umidade ($RH > 85\%$).
- **Faixas de Alerta Calibradas e Modo "Trabalho na rua"**:
  - Faixas padrão: `normal` ($< 27\ ^\circ\text{C}$), `atencao` ($27\text{ a }31{,}9\ ^\circ\text{C}$), `cuidado` ($32\text{ a }40{,}9\ ^\circ\text{C}$), `perigo` ($41\text{ a }53{,}9\ ^\circ\text{C}$) e `perigo_extremo` ($\ge 54\ ^\circ\text{C}$).
  - Quando a preferência **"Trabalho na rua"** (`workerMode`) está ativa, todos os limiares são antecipados em **2 °C** (`WORKER_PROFILE_OFFSET_C = 2`).
  - A qualidade do ar (AQI 1 a 5) é combinada com peso calibrado (`AQI 4` $\rightarrow$ `atencao`, `AQI 5` $\rightarrow$ `cuidado`), e o `AlertCard` exibe uma nota explicativa (`airNote`) sempre que o nível combinado tiver sido elevado pela poluição do ar.
- **Modais Educativos (`HeatIndexInfoModal.tsx` e `HeatProtectionModal.tsx`)**: Apresentam a explicação das métricas, recomendações oficiais do **Ministério da Saúde** e **OMS / NIOSH**, chamada rápida ao **SAMU (192)** e atalho para o ponto de apoio mais próximo.

---

## 6. Notificações Locais e Preditivas de Calor Extremo (`notificationService.ts`)

- **Arquitetura 100% Client-Side (`expo-notifications`)**:
  - Como a prova de conceito não utiliza backend nem Firebase, os alertas no sistema operacional são realizados via **notificações locais**:
    1. **Alerta Imediato com Cooldown**: Quando o `WeatherBundle` carrega em faixa de risco (`perigo` ou `perigo_extremo`, ou a partir de `cuidado` no modo *Trabalho na rua*), o serviço dispara uma notificação imediata e grava o timestamp em `@citizentech:v1:last_heat_alert`. Novas notificações automáticas respeitam um intervalo de **2 horas**, exceto se o risco térmico subir para uma faixa mais grave.
    2. **Agendamento Preditivo pelas Faixas de 3h**: A cada atualização climática, o serviço analisa as próximas 24 horas da previsão (`bundle.forecast`) e agenda até 3 notificações locais futuras (`SchedulableTriggerInputTypes.DATE`) para os horários em que o calor previsto atingir nível crítico — garantindo que o trabalhador seja avisado mesmo com o app fechado.
- **Detalhe Técnico no Android (SDK 58)**:
  - Não invocamos `setNotificationChannelAsync` a partir do JS porque o serializador nativo `ExpoNotificationsChannelSerializer` no SDK 58 lança `NullPointerException` ao converter campos opcionais nulos do `Bundle` de retorno; em vez disso, utilizamos diretamente o canal nativo de alta prioridade (`IMPORTANCE_HIGH`, com som e vibração) criado pelo `BaseNotificationBuilder` do próprio `expo-notifications`.

---

## 7. Migração para Expo SDK 58 e Sistema Visual (`shadcn/ui` + Zero Emojis)

- **Expo SDK 58 (`react-native 0.88.1`, `react 19.3.0`, TypeScript `~6.0.3`)**:
  - A configuração de splash screen foi migrada para o config plugin `expo-splash-screen` no `app.json`, acompanhada de `expo-font` e `expo-notifications`, passando em **20/20 verificações do `npx expo-doctor`** e `tsc --noEmit` sem erros.
- **Zero Emojis e Acessibilidade Visual**:
  - Todos os ícones utilizam vetores padronizados (`@expo/vector-icons/Feather`) via `src/components/AppIcon.tsx`, com estilização 100% em `StyleSheet.create`, tokens centralizados em `src/theme/colors.ts` e `src/theme/spacing.ts`, contraste $\ge 4.5:1$ e áreas mínimas de toque $\ge 44\text{pt}$.
