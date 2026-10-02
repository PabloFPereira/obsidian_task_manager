# Kanban Task Manager

Plugin para Obsidian que transforma arquivos Markdown Kanban em uma interface visual para gerenciar tarefas, projetos, notas relacionadas, datas, pontos e progresso.

O principio do plugin e simples:

```text
Markdown do Vault = fonte de verdade
Plugin = camada visual para gerenciar as tasks
```

Se o plugin for desativado, as tarefas continuam salvas como Markdown comum.

## Funcionalidades

- View nativa no Obsidian.
- Abertura por Ribbon e Command Palette.
- Leitura de Kanbans Markdown em `Tasks/`.
- Colunas: `Backlog`, `To Do`, `Doing`, `Done`.
- Criacao rapida de tasks no topo do `Backlog`.
- Drag-and-drop entre colunas.
- Drag-and-drop para reordenar tasks dentro da coluna.
- Coluna `Done` compactavel.
- Filtro por Kanban.
- Filtro por Projeto.
- Busca por titulo da task.
- Ordenacao por prazo, data de inicio ou data de termino.
- Projeto separado de nota relacionada.
- Clique no projeto ou nota relacionada para abrir a nota.
- Dashboard analitico com periodo, tasks trabalhadas, pontos, projetos e notas.
- Automacao de `startedAt` ao mover para `Doing`.
- Automacao de `completedAt` ao mover para `Done`.
- Remocao de `completedAt` quando a task sai de `Done`.
- Persistencia em Markdown, sem banco paralelo.

## Estrutura plug and play do Vault

Estrutura recomendada para quem vai usar o plugin:

```text
Meu Vault/
├── .obsidian/
│   └── plugins/
│       └── kanban-task-manager/
│           ├── manifest.json
│           ├── main.js
│           └── styles.css
├── Tasks/
│   ├── Tasks - Trabalho.md
│   ├── Tasks - Pessoal.md
│   └── Tasks - Outro Kanban.md
├── Projects/
│   ├── Projeto A.md
│   └── Area/
│       └── Projeto B.md
└── Notes/
    ├── Como fiz tal logica.md
    └── Investigacao tecnica.md
```

### Pastas do Vault

`Tasks/`

Pasta principal dos quadros Kanban. Por padrao, o plugin procura arquivos `.md` aqui. Cada arquivo Markdown dentro dessa pasta vira um Kanban.

`Projects/`

Pasta usada para identificar projetos. Uma nota so conta como projeto quando esta dentro de `Projects/`.

`Notes/`

Pasta opcional para notas comuns. Notas fora de `Projects/` podem ser vinculadas como `Nota relacionada`.

## Formato esperado dos Kanbans

Um arquivo em `Tasks/` pode ter este formato:

````markdown
---
kanban-plugin: board
---

## Backlog

- [ ] Escrever documentacao [[Projeto A]] [[Como fiz tal logica]] @{2026-10-10}

## To Do

- [ ] Revisar fluxo de instalacao

## Doing

- [ ] Implementar filtro por projeto

## Done

- [x] Criar primeira versao do plugin

%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%
````

Status suportados:

```text
Backlog
To Do
Doing
Done
```

## Projetos e notas relacionadas

O plugin separa duas coisas:

```text
Projeto = nota dentro de Projects/
Nota relacionada = qualquer nota comum fora de Projects/
```

Exemplos:

```text
Projects/LakeOps.md              -> Projeto
Projects/Vivara/Insider.md       -> Projeto
Notes/Como fiz a logica.md       -> Nota relacionada
Daily/2026-10-02.md              -> Nota relacionada
```

Ao editar uma task:

- use `Projeto` para vincular a uma nota dentro de `Projects/`;
- use `Nota relacionada` para explicacoes, investigacoes, decisoes tecnicas ou codigos.

## Metadados no Markdown

Quando uma task e criada, editada, movida ou reordenada pelo plugin, ele adiciona metadados em comentario Markdown:

```markdown
- [ ] Criar monitoramento @{2026-10-10} %% task-manager: {"id":"task_...","status":"to_do","projectName":"LakeOps","projectPath":"Projects/LakeOps.md","relatedNoteName":"Como fiz","relatedNotePath":"Notes/Como fiz.md","priority":"alta","size":5,"createdAt":"2026-10-02T10:00:00.000Z","updatedAt":"2026-10-02T10:00:00.000Z"} %%
```

Esses metadados guardam id, status, projeto, nota relacionada, prioridade, tamanho, prazo, data de inicio, data de termino, criacao e atualizacao.

## Instalacao manual

1. Baixe estes arquivos da release do GitHub:

```text
manifest.json
main.js
styles.css
```

2. Dentro do Vault, crie a pasta:

```text
.obsidian/plugins/kanban-task-manager/
```

3. Copie os tres arquivos para essa pasta:

```text
.obsidian/plugins/kanban-task-manager/manifest.json
.obsidian/plugins/kanban-task-manager/main.js
.obsidian/plugins/kanban-task-manager/styles.css
```

4. Abra o Obsidian.
5. Va em `Settings > Community plugins`.
6. Desative `Restricted mode`, se necessario.
7. Ative `Kanban Task Manager`.
8. Abra pelo icone na Ribbon ou pela Command Palette: `Abrir Task Manager`.

## Configuracao no Obsidian

Va em:

```text
Settings > Kanban Task Manager
```

Configuracao recomendada:

```text
Pasta dos Kanbans: Tasks
Arquivos incluidos: vazio
Arquivos excluidos: vazio
Formato de data: DD/MM/YYYY
Preencher data de inicio ao mover para Doing: ligado
Preencher data de termino ao mover para Done: ligado
```

Campos recomendados nos cards:

```text
Kanban: ligado
Projeto: ligado
Nota relacionada: ligado
Prioridade: ligado
Tamanho: ligado
Prazo: ligado
```

## Uso basico

### Criar task

No Kanban, digite no campo `+ Nova task` e pressione Enter.

Regras:

- a task nova entra no topo do `Backlog`;
- se o filtro de projeto estiver ativo, a task ja nasce vinculada ao projeto filtrado;
- ao digitar `[` o plugin completa para link estilo Obsidian.

### Mover e ordenar

Voce pode:

- arrastar uma task entre colunas;
- arrastar uma task para cima ou para baixo de outra task;
- soltar no fundo da coluna para mandar para o fim.

A ordem visual e salva no Markdown.

### Filtros

Filtros globais:

- `Kanban`
- `Projeto`

Filtros do Kanban:

- busca por titulo da task;
- ordenacao manual;
- ordenacao por prazo;
- ordenacao por data de inicio;
- ordenacao por data de termino;
- ordem ascendente ou descendente.

### Dashboard

O Dashboard mostra:

- total de tasks;
- status;
- atrasadas;
- pontos totais e concluidos;
- quantidade de projetos;
- tarefas trabalhadas por data de inicio ou termino;
- ultimos 7, 30 ou 90 dias;
- pontos entregues;
- media de pontos por semana;
- tasks com pontos e sem pontos;
- tasks com projeto e sem projeto;
- notas relacionadas e tasks sem nota.

## Desenvolvimento

Instale dependencias:

```bash
npm install
```

Rode typecheck:

```bash
npm run lint
```

Rode testes:

```bash
npm test
```

Gere o build final:

```bash
npm run build
```

O build gera/atualiza o arquivo:

```text
main.js
```

## Estrutura deste repositorio

```text
kanban-task-manager/
├── .gitignore
├── LICENSE
├── README.md
├── manifest.json
├── main.js
├── styles.css
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
├── esbuild.config.mjs
├── version-bump.mjs
├── scripts/
├── src/
└── tests/
```

## O que entra no GitHub

Inclua no repositorio:

```text
README.md
LICENSE
manifest.json
main.js
styles.css
package.json
package-lock.json
tsconfig.json
tsconfig.build.json
esbuild.config.mjs
version-bump.mjs
scripts/
src/
tests/
```

Nao publique:

```text
node_modules/
dist/
data.json
```

Tambem nao publique dados do seu Vault:

```text
Tasks/
Projects/
Notes/
```

Essas pastas sao dados do usuario, nao codigo do plugin.

## Publicacao no GitHub

1. Crie um repositorio publico, por exemplo `kanban-task-manager`.
2. Copie todo o conteudo desta pasta para a raiz do repositorio.
3. Ajuste `author` e `authorUrl` no `manifest.json`.
4. Rode:

```bash
npm install
npm run lint
npm test
npm run build
```

5. Faca commit e push.
6. Crie uma GitHub Release.
7. A tag da release deve ser exatamente igual ao `version` do `manifest.json`.

Para a versao atual:

```text
0.1.0
```

8. Anexe na release:

```text
main.js
manifest.json
styles.css
```

## Checklist antes da release

Confirme:

```text
README.md existe na raiz
LICENSE existe na raiz
manifest.json existe na raiz
main.js existe na raiz
styles.css existe na raiz
npm run lint passa
npm test passa
npm run build passa
tag da release == version do manifest.json
```

## Teste manual da release

1. Crie um Vault de teste.
2. Crie:

```text
Tasks/
Projects/
Notes/
```

3. Crie `Tasks/Tasks - Teste.md` com:

```markdown
## Backlog

- [ ] Primeira task [[Projeto Teste]] [[Nota Tecnica]] @{2026-10-10}

## To Do

## Doing

## Done
```

4. Crie:

```text
Projects/Projeto Teste.md
Notes/Nota Tecnica.md
```

5. Instale manualmente `main.js`, `manifest.json` e `styles.css` da release.
6. Ative o plugin.
7. Valide:

- plugin abre;
- task aparece;
- projeto e nota relacionada aparecem;
- clique na nota abre a nota;
- drag and drop funciona;
- task criada entra no topo;
- filtro de projeto funciona;
- dashboard calcula dados;
- remover nota/projeto da task funciona.

## Publicacao na comunidade do Obsidian

Depois que o repositorio e a release estiverem prontos:

1. Garanta que o repositorio e publico.
2. Garanta que `README.md`, `LICENSE` e `manifest.json` estao na raiz.
3. Garanta que a release tem:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. Garanta que a tag da release e igual ao `version` do `manifest.json`.
5. Submeta o plugin pelo diretorio da comunidade do Obsidian.

Segundo a documentacao oficial do Obsidian, quando um usuario instala um plugin, o Obsidian baixa `main.js`, `manifest.json` e `styles.css` da GitHub Release cuja tag corresponde a versao do `manifest.json`.

Fontes:

- https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin
- https://github.com/obsidianmd/obsidian-releases/blob/master/README.md

## Troubleshooting

### Plugin nao aparece

Confira:

```text
.obsidian/plugins/kanban-task-manager/manifest.json
.obsidian/plugins/kanban-task-manager/main.js
.obsidian/plugins/kanban-task-manager/styles.css
```

Depois reinicie o Obsidian.

### Plugin abre vazio

Confira se existe a pasta:

```text
Tasks/
```

E se ela tem arquivos `.md`.

Confira em `Settings > Kanban Task Manager` se a pasta configurada e:

```text
Tasks
```

### Projeto nao aparece

Confira se a nota esta dentro de:

```text
Projects/
```

Notas fora de `Projects/` sao tratadas como notas relacionadas.

### Release instala versao errada

Confira se:

```text
tag da release == version do manifest.json
```

Exemplo:

```text
tag: 0.1.0
manifest version: 0.1.0
```
