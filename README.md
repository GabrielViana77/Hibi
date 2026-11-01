# Hibi · 日々

**Hibi** (日々, “dia após dia”) é um organizador de rotina para celular e computador. Você monta a sua semana em blocos de tempo, o app mostra o que fazer **agora** e ajuda você a **começar** quando a vontade não vem.

É um site simples (HTML, CSS e JavaScript puros) que guarda tudo no próprio navegador. Sem conta, sem servidor, sem rastreamento. A versão instalável como app (PWA) fica para quando o projeto estiver finalizado. Qualquer pessoa pode cadastrar a própria rotina.

## O que ele faz

- **Apresentação:** a primeira tela explica o que é o Hibi e o que ele faz. Dá para voltar a ela pela logo.
- **Monte sua semana:** crie, edite e exclua blocos. Cada bloco tem nome, tipo, dia(s), início, fim, lembrete e nota. Atalhos (Aula, Trabalho, Estudo, Academia…) e a opção de repetir um bloco em vários dias de uma vez deixam o começo rápido.
  - **Compromisso:** aula, trabalho, evento (algo com hora marcada).
  - **Tarefa:** o que você quer fazer e marcar como feito (estudo, treino). Pode ser marcada como opcional.
  - **Rotina:** acordar, desacelerar, dormir.
- **Hoje:** o bloco atual (ou o próximo), quanto falta, o progresso do dia e a lista dos blocos.
- **Só 5 minutos:** o botão contra a inércia. Cinco minutos de cronômetro; ao final, você decide se continua, marca como feito ou para por aqui.
- **Semana:** grade completa no computador (clique num horário vazio para criar um bloco) e lista por dia no celular.
- **Lembretes:** exporta a semana para o app Calendário (`.ics`), com alarmes semanais.
- **Backup:** exporta e importa a rotina em JSON, para levar do computador ao celular.
- **Responsivo:** barra lateral no computador, abas na base no celular.

## Rodando localmente

Não há dependências nem etapa de build: são arquivos estáticos. Abrir o `index.html` com dois cliques **não funciona** (o navegador bloqueia módulos JavaScript em `file://`); use um servidor local:

```bash
npm start          # servidor em http://localhost:8080 (usa python3)
npm test           # testes da lógica (Node 20+)
npm run icons      # regenera os ícones PNG (requer Python 3 e Pillow)
```

Sem Node/Python, use a extensão **Live Server** do VS Code (clique direito no `index.html` → *Open with Live Server*).

Para simular um horário (útil para testar), abra com `?now=`:

```
http://localhost:8080/?now=2026-11-02T11:50
```

## Sua rotina pessoal, fora do repositório

Se existir o arquivo `js/personal.js`, a semana dele é carregada na **primeira abertura** do app, no lugar do estado vazio. O arquivo está no `.gitignore`: ele fica só na sua máquina e não vai para o GitHub.

```js
// js/personal.js
export const WEEK = [
  { id: 'seg-estudo', day: 1, start: '11:45', end: '12:45', title: 'Estudo', type: 'tarefa', remind: 10 },
  // ...
];
```

Campos de um bloco: `day` (0 = domingo … 6 = sábado), `start`/`end` (`HH:MM`), `title`, `type` (`fixo`, `tarefa` ou `rotina`), e opcionais `note`, `optional` (só tarefas) e `remind` (0, 5, 10, 15, 30 ou 60 minutos de antecedência). Veja `js/examples.js` como modelo.

Quem usa a versão publicada começa do zero ou carrega o exemplo, e edita tudo dentro do app. Para levar a sua rotina ao celular: **Ajustes → Exportar rotina** no computador e **Importar rotina** no celular.

## Publicando no GitHub Pages

1. Crie um repositório e envie os arquivos (o `js/personal.js` não sobe por causa do `.gitignore`).
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O app fica em `https://<usuario>.github.io/<repositorio>/`. Os caminhos são relativos, então funciona em subpasta.

## Usando no celular

Basta abrir o endereço do site no navegador do celular. Para levar a rotina de um aparelho a outro: **Ajustes → Exportar rotina** e **Importar rotina**.

## Estrutura

```
index.html            página única
manifest.webmanifest  (reservado para a versão app, ainda não usado)
sw.js                 limpa o service worker das versões antigas
css/styles.css        identidade visual (tema escuro, acento âmbar)
js/app.js             controlador: estado, rotas e ações
js/model.js           regras de um bloco e validação (digitado ou importado)
js/schedule.js        lógica pura da agenda (sem DOM)
js/store.js           persistência local, backup JSON
js/ics.js             exportação para o Calendário
js/editor.js          janela de criar/editar blocos
js/ui.js, brand.js    peças de interface e a marca
js/views/             telas: hero, hoje, semana, ajustes
js/examples.js        semana de exemplo
js/personal.js        sua rotina (ignorado pelo git, opcional)
icons/                ícones gerados por scripts/make-icons.py
tests/                testes (node --test)
```

## Limitações conhecidas

- Os alarmes dependem do Calendário (veja acima); o app em si não notifica.
- As fontes (Geist) vêm do Google Fonts. Offline, o app usa as fontes do sistema. Para hospedá-las junto do projeto, baixe os arquivos e troque o `<link>` por `@font-face`.
- Os dados ficam no `localStorage` do navegador: limpar os dados do site apaga a rotina. Exporte um backup de vez em quando.
- Os blocos se repetem toda semana; ainda não há exceções por data.

## Ideias para depois

- Histórico e sequência de dias (streaks).
- Reorganizar o dia com um toque quando algo sai do planejado.
- Importar o horário de aulas.
- Exceções por data (feriados, provas).

## Licença

[MIT](LICENSE)
