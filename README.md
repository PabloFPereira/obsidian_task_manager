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

## Instalacao simples

Clone este repositorio direto na pasta de plugins do seu Vault:

```bash
cd "CAMINHO_DO_SEU_VAULT/.obsidian/plugins"
git clone https://github.com/PabloFPereira/obsidian_task_manager.git kanban-task-manager
```

Depois:

1. Abra ou reinicie o Obsidian.
2. Va em `Settings > Community plugins`.
3. Desative `Restricted mode`, se necessario.
4. Ative `Kanban Task Manager`.
5. Abra pelo icone na Ribbon ou pela Command Palette: `Abrir Task Manager`.

O repositorio ja contem os arquivos que o Obsidian precisa para carregar o plugin:

```text
manifest.json
main.js
styles.css
```

## Atualizar o plugin

Dentro da pasta do plugin no Vault:

```bash
cd "CAMINHO_DO_SEU_VAULT/.obsidian/plugins/kanban-task-manager"
git pull
```

Reinicie o Obsidian ou desative/ative o plugin.

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

O build gera/atualiza:

```text
main.js
```

## Estrutura deste repositorio

```text
obsidian_task_manager/
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

## O que nao versionar

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

## Deploy no GitHub

Fluxo simples:

```bash
git add .
git commit -m "Update plugin"
git push
```

Nao e necessario criar GitHub Release para usar este plugin pelo fluxo de clone direto no Vault.

## Teste manual

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

5. Clone este repositorio em `.obsidian/plugins/kanban-task-manager`.
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
