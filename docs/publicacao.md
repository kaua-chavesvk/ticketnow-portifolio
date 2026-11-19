# Publicação e ativação da Ticketmaster

## Endereços

- [Aplicação com back-end na Vercel](https://ticketnow-lilac.vercel.app/).
- [API de eventos](https://ticketnow-lilac.vercel.app/api/events).
- [Projeto na Vercel](https://vercel.com/kaua-chavesvk/ticketnow).
- [Variáveis privadas do projeto](https://vercel.com/kaua-chavesvk/ticketnow/settings/environment-variables).
- [Demonstração estática no GitHub Pages](https://kaua-chavesvk.github.io/ticketnow-portifolio/).

O projeto usa a conta existente `kaua-chavesvk`, no plano Hobby. A Vercel executa `api/events.js` em Node.js e serve `dist/`. O servidor tradicional continua disponível localmente por `npm start`.

## Situação da chave

Sem a variável privada `TICKETMASTER_API_KEY`, a API retorna `mode: "demo"`, exemplos identificados e filtros funcionais. Isso comprova o funcionamento do servidor, não a integração ao vivo com a Ticketmaster.

Não reutilize a chave anteriormente publicada no repositório. Ela só pode ser revogada na conta do fornecedor que a emitiu. Se pertencer a outra conta ou for uma chave de exemplo, crie sua própria credencial. Remover uma chave do código não a elimina do histórico do Git.

## Cadastrar a nova chave sem expô-la

1. Entre na sua conta na [Ticketmaster Developer](https://developer.ticketmaster.com/), crie/consulte seu aplicativo e obtenha uma chave própria da Discovery API. Revogue ou substitua a antiga, se ela for da sua conta.
2. Abra [Environment Variables do TicketNow](https://vercel.com/kaua-chavesvk/ticketnow/settings/environment-variables).
3. Cadastre **`TICKETMASTER_API_KEY`**, com esse nome exato. Cole a chave somente no campo privado de valor da Vercel, selecione **Production** e armazene como **Secret**. Ela não precisa estar disponível ao build ou ao navegador por um prefixo público.
4. Salve e faça um **Redeploy** da publicação de produção, pois alterações no ambiente não são aplicadas aos deployments anteriores. Pelo terminal autenticado, também é possível usar `vercel deploy --prod --yes --scope kaua-chavesvk` na pasta do projeto.
5. Abra a [API](https://ticketnow-lilac.vercel.app/api/events): uma integração bem-sucedida responde HTTP 200 com `mode: "live"`. Se não houver eventos brasileiros para a consulta, a lista pode estar vazia; isso é diferente de uma falha.

Não envie a chave no chat, em commits, capturas, URLs de demonstração ou arquivos públicos. Não é necessário fornecer um client secret/OAuth para esta integração Discovery.

Se aparecer HTTP 502, a chamada ao fornecedor falhou; confira a credencial e a cota no painel da Ticketmaster. A interface informa a indisponibilidade e mostra exemplos. Ela não confirma eventos reais quando o fornecedor falha.

## Atualizar a aplicação

A tentativa inicial de vincular o repositório à Vercel foi recusada pela integração Git. Portanto, o push no GitHub atualiza o código e o Pages, mas **não garante uma publicação automática na Vercel**.

Com a CLI autenticada:

```sh
git pull --ff-only
npm run check
npm test
npm run build
vercel link --yes --scope kaua-chavesvk --project ticketnow
vercel deploy --prod --yes --scope kaua-chavesvk
```

Não é necessário cadastrar um token de deploy no repositório. Para ativar publicações automáticas, o titular pode autorizar o repositório `kaua-chavesvk/ticketnow-portifolio` na integração GitHub da Vercel e conectá-lo nas configurações do projeto. O funcionamento automático precisa ser validado após essa autorização.

## Proteções e limites da hospedagem

- O build usa uma lista explícita de quatro arquivos públicos e rejeita arquivos inesperados na saída. `.env.local`, `.vercel/`, testes e documentação não entram no upload de código pela configuração `.vercelignore`.
- A função compartilha o handler com os testes locais. A lista de arquivos do repositório nunca é usada como diretório público.
- Os cabeçalhos do `vercel.json` protegem os arquivos estáticos; a API também envia seus próprios cabeçalhos.
- Cache e limites locais valem por instância aquecida. Instâncias novas reiniciam esse estado, e o proxy da plataforma pode fazer visitantes compartilharem um endereço de conexão. Esses limites não são distribuídos e não garantem a cota diária da Ticketmaster.
- Não há armazenamento de usuários, pedidos, pagamentos ou dados pessoais. A publicação é um catálogo com simulação demonstrativa, não uma plataforma comercial.

## Referências

- [Discovery API da Ticketmaster](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/).
- [Funções Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js).
- [Variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables).
