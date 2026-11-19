# Como apresentar o TicketNow

[Abrir o projeto com API](https://ticketnow-lilac.vercel.app/) · [Versão estática](https://kaua-chavesvk.github.io/ticketnow-portifolio/) · [Voltar ao README](../README.md)

## Roteiro de três minutos

### 1. Contexto — 30 segundos

“O TicketNow é um projeto de portfólio para explorar eventos e experimentar um carrinho de ingressos. A demonstração pública usa dados fictícios identificados. Ela não realiza pagamentos nem emite ingressos.”

Mostre a página inicial e o aviso de demonstração. Explique que o servidor já está publicado na Vercel e que o catálogo real depende de cadastrar uma nova chave privada da Ticketmaster.

### 2. Uso — um minuto

1. Busque `musica` sem acento para encontrar o festival de música.
2. Selecione Esportes com a busca ainda preenchida para mostrar um resultado vazio coerente com os dois filtros.
3. Use **Limpar filtros** para voltar ao catálogo.
4. Adicione um ingresso de exemplo pelo destaque e outro pelo cartão do mesmo evento. Abra o carrinho e mostre a quantidade consolidada.
5. Ajuste a quantidade e mostre o total. O limite é dez ingressos por evento.
6. Clique em **Simular pedido** e mostre a confirmação explícita de que não houve cobrança, reserva ou emissão.

### 3. Decisões técnicas — um minuto

- **Interface:** HTML semântico, CSS responsivo e JavaScript em módulos, sem framework ou etapa de build.
- **Segurança:** conteúdo externo vira texto e elementos DOM, sem interpolação de HTML; imagens e links passam por validação de protocolo e domínio.
- **API:** o navegador consulta o próprio servidor, que guarda a chave e aplica validação, timeout, limite de resposta, cache e limitação de requisições.
- **Regras:** preços são tratados em centavos. Preço desconhecido não é inventado, e eventos reais levam ao fornecedor.
- **Qualidade:** `npm run check`, `npm test` e workflow no GitHub Actions. Os testes de regras e API usam respostas controladas, sem credenciais reais.

### 4. Próxima evolução — 30 segundos

“O servidor já está publicado. A próxima etapa é cadastrar uma nova chave privada para o catálogo real. Depois, pretendo implementar usuários e favoritos persistidos, com autorização testada. Pagamentos reais exigiriam outra integração e não fazem parte da demonstração atual.”

Essa é uma proposta de evolução, não uma funcionalidade já entregue.

## Perguntas que vale saber responder

| Pergunta | Resposta apoiada no código |
| --- | --- |
| Por que a chave não fica no JavaScript? | Arquivos e requisições do navegador são visíveis ao visitante. O servidor mantém a chave fora dos assets públicos. |
| Como evita injeção de HTML nos eventos? | `createElement`, `textContent` e `addEventListener`, sem handlers inline. |
| Por que calcular em centavos? | Para manter as somas do carrinho em valores inteiros, evitando arredondamentos durante a operação. |
| O que acontece se a API falhar? | A interface avisa sobre a indisponibilidade e mostra exemplos identificados; um resultado real vazio continua vazio. |
| O carrinho salva pedidos? | Não. O estado existe apenas na memória da página e a conclusão é uma simulação. |
| O servidor está pronto para qualquer escala? | Não. Cache e limites são locais por processo. Múltiplas instâncias exigem controles compartilhados e gestão da cota do fornecedor. |
| Por que o GitHub Pages usa exemplos? | Ele hospeda os arquivos estáticos e não executa o servidor Node.js deste projeto. |

## Evidências da revisão inicial

Em 18/11/2026 foram aprovados dez testes automatizados, verificações no Chromium de busca/carrinho/simulação, fallback estático em subdiretório e layout sem rolagem horizontal em 320, 375 e 768 px. A análise automatizada com axe não encontrou violações nas regras WCAG 2.0/2.1 A e AA testadas em desktop e celular. Esse resultado não equivale a uma auditoria completa de acessibilidade nem valida a operação de um sistema comercial.

As capturas no README documentam essa versão demonstrativa. Consulte o [GitHub Actions](https://github.com/kaua-chavesvk/ticketnow-portifolio/actions) para as execuções de CI de cada alteração.
