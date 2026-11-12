# DECISÕES TÉCNICAS E LIMITES DA PROVA DE CONCEITO

Este documento registra as escolhas arquiteturais e os limites conhecidos do **CitizenTech**, mantendo o código enxuto, legível e fiel aos padrões de sala de aula (TypeScript estrito, `StyleSheet.create`, separação entre `screens`, `components`, `contexts`, `hooks`, `services`, `types`, `utils` e `theme`).

---

## 1. Execução 100% no cliente (`AsyncStorage`) e Contas Locais (M5/M6)

- **Como foi feito**: Os sete pontos iniciais de São Paulo (`seed_1` a `seed_7`), os novos pedidos de pontos, os relatos de bebedouros com defeito, as contas de usuários (`@citizentech:v1:accounts`) e a sessão ativa (`@citizentech:v1:session`) ficam salvos no próprio aparelho com `@react-native-async-storage/async-storage`, sob o prefixo `@citizentech:v1:`.
- **Por que fizemos assim**: Permite demonstrar todo o ciclo (consulta pública $\rightarrow$ login/cadastro com validação de CEP no ViaCEP $\rightarrow$ solicitação de ponto ou relato de defeito $\rightarrow$ moderação administrativa com aprovação, edição, desativação e exclusão) diretamente no Expo Go, sem depender de servidor próprio ou banco em nuvem.
- **Aviso de Segurança (Conta de Administrador Semeada)**:
  - A conta de administrador (`admin@citizentech.org` / `Admin@2026`, configurável via `EXPO_PUBLIC_ADMIN_EMAIL` e `EXPO_PUBLIC_ADMIN_PASSWORD`) não pode ser criada pela tela pública de cadastro; ela é semeada automaticamente na inicialização do `authStorage.ts` com hash determinístico local.
  - **Limite conhecido**: Em qualquer aplicação 100% client-side, variáveis `EXPO_PUBLIC_*` e dados no `AsyncStorage` residem no dispositivo do usuário. Em um ambiente de produção real, a autenticação, o hash de senhas (Argon2/bcrypt) e a verificação de papel (`role === 'admin'`) devem ocorrer obrigatoriamente em um backend seguro (API REST + JWT/OAuth2).

---

## 2. Privacidade e Minimização de Dados (LGPD) no Cadastro por CEP

- **Como foi feito**: Ao criar uma conta (`RegisterScreen.tsx`), o usuário informa o CEP (`00000-000`), validado em tempo real na API pública gratuita **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`).
- **Minimização de dados**: Embora o ViaCEP confirme a existência do CEP e retorne o logradouro, na conta do trabalhador (`UserAccount`) armazenamos apenas o **CEP, bairro, cidade e UF** para referência regional, sem exigir número residencial pessoal.

---

## 3. Solução Definitiva do Mapa no Expo Go (`InteractiveMapView.tsx`)

- **Diagnóstico do problema anterior**: No Android sob Expo SDK 55 (`react-native 0.83.10`, New Architecture / Fabric), o `react-native-maps` utiliza o Google Maps SDK nativo por padrão. Sem uma chave `android.config.googleMaps.apiKey` vinculada a uma conta de faturamento no Google Cloud e compilada em uma *Development Build*, o motor OpenGL do Google Maps exibe apenas o logotipo `"Google"` no canto inferior sobre um canvas preto, sem carregar os tiles nem desenhar os marcadores.
- **Como foi resolvido (Opção 1B)**: Implementamos o componente [`InteractiveMapView.tsx`](file:///C:/Users/Jonathan%20Silva/FIAP/GS/Mobile/src/components/InteractiveMapView.tsx) utilizando `react-native-webview` + Leaflet 1.9 + tiles vetoriais/raster abertos (Carto Voyager / OpenStreetMap) + sobreposição de camadas da OpenWeather (`UrlTile` equivalente).
- **Vantagens**:
  1. Funciona **100% no Expo Go** (Android e iOS) sem risco de tela preta e sem exigir cartão de crédito no Google Cloud;
  2. Exibe marcadores coloridos por categoria (`bebedouro`, `sombra`, `descanso`, `parceiro`), posição do usuário e camadas climáticas (`temp_new`, `precipitation_new`, `clouds_new`, `wind_new`);
  3. Serve também como mini-mapa interativo no formulário de pontos (`PointFormScreen.tsx`), permitindo tocar ou arrastar o pino para ajustar a coordenada exata.

---

## 4. Endereço por CEP e Geocodificação em Cascata (M8)

- **Como foi feito**: No cadastro/edição de ponto de apoio (`PointFormScreen.tsx`), o usuário pode escolher entre **"Informar endereço (CEP)"** e **"Usar meu GPS"**.
- **Cascata de Geocodificação (`geocodingService.ts`)**:
  1. Tenta primeiro `Location.geocodeAsync` (`expo-location`) quando a permissão de GPS está ativa (alta precisão para rua + número);
  2. Caso a permissão de GPS tenha sido negada ou não retorne resultado, consulta o geocodificador aberto **Nominatim (OpenStreetMap)** via HTTP com cabeçalho `User-Agent` identificado;
  3. Como terceiro nível de segurança, consulta a **BrasilAPI CEP v2** (`/api/cep/v2/{cep}`), que fornece coordenadas geográficas do CEP, posicionando o pino no mini-mapa para confirmação ou ajuste manual.

---

## 5. Educação em Saúde Térmica e Fontes Oficiais (M2 e M3)

- **Índice de Calor (`heatIndexService.ts` + `HeatIndexInfoModal.tsx`)**: Calcula o índice pela equação de Rothfusz (NWS / NOAA) e apresenta ao usuário, a 1 toque do `AlertCard`, a diferença entre Temperatura, Sensação Térmica e Índice de Calor, além das 5 faixas de risco (`Normal`, `Atenção`, `Cuidado`, `Perigo` e `Perigo Extremo`) com o ajuste de `-2 °C` para quem trabalha na rua.
- **Dicas de Proteção (`HeatProtectionModal.tsx`)**: Exibidas nos níveis `cuidado`, `perigo` e `perigo_extremo`, com orientações práticas para entregadores, sinais de exaustão térmica vs. insolação, botão de chamada rápida para o **SAMU (192)**, atalho direto para o **ponto de apoio mais próximo** e citação das recomendações oficiais do **Ministério da Saúde do Brasil** e da **OMS / NIOSH**.

---

## 6. Sistema Visual inspirado em shadcn/ui e Zero Emojis (M1)

- Todos os emojis foram removidos do código e substituídos por ícones vetoriais padronizados (`@expo/vector-icons/Feather`) encapsulados em `src/components/AppIcon.tsx`.
- A estilização permanece 100% em `StyleSheet.create`, com tokens centralizados em `src/theme/colors.ts` e `src/theme/spacing.ts` (superfícies neutras `slate`, bordas de `1px`, contraste `>= 4.5:1` e áreas mínimas de toque `>= 44pt`).
