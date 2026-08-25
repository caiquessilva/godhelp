# GODHELP — app de locais próximos por geolocalização

App de celular simples e rápido: abre, pega sua localização e mostra **parques, academias e restaurantes** perto de você. Feito para quem tem pouco tempo — pouca informação na tela, poucos toques.

## Telas

1. **Início (mapa/lista)**
   - Botão grande "Usar minha localização".
   - Três abas de categoria: Parques · Academias · Restaurantes.
   - Lista de resultados ordenada por distância, cada item com: nome, distância (ex: 450 m), nota, aberto/fechado, botão de favorito e botão "Rota" (abre o mapa do celular).
   - Toque no item abre o detalhe.
2. **Detalhe do local**: nome, endereço, nota, distância, botões Rota e Favoritar.
3. **Favoritos**: lista salva na conta do usuário.
4. **Entrar / Criar conta**: e-mail e senha. O app funciona sem login; login só é exigido para favoritar.
5. **Ajustes**: tema Claro / Escuro / Sistema e sair da conta.

Sem mais nada — nenhuma rede social, feed, gamificação ou treino.

## Layout

- Estilo "básico" e limpo: fundo neutro, tipografia grande e legível, alvos de toque grandes, navegação inferior com 3 ícones (Perto de mim, Favoritos, Ajustes).
- Marca GODHELP discreta no topo, com um tom de destaque único.
- Modo claro e escuro completos, alternáveis nos Ajustes, com preferência salva.

## Instalação no celular e lojas

- Entrego como **PWA instalável**: o usuário adiciona à tela inicial no iPhone/Android e abre em tela cheia, com ícone e splash.
- Depois te passo o roteiro para empacotar com Capacitor e enviar à App Store e ao Google Play (contas de desenvolvedor, ícones e builds ficam do seu lado, fora do Lovable).

## Detalhes técnicos

- Geolocalização do navegador (`navigator.geolocation`) pedida por ação do usuário, com fallback de busca por endereço.
- Locais via **Google Maps Platform (Places API New)**: `places:searchNearby` para os três tipos (`park`, `gym`, `restaurant`) e `places/{id}` para o detalhe. Todas as chamadas passam por server functions do TanStack Start pelo gateway do conector — nunca do navegador. Requer conectar o Google Maps; aviso: uso do Maps é cobrado por requisição, então limito raio, número de resultados e faço cache/deduplicação por coordenada arredondada.
- **Lovable Cloud** para autenticação (e-mail/senha) e dados: tabela `profiles` e tabela `favorites` (usuário, place_id, nome, endereço, categoria, coordenadas) com RLS por `auth.uid()` e GRANTs.
- Tema em CSS variables/tokens com `dark` no `<html>`, preferência persistida.
- Manifest + ícones para instalação (sem service worker/offline, pois não foi pedido).

## Etapas

1. Conectar Google Maps e ativar o Lovable Cloud.
2. Design system (claro/escuro) e navegação inferior.
3. Tela Perto de mim com geolocalização e busca por categoria.
4. Detalhe do local e rota.
5. Login e favoritos.
6. Ajustes com tema.
7. Manifest/ícones + roteiro para App Store e Google Play.
