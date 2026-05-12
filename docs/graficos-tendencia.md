# Gráficos de Tendência — Documentação da Funcionalidade

**Versão:** 1.1  
**Módulo:** Configuração de Clientes / Relatórios  
**Branch:** staging

---

## Visão Geral

Os **Gráficos de Tendência** exibem a evolução histórica dos resultados de análises por equipamento ao longo do tempo. Cada equipamento gera um bloco de sub-gráficos empilhados verticalmente — um por teste visível — com eixo X sincronizado e linhas de referência (mínimo/máximo VMP).

Os gráficos aparecem automaticamente no relatório de visita quando habilitados para o cliente.

---

## Hierarquia de Visibilidade

A visibilidade de cada teste em cada gráfico segue uma hierarquia de 3 níveis. O nível mais específico sempre prevalece:

```
Equipamento (sobrescrita por equipamento)
    ↓ se não configurado
Cliente (sobrescrita por cliente)
    ↓ se não configurado
Global / Catálogo de Testes (padrão global)
```

Isso permite configurações granulares: um teste pode estar ativo globalmente mas desativado para um cliente específico, ou ativado somente para uma caldeira em particular.

---

## Nível 1 — Configuração Global (Catálogo de Testes)

**Acesso:** Menu lateral → Testes → Catálogo de Testes

### O que é

Define quais testes aparecem nos gráficos **por padrão** para todos os clientes que não tiverem sobrescrita configurada.

### Como configurar

Na tabela do catálogo, a coluna **"Gráfico?"** exibe um toggle verde/vermelho para cada teste.

| Toggle | Significado |
|--------|-------------|
| 🟢 Verde (ON) | Teste aparece nos gráficos por padrão |
| 🔴 Vermelho (OFF) | Teste não aparece nos gráficos por padrão |

O toggle salva imediatamente ao ser alterado — não há botão de salvar nesta tela.

### Print sugerido
> 📸 _Inserir print da tabela do Catálogo de Testes com a coluna "Gráfico?" visível, mostrando alguns toggles ON e outros OFF_

---

### Também no formulário de edição do teste

Ao criar ou editar um teste, o campo **"Exibir nos gráficos de relatório (padrão global)"** define o mesmo valor.

### Print sugerido
> 📸 _Inserir print do modal "Editar Teste" com o toggle "Exibir nos gráficos" visível_

---

### Propagação em Cascata — Global → Cliente

Ao alterar o toggle de um teste no Catálogo, o sistema verifica automaticamente se algum cliente possui uma **sobrescrita explícita** para aquele teste.

Se houver clientes afetados, um **dialog de confirmação** é exibido:

- Lista os clientes com suas sobrescritas atuais (ON/OFF)
- Pergunta se deseja **limpar** essas sobrescritas (fazendo-os herdar o novo valor global)
- Opções: **"Sim, limpar sobrescritas"** ou **"Não, manter sobrescritas"**

> ℹ️ O dialog só aparece quando há sobrescritas conflitantes. Se nenhum cliente tiver sobrescrita para aquele teste, a alteração é silenciosa.

### Print sugerido
> 📸 _Inserir print do dialog de cascata Global→Cliente com a lista de clientes afetados expandida_

---

## Nível 2 — Configuração do Cliente

**Acesso:** Menu lateral → Clientes e Locais → [Selecionar Cliente] → seção "Gráficos de Tendência"

### O que é

Permite personalizar quais testes aparecem nos gráficos **para um cliente específico**, sobrescrevendo o padrão global teste a teste.

### Print sugerido
> 📸 _Inserir print da seção "Gráficos de Tendência" com a lista de testes, alguns com badge "global" e outros com toggle próprio_

---

### Toggle "Habilitado / Desabilitado"

No topo da seção, o toggle principal habilita ou desabilita **todos os gráficos** para aquele cliente.

| Estado | Comportamento |
|--------|---------------|
| 🟢 Habilitado | Gráficos aparecem no relatório conforme configuração |
| 🔴 Desabilitado | Nenhum gráfico aparece no relatório, independente de qualquer outra configuração |

> ⚠️ Este é o nível de maior prioridade. Mesmo que um equipamento tenha um teste ativado, se o cliente estiver desabilitado nenhum gráfico será exibido.

### Print sugerido
> 📸 _Inserir print com o toggle principal em "Desabilitado" (vermelho)_

---

### Período do Gráfico

Define quantos dias de histórico de visitas serão exibidos nos gráficos.

| Opção | Período |
|-------|---------|
| Últimos 90 dias | 3 meses |
| Últimos 180 dias | 6 meses |
| Últimos 365 dias | 1 ano (padrão) |
| Últimos 2 anos | 730 dias |

---

### Testes — nível Cliente

Lista todos os testes configurados para os equipamentos deste cliente.

Cada linha mostra:
- **Nome do teste** e unidade
- Badge **"global"** (cinza) quando sem sobrescrita — herda o valor global
- Toggle verde/vermelho com o status efetivo (herdado ou sobrescrito)
- Ícone **↩** para remover a sobrescrita e voltar ao padrão global (só aparece quando há sobrescrita)

O contador no topo mostra: `X ativos · Y sobrescritas explícitas`

### Print sugerido
> 📸 _Inserir print da lista de testes com alguns no estado "global" (herdado) e pelo menos um com sobrescrita explícita e o ícone ↩ visível_

---

### Salvar Configurações

O botão **"Salvar Configurações"** aparece somente quando há alterações pendentes.

Ao salvar:
1. Um **modal de confirmação** ("Sucesso! / Configuração salva!") é exibido
2. O sistema verifica se algum equipamento do cliente possui **sobrescrita** para os testes que foram alterados
3. Se houver equipamentos afetados, um **dialog de cascata** é exibido

### Print sugerido
> 📸 _Inserir print do modal verde "Sucesso! / Configuração salva!"_

---

### Propagação em Cascata — Cliente → Equipamento

Quando uma sobrescrita de nível Cliente é alterada e existe ao menos um equipamento com sobrescrita explícita para o mesmo teste, o dialog de cascata aparece:

- **Testes afetados** listados como badges azuis
- Botão para expandir/ocultar a **lista de equipamentos** afetados (mostra nome e valor atual da sobrescrita)
- Opções: **"Sim, limpar sobrescritas"** ou **"Não, manter sobrescritas"**

Confirmar limpa as sobrescritas dos equipamentos listados para aqueles testes, fazendo-os herdar o novo valor do cliente.

### Print sugerido
> 📸 _Inserir print do dialog de cascata Cliente→Equipamento com a lista de equipamentos expandida_

---

## Nível 3 — Configuração do Equipamento

**Acesso:** Menu lateral → Clientes e Locais → [Selecionar Cliente] → Equipamentos → [Configurar] → aba "Gráficos"

### O que é

Permite configurar quais testes aparecem nos gráficos **para um equipamento específico** dentro de um cliente, sobrescrevendo tanto o padrão global quanto o do cliente.

### Print sugerido
> 📸 _Inserir print da aba "Gráficos" no dialog de configuração do equipamento, mostrando a lista de testes com badge "herdado"_

---

### Lista de Testes

Cada teste do equipamento aparece com:
- **Nome** e unidade
- Badge **"herdado"** (cinza) quando sem sobrescrita — mostra o valor efetivo herdado do cliente ou global
- Toggle refletindo o status real (verde = ativo, vermelho = inativo)
- Ícone **↩** para remover a sobrescrita (volta a herdar)

> ℹ️ O toggle no estado "herdado" mostra a cor real do valor herdado — verde se o nível superior tem aquele teste ativo, vermelho se inativo.

### Print sugerido
> 📸 _Inserir print com testes herdados (badge cinza) e pelo menos um com sobrescrita própria (sem badge, ícone ↩ visível)_

---

### Salvar

O botão **"Salvar"** persiste as sobrescritas do equipamento. Um modal de confirmação é exibido ao concluir.

A linha de rodapé exibe:
> `Hierarquia: Equipamento > Cliente > Global (definição do teste)`

### Print sugerido
> 📸 _Inserir print do rodapé da seção com a linha de hierarquia visível_

---

## Visualização no Relatório

Os gráficos aparecem na seção **"Gráficos de Tendência"** do relatório de visita, entre o cabeçalho e o quadro de dosagens.

### Estrutura visual

Cada equipamento gera um bloco com:
- **Cabeçalho**: nome do equipamento e localização
- **Sub-gráficos empilhados**: um por teste visível
  - Linha de dados com pontos
  - Faixas de referência (min/max VMP) em vermelho tracejado
  - Eixo Y com unidade do teste
  - Eixo X (datas) exibido apenas no último sub-gráfico
  - Tooltips sincronizados entre todos os sub-gráficos do mesmo equipamento

### Print sugerido
> 📸 _Inserir print de um bloco de gráfico no relatório com pelo menos 2 sub-gráficos empilhados_

---

### Período exibido

O período exibido no relatório respeita o **Período do Gráfico** configurado para o cliente (90 / 180 / 365 / 730 dias). Visitas com status `rascunho` são excluídas automaticamente.

---

## Comportamento do Cache

Para garantir que alterações nas configurações reflitam imediatamente nos relatórios:

- Ao salvar configurações de gráfico (qualquer nível), o cache de **todos os relatórios abertos** é invalidado automaticamente
- A próxima abertura de qualquer relatório buscará os dados atualizados

---

## Resumo das Ações por Nível

| Ação | Onde configurar | Efeito |
|------|----------------|--------|
| Ativar/desativar teste globalmente | Catálogo de Testes → coluna Gráfico? | Padrão para todos os clientes sem sobrescrita |
| Habilitar/desabilitar gráficos do cliente | Cliente → Gráficos de Tendência → toggle Habilitado | Liga/desliga todos os gráficos daquele cliente |
| Definir período histórico | Cliente → Gráficos de Tendência → Período | Controla janela de datas no relatório |
| Sobrescrever teste por cliente | Cliente → Gráficos de Tendência → toggle por teste | Sobrescreve o global para aquele cliente |
| Sobrescrever teste por equipamento | Equipamento → aba Gráficos → toggle por teste | Sobrescreve cliente e global para aquele equipamento |
| Limpar sobrescritas em cascata | Dialog automático ao salvar | Remove sobrescritas nos níveis inferiores |

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Sobrescrita** | Configuração explícita que prevalece sobre o nível superior na hierarquia |
| **Herdado** | Sem sobrescrita — usa o valor do nível superior (cliente ou global) |
| **VMP** | Valor Máximo Permitido — faixa mínimo/máximo definida no cadastro do teste |
| **Cascata** | Propagação de uma alteração de nível superior para os níveis inferiores afetados |
