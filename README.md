# Genius Quest · Categorias reais

A branch `feat/categories-integration` parte do merge da autenticação em `main` (`085faff`). A página **Categorias** consulta as categorias aprovadas e envia sugestões para revisão usando a API real, com JWT da sessão. Marca, fontes e componentes do Design System foram preservados.

## Executar

Use Node.js 24.15+ na linha 24 ou outra versão compatível com `engines.node`. Inicie o backend da branch `develop`, revisado em `c3f2bfd`, com PostgreSQL e JWT configurados.

```bash
npm ci
VITE_API_URL=http://localhost:8081/api npm run dev
```

Abra `http://localhost:5173/?view=categories`. Entre na sua conta, consulte as categorias aprovadas e envie uma sugestão. Ela retorna como pendente; aparece na lista de aprovadas após revisão pelo backend. Uma lista vazia é válida quando ainda não há categorias aprovadas.

A porta `8081` permite manter o VoltaPet na `8080`. Confira se `/api/health` identifica **Genius Quest Backend**. Para não repetir a variável no terminal, defina `VITE_API_URL=http://localhost:8081/api` no seu `.env.local` existente; esse arquivo é ignorado pelo Git. Reinicie o Vite após alterar a configuração.

Sem `VITE_API_URL`, o proxy de desenvolvimento encaminha `/api` para `http://localhost:8080`. O acesso direto à porta 8081 exige permitir `http://localhost:5173` no CORS do backend. Segredos JWT e credenciais do banco pertencem ao backend.

Abertura, temas das salas, participantes e partidas continuam demonstrativos. Categorias reais têm uma página própria; esta etapa não conecta categorias a partidas que ainda não existem na API. Recarregar o navegador encerra a sessão em memória.

## Verificar

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Com o Genius Quest ativo na porta 8081:

```bash
GQ_AUTH_API_URL=http://localhost:8081/api npm run test:auth-api
GQ_API_URL=http://localhost:8081/api npm run test:categories-api
```

O teste de categorias confirma a identidade da API antes de gravar dados, cria uma conta e uma categoria pendente por execução, valida duplicidade e permissões, e confirma que a sugestão pendente fica fora da lista de aprovadas. A conta e a categoria permanecem no banco; senha e token não são exibidos. Scripts Node não carregam `.env.local` automaticamente.

## Documentação

- [Categorias, contratos e revisão](docs/CATEGORIES.md)
- [Autenticação e configuração da API](docs/AUTH.md)
- [Demonstração de Abertura e Lobby](docs/DEMO.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Marca original](docs/BRAND.md)
- [Branches e commits](docs/ETAPAS.md)

A entrega contém quatro commits locais, sem push ou merge automático. Preserve os commits individuais ao publicar a branch e incorporá-la no GitHub. Os arquivos `.env` com credenciais permanecem fora do histórico.
