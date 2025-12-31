# Importar hierarquia via Excel

## Template
- Ficheiro: `hierarquia-template.xlsx` (gerado no botão "Descarregar template Excel" dentro do nível)
- Colunas obrigatórias/opcionais:
  - `Path` (obrigatório): caminho hierárquico relativo ao nível atual, separado por `/`. Ex.: `Fase 1/Fundação/Betonagem`.
  - `Description (optional)`: texto descritivo; se vazio, usa o mesmo valor do último segmento do Path.
  - `Start Date (YYYY-MM-DD)`: data de início (opcional). Formato `YYYY-MM-DD`.
  - `End Date (YYYY-MM-DD)`: data de fim (opcional). Formato `YYYY-MM-DD`.

## Como preencher
1) Para cada nível ou subnível, crie uma linha.
2) Use `/` para indicar hierarquia: o primeiro segmento será filho direto do nível que está aberto; segmentos seguintes viram subníveis.
   - Exemplo:
     - `Fase 1`
     - `Fase 1/Fundação`
     - `Fase 1/Fundação/Betonagem`
3) Datas são opcionais; deixe em branco se não souber.
4) Descrição é opcional; se vazia, usa o nome do nível.

## Como importar
1) No ecrã do nível, clique em **"Descarregar template Excel"** para obter o ficheiro.
2) Preencha as linhas seguindo as regras acima.
3) Clique em **"Importar hierarquia via Excel"** e selecione o ficheiro preenchido.
4) A app cria os níveis na ordem correta (pais antes de filhos). Em caso de erro, verifica se o `Path` do pai existe no ficheiro.

## Notas
- O `Path` deve ser único por linha. Se duas linhas tiverem o mesmo `Path`, apenas a primeira é processada.
- A importação cria sempre novos níveis; atualmente não atualiza níveis existentes.
- Datas devem estar em `YYYY-MM-DD`. Outros formatos podem falhar.
