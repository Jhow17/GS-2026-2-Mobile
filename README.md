# CitizenTech — Apoio Térmico Urbano para Trabalhadores Conectados

Aplicativo mobile em **React Native (Expo SDK 55)** e **TypeScript estrito** voltado à mitigação de ondas de calor para entregadores, trabalhadores ao ar livre e cidadãos em São Paulo.

---

## Funcionalidades Principais

1. **Aba Início (`StartScreen`)**:
   - Cartão de alerta do **Índice de Calor** no topo com alternância rápida para o perfil **"Trabalho na rua"** (limiares antecipados em 2 °C).
   - Botão **"O que é o índice?"** (M2): explica de forma simples a diferença entre temperatura, sensação térmica e índice de calor, além da tabela das 5 faixas de risco.
   - Botão **"Dicas para se proteger"** (M3): exibido a partir da faixa *Cuidado*, traz orientações práticas baseadas no Ministério da Saúde e OMS/NIOSH, chamada de emergência **SAMU 192** e atalho direto para o **ponto de apoio mais próximo**.
   - Lista de **pontos de apoio aprovados e ativos** ordenados por distância (Haversine), com busca por nome/endereço e filtros por categoria (`Bebedouro`, `Sombra`, `Descanso`, `Ponto parceiro`).
2. **Aba Mapa (`MapScreen`)**:
   - Mapa interativo (`InteractiveMapView`) compatível com **Expo Go** no Android e iOS sem tela preta.
   - Marcadores coloridos por categoria, botão **"Minha posição"**, sobreposição de camadas meteorológicas da OpenWeather (`Calor`, `Chuva`, `Nuvens`, `Vento`) e gaveta inferior sincronizada.
3. **Aba Clima (`HomeScreen`)**:
   - Resumo meteorológico atual, previsão das próximas 24 horas (faixas de 3h), qualidade do ar (`PM2.5`) e ranking dos 10 pontos monitorados mais quentes de São Paulo.
4. **Contas, Login e Cadastro com ViaCEP (`LoginScreen`, `RegisterScreen`, `AccountScreen`)**:
   - Cadastro de usuários com validação de CEP em tempo real via **ViaCEP** e minimização de dados (LGPD).
   - Redirecionamento inteligente pós-login: se um visitante tentar sugerir um ponto ou reportar defeito, é levado ao login e retorna automaticamente para concluir a ação.
5. **Aba Colaborar (`CollaborateScreen`) e Endereço por CEP (`PointFormScreen`)**:
   - Cadastro de ponto de apoio usando **Endereço por CEP (ViaCEP + Geocodificação em cascata + Mini-mapa de confirmação)** ou **GPS atual**, com captura de foto via `expo-camera`.
   - Relato de defeitos em bebedouros com foto opcional.
6. **Painel de Administração (`AdminScreen`)**:
   - Exclusivo para a conta de administrador: aprovação/rejeição de pedidos pendentes (com motivo), edição completa de pontos existentes, ativação/desativação, exclusão com confirmação e resolução/exclusão de relatos de defeito.

---

## Credenciais de Demonstração (Administrador)

Na tela **Entrar**, você pode tocar no botão **"Preencher acesso de administrador"** ou informar:
- **E-mail**: `admin@citizentech.org`
- **Senha**: `Admin@2026`

*(Configuráveis no arquivo `.env` via `EXPO_PUBLIC_ADMIN_EMAIL` e `EXPO_PUBLIC_ADMIN_PASSWORD`).*

---

## Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. (Opcional) Copie `.env.example` para `.env` e informe sua chave gratuita da OpenWeather (`EXPO_PUBLIC_OPENWEATHER_API_KEY`). Sem chave, o aplicativo funciona integralmente em modo de demonstração determinístico (`mockWeatherService.ts`).
3. Inicie no Expo Go:
   ```bash
   npx expo start
   ```
4. Para validar a tipagem TypeScript estrita:
   ```bash
   npm run typecheck
   ```
