# Proposta Comercial: Flexibilidade Operacional e Melhorias de Processo

**Data:** 06 de Fevereiro de 2026
**Assunto:** Implementação de Tecnologia Química por Cliente, Validação de Leituras e Controle de Estoque
**Status:** Para Aprovação

---

## 1. Resumo

Esta proposta visa implementar melhorias estratégicas no sistema WGA Brasil para atender à diversidade operacional dos contratos atuais. O foco é permitir a personalização de tecnologias químicas por cliente sem duplicar equipamentos, garantir a integridade dos dados em relatórios de visitas parciais e flexibilizar o controle de estoque para cenários onde o acesso é restrito.

---

## 2. Diagnóstico do Cenário Atual

Identificamos limitações que geram rigidez no cadastro, poluição visual nos relatórios e bloqueios operacionais indesejados:

*   **Rigidez na Definição Química:** Produtos e testes são vinculados ao Equipamento, impedindo que clientes diferentes usem tratamentos diferentes no mesmo tipo de máquina.
*   **Relatórios Imprecisos (Visitas Parciais):** Ao realizar medições em apenas parte dos sistemas, o relatório final exibe campos vazios para os demais, gerando dúvida se foi um esquecimento ou uma omissão proposital.
*   **Bloqueio por Falta de Estoque:** Em clientes onde o técnico não tem acesso ao estoque, o sistema exige essa gestão, prejudicando o fluxo ou gerando dados irreais.

| Recurso | Situação Atual (Limitada) | Situação Desejada (Proposta) |
| :--- | :--- | :--- |
| **Tecnologia Química** | Vinculada ao Equipamento (Global) | Personalizável por Cliente (Específico) |
| **Relatórios** | Exibe todos os testes (mesmo vazios) | Exibe apenas o que foi medido/confirmado |
| **Estoque** | Gestão Obrigatória/Habilitada | Opção "Sem Acesso" (Inibe controle) |

---

## 3. Solução Proposta

A abordagem recomendada divide-se em três frentes de desenvolvimento integradas ao fluxo atual do técnico.

### Fluxo de Funcionamento:

1.  **Tecnologia Química Personalizada:**
    *   Nova aba na configuração do Cliente para cadastrar testes adicionais e limites específicos.
    *   Na visita, o sistema funde os testes padrão do equipamento com os específicos do cliente.

2.  **Validação Inteligente na Visita:**
    *   Ao finalizar a visita, o sistema detecta campos vazios.
    *   Exibe alerta: *"Os seguintes testes não foram realizados. Deseja seguir?"*.
    *   Se confirmado, o relatório PDF é gerado ocultando os campos não preenchidos.

3.  **Controle de Acesso ao Estoque:**
    *   Nova opção "Sem Acesso ao Estoque" no cadastro do Cliente.
    *   Se marcada, inabilita o botão "Adicionar Produto" na visita e ignora cálculos de consumo.

### Diferenciais da Solução:

*   **Adaptabilidade:** O sistema se ajusta à realidade contratual (produtos específicos, sem acesso ao estoque).
*   **Clareza:** Relatórios limpos, constando apenas o que foi efetivamente trabalhado.
*   **Segurança:** Evita o envio acidental de relatórios incompletos através da confirmação ativa.

---

## 4. Análise de Viabilidade e Riscos

✅ **Benefícios (Prós)**
*   **Flexibilidade:** Atende contratos complexos sem necessidade de "gambiarras" no cadastro de equipamentos.
*   **Profissionalismo:** Relatórios PDF mais objetivos e fáceis de ler.
*   **Usabilidade:** Reduz a fricção para o técnico em campo (especialmente na questão do estoque).

⚠️ **Riscos e Mitigações (Contras)**
*   **Cadastro:** Exige atenção na configuração inicial do cliente para definir as tecnologias químicas extras.

---

## 5. Especificações Técnicas

**Banco de Dados**
*   Criação de tabelas para vincular testes/produtos específicos ao `client_id` (override ou adição aos do equipamento).
*   Flag `stock_access_disabled` na tabela de clientes.

**Interface e Relatórios**
*   **Config:** Nova aba "Tecnologia Química" no gerenciamento de clientes.
*   **Visita:** Lógica de merge (Padrão + Cliente) na renderização dos cards de leitura.
*   **Modal:** Janela de confirmação inteligente ao clicar em "Finalizar Visita".
*   **PDF:** Lógica condicional para não renderizar seções/linhas sem valor.

---

## 6. Estimativa de Esforço e Orçamento

Estimamos um total de **6 horas** de desenvolvimento, distribuídas conforme abaixo:

| Atividade | Horas Estimadas |
| :--- | :--- |
| **1. Tecnologia Química por Cliente** (DB + Backend + Frontend de Config + Frontend de Visita) | 3 horas |
| **2. Validação de Leituras** (Lógica de Detecção + Confirmação + Ajuste PDF) | 2 horas |
| **3. Trava de Estoque** (Alteração DB + Frontend Cliente + Lógica Visita) | 1 hora |
| **Total Estimado** | **6 horas** |

**Valor do desenvolvimento:** 6 horas x R$ 180,00 = **R$ 1.080,00 (Um mil e oitenta reais)**

**Condições de pagamento:** 5 dias após a entrega

---

## 7. Próximos Passos e Validação

Para seguir com o desenvolvimento, solicito a aprovação desta proposta.

**[Seu Nome]**
*WGA Brasil*
