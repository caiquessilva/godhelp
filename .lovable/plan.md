# Concluir a navegação principal do GODHELP

## Objetivo
Finalizar a tela Explorar e manter a navegação com apenas duas abas, sem perder o acesso a Favoritos, Doar e Ajustes.

## Alterações
- Inserir o cartão de localização no topo de Explorar, ligado ao GPS atual e ao botão de atualização.
- Manter a busca manual de rua/bairro e adicionar um filtro compacto por nome ou categoria dos locais já carregados.
- Exibir o convite de instalação do app na tela Explorar quando o navegador permitir.
- Adicionar no cabeçalho de Explorar um menu discreto com atalhos para Favoritos, Doar e Ajustes.
- Remover de Favoritos o bloco de telefones de emergência, pois essa função já está concentrada na aba Emergência.
- Preservar a barra inferior somente com Explorar e Emergência.

## Verificação
- Conferir Explorar, Favoritos e Emergência em tela de celular.
- Validar abertura e fechamento do menu, filtros, links e ausência de sobreposição.
- Executar a verificação de tipos e os testes relevantes existentes.

## Detalhes técnicos
- Reutilizar `LocationHeader` e `InstallBanner` já criados.
- Filtrar os resultados no navegador, sem novas chamadas pagas.
- Usar rotas existentes para os atalhos e manter os metadados atuais.
