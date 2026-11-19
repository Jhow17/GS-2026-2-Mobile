# Mobile TermoAtiva — Apoio Térmico Urbano para Trabalhadores Conectados

## Objetivo do Projeto

O **CitizenTech** é um aplicativo mobile desenvolvido em **React Native (Expo SDK 58)** com **TypeScript, projetado como uma ferramenta de bolso para **entregadores, ciclistas, motociclistas, trabalhadores ao ar livre e cidadãos** enfrentarem ondas de calor extremo nos grandes centros urbanos (com foco inicial em São Paulo).

O projeto funciona é inicialmente um MVP funcionando **100% no cliente (*client-side*)**, combinando dados meteorológicos e de qualidade do ar em tempo real da **OpenWeather**, cálculo do **Índice de Calor (equação de Rothfusz / NOAA)**, **notificações locais e preditivas de risco térmico** e uma **rede colaborativa e moderada de pontos de apoio** (bebedouros públicos, áreas de sombra, espaços de descanso e pontos parceiros).

---

## Principais Funcionalidades

### 1. Aba Início (`StartScreen`) — Alerta Imediato e Pontos Próximos
- **Cartão de Alerta Térmico (`AlertCard`)**: Exibe o Índice de Calor atual em destaque, a faixa de risco (`Normal`, `Atenção`, `Cuidado`, `Perigo` ou `Perigo extremo`), a tendência para as próximas horas e aviso específico quando a qualidade do ar eleva o nível de alerta.
- **Modo "Trabalho na rua"**: Chave rápida (persistida no aparelho) que antecipa os limiares de alerta em **2 °C** para proteger quem exerce esforço físico direto sob o sol.
- **Educação em Saúde Térmica (`HeatIndexInfoModal` e `HeatProtectionModal`)**:
  - Botão **"O que é o índice?"**: Explica de forma acessível a diferença entre temperatura do ar, sensação térmica e índice de calor, detalhando as 5 faixas de risco.
  - Botão **"Dicas para se proteger"**: Exibido a partir da faixa *Cuidado*, reúne recomendações oficiais do **Ministério da Saúde** e da **OMS / NIOSH**, identificação de sinais de exaustão térmica vs. insolação, atalho de ligação de emergência para o **SAMU (192)** e navegação direta para o **ponto de apoio mais próximo**.
- **Pontos de Apoio Próximos**: Lista de pontos aprovados e ativos ordenados pela distância até o trabalhador (fórmula de Haversine), com busca textual por nome/endereço, filtro rápido por categoria (`Bebedouro`, `Sombra`, `Descanso`, `Ponto parceiro`) e indicador de aberto/fechado no horário atual.

### 2. Aba Mapa (`MapScreen` e `InteractiveMapView`)
- **Mapa Interativo Nativo / Híbrido no Expo Go**: Renderiza o mapa urbano com marcadores categorizados por cor, posição atual do usuário via GPS e controles de filtro por categoria e por funcionamento (*"Abertos agora"*).
- **Camadas Climáticas da OpenWeather (`MapLayerToggle`)**: Permite sobrepor ao mapa, com opacidade ajustada, os tiles meteorológicos de **Temperatura (`temp_new`)**, **Precipitação (`precipitation_new`)**, **Nuvens (`clouds_new`)** e **Vento (`wind_new`)**.
- **Cartão Rápido do Ponto**: Ao tocar em qualquer marcador, exibe resumo com distância, horário, comodidades, alertas de relatos abertos e acesso aos detalhes completos.

### 3. Aba Clima (`HomeScreen`) e Notificações de Calor Extremo
- **Resumo Meteorológico (`WeatherSummary`)**: Temperatura atual, sensação térmica, umidade relativa e velocidade do vento em km/h.
- **Previsão das Próximas 24 Horas (`ForecastStrip`)**: Faixas de 3 em 3 horas com o Índice de Calor e o nível de alerta individual calculados para cada horário.
- **Qualidade do Ar**: Índice AQI (1 a 5) e concentração de material particulado fino (`PM2.5` em µg/m³).
- **Notificações Locais e Preditivas (`notificationService.ts`)**:
  - Dispara notificação local de alta prioridade quando o índice de calor atinge faixa crítica (com *cooldown* inteligente de 2 horas salvo no `AsyncStorage`, furando o intervalo caso o nível de risco se agrave).
  - Agenda automaticamente notificações preditivas para os próximos horários críticos da previsão de 3h, alertando o trabalhador mesmo com o aplicativo fechado.
  - Conta com botão **"Testar notificação de alerta agora"** para validação imediata na banca examinadora.
- **Ranking de Calor Urbano (`HotSpotItem`)**: Lista as 10 regiões monitoradas de São Paulo (Sé, Paulista, Pinheiros, Ibirapuera, Mooca, Tatuapé, Santana, Santo Amaro, Itaquera e Lapa) ordenadas do maior para o menor Índice de Calor.

### 4. Aba Colaborar (`CollaborateScreen`), Cadastro por CEP/GPS (`PointFormScreen`) e Relatos (`PointDetailScreen`)
- **Sugestão de Novos Pontos de Apoio**:
  - **Localização por CEP (M8)**: Consulta automática no **ViaCEP**, seguida de **Geocodificação em Cascata** (`expo-location` $\rightarrow$ **Nominatim / OpenStreetMap** $\rightarrow$ **BrasilAPI CEP v2**) e confirmação visual em **mini-mapa interativo** com pino ajustável.
  - **Localização por GPS**: Captura das coordenadas atuais do aparelho com tratamento formal de permissões (`granted`, `denied`, `blocked`, `services_disabled`).
  - **Foto Nativa (`CameraCapture` + `photoService.ts`)**: Captura via `expo-camera` e cópia persistente para o diretório de documentos do app com a API orientada a objetos do `expo-file-system`.
- **Gestão pelo Autor (`MyPlacesScreen`)**: O autor acompanha o status de aprovação (`Em análise`, `Aprovado`, `Não aprovado` com motivo), além de poder editar, pausar/reativar ou excluir seus próprios locais.
- **Relato de Problemas em Bebedouros (`PointDetailScreen`)**: Qualquer usuário autenticado pode reportar avarias (ex.: falta de água, vazamento, equipamento quebrado) com descrição e foto opcional.

### 5. Autenticação Local com LGPD (`LoginScreen`, `RegisterScreen`, `AccountScreen`)
- **Cadastro com Minimização de Dados (LGPD)**: Valida o CEP em tempo real via ViaCEP e armazena apenas referência regional (CEP, bairro, cidade e UF), sem exigir número residencial pessoal, com senha protegida por hash determinístico local (`FNV-1a`).
- **Redirecionamento Inteligente Pós-Login**: Visitantes acessam livremente alertas, clima e mapa; ao tentar sugerir um ponto ou reportar um defeito, são conduzidos ao login e redirecionados automaticamente de volta à ação desejada.

### 6. Painel de Administração (`AdminScreen`)
- Exclusivo para contas com perfil `admin` (com badge de pendências na barra inferior):
  - Aprovação ou rejeição justificada de novos pontos sugeridos pela comunidade;
  - Edição completa de qualquer ponto de apoio, alternância de status ativo/inativo e exclusão com confirmação;
  - Moderação de relatos de defeito (marcar como resolvido ou excluir relato improcedente).

---

## Tecnologias e Arquitetura

- **Core**: Expo SDK 58 (`~58.0.25`), React `19.3.0`, React Native `0.88.1`, TypeScript `~6.0.3` (`"strict": true`, zero `any`).
- **Navegação**: `@react-navigation/native`, `@react-navigation/bottom-tabs` (abas dinâmicas por perfil) e `@react-navigation/native-stack`.
- **Módulos Nativos e Persistência**:
  - `@react-native-async-storage/async-storage` (persistência local e cache offline com TTL);
  - `expo-location` (GPS em tempo real e geocodificação);
  - `expo-camera` e `expo-file-system` (captura e persistência de fotos);
  - `expo-notifications` (alertas térmicos imediatos e agendados);
  - `react-native-webview` + Leaflet / OpenStreetMap e `react-native-maps`.
- **Rede**: `axios` com *interceptors* em `src/services/api.ts` (cabeçalho `X-App-Name: CitizenTech` e logs seguros que nunca expõem a `appid` da OpenWeather).

### Estrutura de Pastas (`src/`)
```text
src/
├── components/   # Componentes visuais reutilizáveis e modais (AlertCard, InteractiveMapView, CameraCapture, etc.)
├── config/       # Configurações globais, regiões monitoradas e conteúdo de saúde térmica
├── contexts/     # Estado global (AuthContext, ProfileContext, SupportPointsContext)
├── hooks/        # Hooks customizados (useAuth, useLocation, useProfile, useSupportPoints, useWeather)
├── navigation/   # Rotas tipadas (AppRoutes e TabRoutes)
├── screens/      # Telas da aplicação (*Screen.tsx)
├── services/     # Integrações externas, cálculos e persistência (*Service.ts e *Storage.ts)
├── theme/        # Tokens de cores (colors.ts) e espaçamentos/tipografia (spacing.ts)
├── types/        # Contratos e interfaces TypeScript estritos
└── utils/        # Funções puras (distância Haversine, temperatura, tempo, formatação e validação unknown)
```

---

## Como Rodar o Projeto

### Pré-requisitos
- **Node.js** (LTS recomendado) e **npm**.
- Aplicativo **Expo Go (SDK 58)** instalado no celular Android ou iOS, ou Emulador Android / Simulador iOS configurado no computador.

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente (opcional):**
   Copie o arquivo `.env.example` para `.env` na raiz do projeto e adicione sua chave gratuita da OpenWeather:
   ```env
   EXPO_PUBLIC_OPENWEATHER_API_KEY=sua_chave_openweather_aqui
   EXPO_PUBLIC_ADMIN_EMAIL=admin@citizentech.org
   EXPO_PUBLIC_ADMIN_PASSWORD=Admin@2026
   ```
   > **Nota:** Caso não informe uma chave ou esteja sem internet, o aplicativo ativa automaticamente o **modo de demonstração determinístico (`mockWeatherService.ts`)** e o cache local (`cacheStorage.ts`), permitindo testar 100% das telas e alertas offline.

3. **Inicie o servidor de desenvolvimento (limpando o cache do Metro):**
   ```bash
   npm start
   ```
   *(ou `npx expo start -c` — se estiver em rede Wi-Fi com isolamento de cliente, utilize `npx expo start --tunnel`)*.

4. **Abra o aplicativo:**
   - Escaneie o QR Code exibido no terminal usando o **Expo Go** (no Android) ou a câmera nativa (no iOS); ou
   - Pressione **`a`** no terminal para abrir em um Emulador Android.

5. **Comandos de verificação de qualidade:**
   ```bash
   npm run typecheck
   npx expo-doctor
   ```

### Credenciais de Demonstração (Administrador)
Para testar a moderação na aba **Admin**, acesse a aba **Entrar** e toque no botão rápido **"Preencher acesso de administrador"** (ou informe manualmente):
- **E-mail:** `admin@citizentech.org`
- **Senha:** `Admin@2026`

---

## Integrantes do Grupo

- **Jonathan Henrique da Silva** — RM: 561139
- **Musashi Nascimento Mabuti** — RM: 559444
- **Marcos Vinicius Gonçalves Santos** — RM: 560062
- **Felipe Gimenes** — RM: 99799
