# RedisConsumer — fluxo funcional

Esta documentação define como um consumer de Redis Streams deve receber, validar, processar e confirmar eventos no projeto. Ela reúne as configurações e as regras de funcionamento comuns a qualquer consumer, independentemente do evento ou da regra de negócio executada. O foco é o comportamento observável do consumo, sem determinar a organização do código. São descritos o processo principal, responsável pelas entradas novas, e o processo de retry, responsável por recuperar entradas pendentes.

## Política de logs dos consumers

Os consumers emitem logs somente nos três momentos definidos nesta seção. Falhas operacionais auxiliares — por exemplo, falha de leitura, `XACK`, agendamento, reconciliação, publicação na Dead Letter Stream ou execução do ciclo de retry — não geram logs adicionais. Assim, cada tentativa de processamento produz no máximo um dos registros abaixo.

### Sucesso do handler

Depois que o handler termina com sucesso — e somente depois do commit, quando houver transação — registra-se o tipo do evento, seu identificador e o payload validado:

```ts
Logger.info(`${this.consumerName} consumer handled ${event.getType()}`, {
  eventId: event.getId(),
  ...(typeof payload === 'object' && payload !== null ? payload : { payload }),
});
```

Esse formato é usado tanto no processamento inicial quanto em um retry bem-sucedido.

### Primeira falha do evento

Quando o handler falha durante a entrega inicial, registra-se uma única vez:

```ts
Logger.error(`${this.consumerName} failed to handle event`, {
  entryId: message.id,
  error,
});
```

Esse é o único log da primeira falha, independentemente de o evento ser enviado à Dead Letter Stream ou ter um retry agendado.

### Falha durante retry

Quando o handler falha em uma tentativa de retry, registra-se uma única vez, incluindo o número da tentativa:

```ts
Logger.error(`${this.consumerName} failed to retry event`, {
  entryId: message.id,
  deliveryCount,
  error,
});
```

Esse é o único log da tentativa de retry que falhou, inclusive quando ela esgota o limite e encaminha o evento para a Dead Letter Stream.

## Processo principal: consumo de entradas novas

Enquanto estiver ativo, o consumer repete o mesmo ciclo: prepara seus grupos de consumo, aguarda entradas novas nos streams configurados, percorre as entradas recebidas e tenta processar cada uma. Quando termina um lote, começa outra leitura. Cada consumer define quais streams observa, quais tipos de evento aceita e os limites da leitura.

Uma **entrada** é uma mensagem do Redis Stream, identificada por um ID gerado pelo Redis. No contrato de eventos do projeto, ela contém pares de campo e valor: `event` (tipo), `eventId` (identificador do evento de negócio), `timestamp` (instante da publicação) e `payload` (dados serializados em JSON). O ID da entrada e o `eventId` têm funções diferentes: o primeiro identifica a mensagem no Redis; o segundo identifica o evento publicado.

### Configuração de cada consumer

Cada consumer usa um prefixo próprio nas variáveis de ambiente. Na tabela, `<PREFIXO>` representa esse prefixo e deve ser substituído pelo nome escolhido para o consumer; não faz parte do nome literal da variável. A conexão com o Redis usa `REDIS_URL`. As variáveis obrigatórias não têm valores padrão no código.

| Variável | Finalidade |
| --- | --- |
| `<PREFIXO>_GROUP` | Nome do grupo que recebe e confirma as entradas. |
| `<PREFIXO>_STREAMS` | Lista, separada por vírgulas, dos streams observados. Cada nome deve ser reconhecido pelo projeto. |
| `<PREFIXO>_SUPPORTED_EVENTS` | Lista, separada por vírgulas, dos tipos de evento que o consumer sabe processar. |
| `<PREFIXO>_BATCH_SIZE` | Limite de entradas solicitado **por stream** em cada chamada de `XREADGROUP`. |
| `<PREFIXO>_READ_BLOCK_MS` | Tempo máximo, em milissegundos, que uma leitura sem entradas disponíveis espera pela chegada de uma nova entrada. Não é um limite para a duração do processamento. |
| `<PREFIXO>_READ_ERROR_DELAY_MS` | Espera, em milissegundos, antes de tentar outra leitura quando falhar a preparação do grupo ou a leitura do stream. |
| `<PREFIXO>_DEAD_LETTER_STREAM` | Stream que recebe eventos cujo payload é definitivamente inválido. Não pode ser um dos streams observados pelo mesmo consumer. |

O consumer deve validar essas configurações antes de iniciar o loop: todas as variáveis exigidas precisam estar presentes; tempos e tamanhos de lote precisam ser inteiros positivos; os streams e os tipos informados precisam ser reconhecidos. A lista de tipos deve corresponder aos eventos para os quais o consumer possui processamento.

Quando uma entrada sofre uma falha que pode ser tentada novamente, o processo principal também precisa de `<PREFIXO>_RETRY_MAX_ATTEMPTS`, `<PREFIXO>_RETRY_SCHEDULE_KEY` e `<PREFIXO>_RETRY_EVENT_KEY_PREFIX`. Essas configurações determinam o limite de tentativas e onde registrar a tentativa futura. O intervalo é calculado pela fórmula descrita na seção seguinte.

`COUNT` e `BLOCK` controlam aspectos diferentes da leitura. `COUNT` solicita até o tamanho de lote configurado **em cada stream**, sem esperar que o lote fique cheio. Se houver vários streams, uma chamada poderá retornar mais entradas no total do que o valor de `COUNT`. `BLOCK` determina por quanto tempo a chamada aguarda se não houver entradas novas. Esses comportamentos seguem a [documentação de `XREADGROUP` do Redis](https://redis.io/docs/latest/commands/xreadgroup/).

### Algoritmo do loop principal

1. **Identificar a instância.** O consumer usa o grupo configurado e um nome de instância exclusivo. Várias instâncias podem compartilhar o mesmo grupo; o nome permite identificar a instância à qual uma entrada pendente foi entregue.
2. **Garantir o grupo em cada stream.** Antes da leitura, o consumer tenta criar o grupo para cada stream observado. A criação usa a posição inicial `0`, para que entradas que já estavam no stream possam ser entregues ao grupo, e `MKSTREAM`, para criar um stream vazio quando necessário. Se o Redis responder `BUSYGROUP`, o grupo já existe e o ciclo prossegue. Qualquer outra falha é tratada como erro da leitura.
3. **Ler entradas novas.** O consumer chama `XREADGROUP` com o grupo, o nome da instância, `COUNT` igual ao tamanho de lote configurado, `BLOCK` igual ao tempo de espera configurado e a lista de streams. O identificador `>` é usado para cada stream: ele pede entradas ainda não entregues ao grupo. As entradas entregues passam a constar na lista de pendências do grupo até receberem `XACK`.
4. **Tratar uma leitura vazia.** Se nenhuma entrada chegar durante a espera, o Redis retorna uma resposta vazia. O consumer não confirma nem processa nada e inicia outra volta do loop. A espera configurada evita consultas contínuas enquanto não há eventos novos.
5. **Percorrer o resultado.** A resposta contém os streams que tiveram entradas e, em cada um, suas entradas. O consumer percorre os streams e processa as entradas do lote uma por vez, aguardando o resultado de cada processamento antes de seguir. A falha de uma entrada não impede a tentativa de processar as demais entradas do mesmo lote.
6. **Interpretar os campos da entrada.** Os pares recebidos são convertidos em campos acessíveis pelo processamento. `event` decide qual tipo foi recebido; `payload` contém os dados que serão validados. Se `eventId` estiver ausente, o ID da entrada no Redis é usado como identificador do evento. `timestamp` informa quando ocorreu a publicação, mas não é usado para escolher o processamento neste fluxo.
7. **Verificar se o tipo é aceito.** Se `event` estiver ausente ou não constar entre os tipos aceitos por esse consumer, ele executa `XACK`, sem chamar uma regra de negócio. A entrada deixa de estar pendente para esse grupo.
8. **Validar e processar um tipo aceito.** O consumer interpreta o `payload` conforme o contrato do tipo identificado. Um JSON inválido ou campos incompatíveis devem gerar um erro específico desse evento, derivado de `InvalidPayloadError`. Com o payload válido, o processamento correspondente executa sua regra de negócio. Se essa regra alterar dados relacionados no banco, as alterações devem ser concluídas em uma única transação. Uma entrega duplicada deve ser tratada de forma idempotente quando o efeito esperado já estiver presente.
9. **Confirmar o sucesso.** Depois que o processamento termina com sucesso — e depois do commit, se houve transação no banco — o consumer emite o log de sucesso definido na política de logs e executa `XACK`. Esse comando remove a entrada da lista de pendências do grupo; ele **não** apaga a mensagem do Redis Stream.
10. **Tratar um payload inválido.** Se ocorrer `InvalidPayloadError`, o consumer emite o log da primeira falha definido na política de logs e envia a entrada à Dead Letter Stream, incluindo stream e ID de origem, grupo consumidor, campos originais, tipo e ID do evento, payload, nome e mensagem do erro e horário da falha. Somente após a gravação da Dead Letter Stream ele executa `XACK` na entrada original. Esse erro não é agendado para retry. Se a publicação na Dead Letter Stream falhar, o consumer não executa `XACK` e mantém a entrada pendente para recuperação, sem emitir outro log.
11. **Tratar outras falhas da entrada.** Se o processamento lançar outro erro, essa primeira entrega conta como tentativa `1` e emite o log da primeira falha definido na política de logs. Quando o limite configurado é maior que `1`, o consumer não executa `XACK` e tenta agendar a primeira retentativa. Mesmo que o agendamento falhe, a entrada permanece pendente, sem outro log. Se o limite for `1`, publica a falha na Dead Letter Stream e só então executa `XACK`. Se essa publicação falhar, mantém a entrada pendente. Em seguida, passa à próxima entrada do lote.
12. **Continuar o loop ou recuperar uma falha de leitura.** Após o lote, o consumer volta a preparar os grupos e consultar os streams. Se a preparação do grupo ou `XREADGROUP` falhar, ele espera `<PREFIXO>_READ_ERROR_DELAY_MS` e tenta novamente, sem emitir log. Esse atraso se aplica à falha do ciclo de leitura, não à falha isolada de uma entrada.

### Resultado possível para uma entrada

| Situação | Ação do consumer | Permanece pendente no grupo? |
| --- | --- | --- |
| Tipo ausente ou não aceito | Executa `XACK`, sem chamar o handler. | Não. |
| Tipo aceito e processamento concluído | Executa `XACK` após o processamento e, quando aplicável, após o commit. | Não. |
| Payload inválido (`InvalidPayloadError`) | Grava na Dead Letter Stream e, depois, executa `XACK`; não agenda retry. | Não, se a gravação e o `XACK` funcionarem. |
| Falha ao gravar na Dead Letter Stream | Não executa `XACK`; não emite um log adicional. | Sim. |
| Outra falha de processamento, com tentativas disponíveis | Emite o log da primeira falha e tenta agendar retry, sem executar `XACK`. | Sim. |
| Outra falha de processamento, com limite de uma tentativa | Grava na Dead Letter Stream e, depois, executa `XACK`. | Não, se a gravação e o `XACK` funcionarem. |

O registro da Dead Letter Stream guarda os campos `sourceStream`, `sourceEntryId`, `consumerGroup`, `event`, `eventId`, `payload`, `originalFields`, `errorName`, `errorMessage` e `failedAt`. Como a publicação e o `XACK` são comandos separados, uma falha após a publicação e antes da confirmação pode deixar a entrada original pendente e gerar uma segunda entrada na Dead Letter Stream em uma nova tentativa. A combinação de stream de origem, grupo e ID da entrada permite reconhecer essa duplicação.

A mesma distinção se aplica a uma entrada reclamada pelo processo de retry: se a validação revelar `InvalidPayloadError`, ela vai para a Dead Letter Stream sem novo agendamento. Depois da gravação, o consumer executa `XACK` e remove seus metadados de retry. Se a gravação falhar, a entrada continua pendente. A leitura de entradas novas com `>` não recupera as que já estão pendentes; o tratamento dessas entradas é explicado a seguir.

## Processo de retry: recuperação de entradas pendentes

Uma entrada entregue por `XREADGROUP` permanece na **Pending Entries List** (PEL) do grupo até receber `XACK`. Se o processamento falhar sem essa confirmação, o processo principal registra quando ela poderá ser tentada novamente. O processo de retry consulta essa agenda, assume a entrada pendente quando ela está elegível e executa o mesmo processamento usado para entradas novas.

O retry tem seu próprio ciclo e sua própria conexão com o Redis. Isso permite que ele continue consultando pendências enquanto a leitura de entradas novas aguarda em `XREADGROUP`. Ao iniciar e depois periodicamente, ele também compara a PEL com os registros de retry para recuperar entradas que ficaram pendentes antes de terem sido agendadas.

### Configurações do retry

O prefixo `<PREFIXO>` tem o mesmo significado definido na seção de configuração do processo principal. Todas as durações são expressas em milissegundos.

| Variável | Finalidade |
| --- | --- |
| `<PREFIXO>_RETRY_INTERVAL_MS` | Espera entre o término de uma volta do ciclo de retry e o início da próxima. Não é um relógio rígido: a duração do processamento se soma a essa espera. |
| `<PREFIXO>_RETRY_RECONCILE_INTERVAL_MS` | Tempo mínimo entre reconciliações bem-sucedidas da PEL com a agenda. A primeira reconciliação ocorre na inicialização. |
| `<PREFIXO>_RETRY_RECONCILE_BATCH_SIZE` | Quantidade máxima de entradas da PEL consultadas por página durante a reconciliação. |
| `<PREFIXO>_RETRY_PROCESSING_LEASE_MS` | Período durante o qual uma entrada reclamada é reposicionada no futuro da agenda enquanto está em processamento. |
| `<PREFIXO>_RETRY_SCHEDULE_KEY` | Chave da Sorted Set que ordena os retries pelo horário da próxima tentativa. |
| `<PREFIXO>_RETRY_EVENT_KEY_PREFIX` | Prefixo das chaves Hash que guardam o estado de cada entrada pendente. |
| `<PREFIXO>_RETRY_MAX_ATTEMPTS` | Número máximo de tentativas de processamento, incluindo a entrega inicial. Deve ser um inteiro positivo. |

O retry também usa `<PREFIXO>_BATCH_SIZE` como quantidade máxima de entradas vencidas selecionadas por volta e `<PREFIXO>_DEAD_LETTER_STREAM` para payloads inválidos ou tentativas esgotadas. Os tempos, tamanhos de lote e o limite de tentativas precisam ser inteiros positivos. O intervalo entre tentativas não é configurado por uma lista: é calculado para cada agendamento.

### Estado de cada entrada

A **Sorted Set** é a agenda. Seu membro combina o nome do stream com o ID da entrada (`<stream>:<entryId>`), e seu *score* é `nextAttemptAt`, um horário em milissegundos. Essa ordenação permite buscar primeiro as entradas cujo horário já chegou.

Um **Hash** separado, identificado por `<PREFIXO>_RETRY_EVENT_KEY_PREFIX:<stream>:<entryId>`, guarda:

| Campo | Significado |
| --- | --- |
| `eventId` | ID do evento publicado; usa o ID da entrada como substituto quando não está disponível. |
| `entryId` e `stream` | Localização da entrada original no Redis Stream. |
| `deliveryCount` | Número de tentativas de processamento conhecido pela agenda; começa em `1` após a primeira falha e é incrementado ao iniciar cada retry que será processado. Reclamar uma entrada já esgotada apenas para enviá-la à Dead Letter não incrementa esse contador. |
| `lastAttemptAt` | Instante da última tentativa, ou instante estimado a partir da PEL na reconciliação. |
| `nextAttemptAt` | Horário da próxima tentativa planejada ou, durante o processamento, fim da lease da agenda. |
| `idleTimeMs` | Tempo **mínimo** de ociosidade exigido para reclamar a entrada com `XCLAIM`. É o intervalo calculado pela fórmula de backoff, não a ociosidade atual da entrada; vale `0` quando uma pendência já esgotada é recuperada sem Hash. |
| `lastError` | Nome e mensagem do último erro, ou indicação de que o estado foi recuperado pela reconciliação. |

O tempo ocioso atual pertence à PEL e muda continuamente. Ele é obtido com `XPENDING`; não deve ser confundido com o `idleTimeMs` armazenado no Hash.

### Regra de agendamento e backoff

Na primeira falha que admite retry, o processo principal mantém a entrada pendente, registra `deliveryCount = 1`, define `lastAttemptAt` como o horário da falha e calcula `nextAttemptAt`. A escrita do Hash e a inclusão do membro na Sorted Set são enviadas juntas com `MULTI`/`EXEC`.

Para `n = deliveryCount`, o intervalo é:

```text
random(0, 29) = inteiro uniforme de 0 a 29, sorteado em cada agendamento
delay(n) = (n - 1)^4 + 15 + random(0, 29) * n   // segundos
idleTimeMs = delay(n) * 1.000
nextAttemptAt = lastAttemptAt + idleTimeMs
```

A fórmula retorna **segundos**; o consumer multiplica por `1.000` para usar milissegundos no Redis. Após a falha da tentativa `1`, sorteia-se um atraso de `15` a `44` segundos antes da tentativa `2`. Após a falha da tentativa `2`, o intervalo vai de `16` a `74` segundos. Como o fator aleatório é sorteado novamente a cada agendamento, dois eventos na mesma tentativa podem ter horários distintos. Não se calcula outro atraso após a falha da tentativa máxima: o evento é enviado à Dead Letter Stream.

`<PREFIXO>_RETRY_MAX_ATTEMPTS` conta **todas** as tentativas de processamento, incluindo a entrega inicial. Por exemplo, com limite `6`, a sexta tentativa ainda é executada; se falhar por um erro recuperável, o evento vai à Dead Letter sem agendar uma sétima. `InvalidPayloadError` continua indo à Dead Letter imediatamente, qualquer que seja o contador.

### Reconciliação com a Pending Entries List

O processo de retry reconcilia a PEL na inicialização e novamente quando decorre `<PREFIXO>_RETRY_RECONCILE_INTERVAL_MS` desde a última reconciliação concluída. Para cada stream observado, consulta `XPENDING` em páginas de até `<PREFIXO>_RETRY_RECONCILE_BATCH_SIZE` entradas. Começa no primeiro ID e, quando recebe uma página cheia, continua **depois** do último ID da página anterior. Cada item fornece o ID da entrada, o consumer atual, o tempo ocioso e o contador de entregas informado pelo Redis. A [documentação de `XPENDING`](https://redis.io/docs/latest/commands/xpending/) descreve esses dados.

Se uma entrada pendente **não possui Hash de retry** e seu tempo ocioso já alcançou `<PREFIXO>_RETRY_PROCESSING_LEASE_MS`, o consumer recria o estado e a agenda. Pendências mais novas podem estar sendo processadas pelo loop principal e são ignoradas nessa reconciliação para que não recebam um retry concorrente. Para uma entrada elegível, estima `lastAttemptAt` como `agora - tempo_ocioso` e utiliza pelo menos `1` para `deliveryCount`. Abaixo do limite de tentativas, calcula o próximo horário pela fórmula. Se o contador já alcançou o limite, agenda a recuperação imediatamente, sem novo backoff, para que o evento seja reclamado e enviado à Dead Letter sem executar novamente o handler. `XPENDING` não fornece o conteúdo da entrada; nessa recuperação, `eventId` usa provisoriamente `entryId`. O conteúdo original será obtido quando `XCLAIM` reclamar a mensagem. Entradas que já possuem Hash não são reagendadas pela reconciliação.

Essa verificação cobre, por exemplo, uma interrupção após a entrega inicial e antes da gravação do agendamento. Ela verifica a existência do Hash; se o Hash existir mas o membro da Sorted Set faltar, a reconciliação atual não reconstrói esse membro.

### Algoritmo de cada volta do retry

1. **Preparar os grupos e reconciliar quando necessário.** O ciclo garante que o grupo exista nos streams observados. Na primeira volta, executa a reconciliação; nas seguintes, repete-a após o intervalo configurado. Só depois procura retries vencidos.
2. **Buscar entradas cujo horário chegou.** Executa `ZRANGE` na Sorted Set com `BYSCORE`, do menor score até o horário atual, e `LIMIT` de zero até `<PREFIXO>_BATCH_SIZE`. Isso seleciona no máximo um lote de entradas vencidas, em ordem de score. Entradas com horário futuro não entram nesse lote. A [documentação de `ZRANGE`](https://redis.io/docs/latest/commands/zrange/) descreve a seleção por score.
3. **Validar agenda e Hash.** Para cada membro, separa o stream do ID da entrada e verifica se o stream é reconhecido. Um membro malformado ou com stream desconhecido é removido da agenda. Se o membro é válido, carrega o Hash; um Hash ausente ou inválido provoca a remoção do membro e dos metadados daquele ID. O processamento passa à próxima entrada do lote.
4. **Reclamar a entrada pendente.** Executa `XCLAIM` com stream, grupo, nome do consumer de retry, ID da entrada e `idleTimeMs` do Hash como tempo mínimo ocioso. O horário vencido na Sorted Set **não basta**: o Redis só transfere a entrada se ela ainda estiver pendente e tiver ociosidade suficiente. Um `XCLAIM` bem-sucedido entrega o conteúdo original, transfere a responsabilidade para o consumer de retry e zera sua ociosidade. Veja a [documentação de `XCLAIM`](https://redis.io/docs/latest/commands/xclaim/).
5. **Resolver uma tentativa de claim sem resultado.** Consulta `XPENDING` para aquele ID. Se a entrada não está mais pendente, remove seu membro da agenda e seu Hash, pois o retry não é mais necessário. Se ainda está pendente, mantém o estado como está e deixa a próxima volta tentar novamente; não incrementa `deliveryCount`.
6. **Verificar o limite e reservar tempo.** Se o Hash já informa `deliveryCount >= <PREFIXO>_RETRY_MAX_ATTEMPTS`, o consumer reserva uma lease na agenda, envia a entrada à Dead Letter pelo esgotamento anterior e não chama o handler nem incrementa o contador. Caso contrário, incrementa `deliveryCount`, registra o início da tentativa em `lastAttemptAt` e move temporariamente `nextAttemptAt` para `agora + <PREFIXO>_RETRY_PROCESSING_LEASE_MS`. Atualiza Hash e Sorted Set juntos com `MULTI`/`EXEC`. Durante a lease, o membro não aparece na busca de retries vencidos.
7. **Executar o processamento do evento quando ainda há tentativa disponível.** Usa a mesma validação, distinção de tipos e regra de negócio do processo principal. Um resultado idempotente também é sucesso. O resultado decide se a entrada é confirmada, enviada à Dead Letter Stream ou reagendada.
8. **Concluir um sucesso.** Depois do processamento e, se houver banco de dados, depois do commit, emite o log de sucesso definido na política de logs. Em seguida, executa `XACK`, remove o membro da Sorted Set e exclui o Hash na mesma transação Redis. A entrada sai da PEL; seu registro de retry deixa de existir.
9. **Tratar um payload inválido.** Se ocorrer `InvalidPayloadError`, emite o log de falha durante retry definido na política de logs e publica a entrada e o motivo na Dead Letter Stream. Após a publicação, executa `XACK` e remove o membro da agenda e seu Hash. Não calcula outro backoff. Se a publicação falhar, não executa `XACK`; a entrada permanece pendente, e o registro da tentativa permanece na agenda para recuperação posterior, sem outro log.
10. **Tratar outra falha conforme o limite.** Emite uma única vez o log de falha durante retry definido na política de logs. Se `deliveryCount` ainda é menor que o máximo, não executa `XACK`: atualiza o Hash com o erro e os horários calculados para essa tentativa e reposiciona o membro na Sorted Set. Se `deliveryCount` alcançou o máximo, registra o último erro no Hash, publica o evento na Dead Letter com `RetryAttemptsExhaustedError` e o último motivo da falha e, após a publicação, executa `XACK` e remove agenda e Hash. Se a publicação falhar, não executa `XACK`; a entrada permanece pendente e a lease permite nova tentativa de publicação, sem reexecutar o handler e sem outro log.
11. **Aguardar a próxima volta.** Quando termina o lote, ou quando ocorre uma falha do próprio ciclo, espera `<PREFIXO>_RETRY_INTERVAL_MS` antes de consultar novamente, sem emitir log do ciclo. O processo principal continua independente dessa espera.

### Lease e processamento demorado

A lease **não** interrompe o handler nem renova automaticamente sua posse da entrada. Ela apenas posterga o score na agenda; o `idleTimeMs` do Hash continua sendo o mínimo exigido pelo `XCLAIM`. Depois que a lease expira, outra instância pode tentar `XCLAIM`; se a ociosidade mínima também já foi atingida, o mesmo evento pode ser processado em paralelo. Por isso, os efeitos do evento precisam ser idempotentes. Para operações que podem durar mais do que a lease, o valor configurado deve considerar essa duração; a implementação atual não possui renovação periódica da lease.

### Destino de uma entrada no retry

| Resultado | PEL | Agenda e Hash |
| --- | --- | --- |
| Ainda não pode ser reclamada | Permanece pendente. | Permanecem; outra volta tentará novamente. |
| Já não está pendente | Já foi removida da PEL. | São removidos como estado obsoleto. |
| Processamento bem-sucedido | `XACK` remove a pendência. | São removidos. |
| `InvalidPayloadError` com publicação na Dead Letter bem-sucedida | `XACK` remove a pendência. | São removidos. |
| Limite de tentativas atingido, com publicação na Dead Letter bem-sucedida | `XACK` remove a pendência; não há outra tentativa do handler. | São removidos. |
| Falha na publicação à Dead Letter | Permanece pendente, sem `XACK`. | Permanecem para recuperação. |
| Outro erro de processamento, com tentativas disponíveis | Permanece pendente, sem `XACK`. | São atualizados com a próxima tentativa. |
