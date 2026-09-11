# 04 — Política de senha fraca

## Classificação

- **OWASP Top 10:** A07:2021 – Identification and Authentication Failures
- **CWE:** CWE-521: Weak Password Requirements (principal), CWE-307: Improper Restriction of Excessive Authentication Attempts (ausência de rate limit nos endpoints que conferem a senha atual). O truncamento silencioso do bcrypt, o bug de build que congelava a blocklist e a troca de senha que aceitava a senha atual não têm um CWE que se aplique com precisão, e por isso estão descritos pelo modo de falha, sem identificador.
- **Severidade:** Média — nenhum dos achados dá acesso sozinho, mas eles barateiam o brute force e o credential stuffing, que são os ataques que de fato acontecem contra uma aplicação como esta.

## Descrição

A política antiga exigia no mínimo 5 caracteres e impunha três regras de composição: uma letra maiúscula, um número e um caractere especial. É a política que quase todo mundo aprendeu a escrever, e é exatamente o que o NIST hoje proíbe.

O problema da composição obrigatória é que ela não gera aleatoriedade, gera mutação previsível. O usuário não inventa uma senha nova para satisfazer a regra: ele pega a senha que já ia usar e a decora até passar. `senha` vira `Senha1!`, `flamengo` vira `Flamengo@2024`. Como todo mundo aplica a mesma transformação, o atacante não precisa adivinhar nada, basta modelar a regra. O caractere especial custa caro para o humano lembrar e quase nada para a máquina prever.

A SP 800-63B-4 é explícita no ponto, e na revisão 4 o verbo endureceu de `SHOULD NOT` para `SHALL NOT`:

> "Verifiers and CSPs **SHALL NOT** impose other composition rules (e.g., requiring mixtures of different character types) for passwords." (§3.1.1.2)

A mesma seção troca a composição por comprimento, e aqui o verbo também é forte:

> "Verifiers and CSPs **SHALL** require passwords that are used as a single-factor authentication mechanism to be a minimum of 15 characters in length."

A inversão de raciocínio é essa: em vez de exigir enfeite em cima de uma base fraca, bloqueia-se a base. Por isso a blocklist de senhas comuns não é um extra opcional, e sim o par natural da política de comprimento, e o NIST a exige no mesmo parágrafo:

> "Verifiers **SHALL** compare the prospective secret against a blocklist that contains known commonly used, expected, or compromised passwords."

Comprimento sem blocklist aceita `senha123456789012`. Blocklist sem comprimento aceita `Xk9!`. São os dois juntos que fecham o espaço, e o achado central deste writeup é o que acontece quando os dois existem, mas são implementados na ordem errada.

## Metodologia e mapeamento

Este writeup tem uma moldura diferente dos anteriores. Nos writeups 01 a 03 eu encontrei uma falha e a corrigi; aqui eu implementei uma mitigação e depois auditei a minha própria mitigação.

A pergunta que abriu a auditoria foi simples: a blocklist está funcionando? A função em si funcionava e passava em qualquer teste feito com ela isoladamente. O que não funcionava era tudo em volta: a ordem em que ela era chamada, a interface que nunca deixava a senha chegar até ela, o build que parava de atualizar a lista e os endpoints vizinhos que ficaram sem proteção. A auditoria encontrou oito problemas.

Houve ainda uma terceira etapa: uma das correções introduziu um problema novo, que só apareceu quando ela foi revisada depois de pronta. Isso está descrito no fim da seção de correção.

| # | Achado | Gravidade | Ação |
|---|--------|-----------|------|
| 1 | Blocklist 99,8% inalcançável (o `min(15)` barrava antes da consulta) | Média | corrigido |
| 2 | Frontend com a política antiga (barrava passphrase válida, aceitava senha de 5 chars) | Média | corrigido |
| 3 | `max(64)` em caracteres não protegia do truncamento do bcrypt (72 bytes) | Baixa a Média | corrigido |
| 4 | `/me/password` e `/me` sem rate limit (oráculo de senha) | Média | corrigido |
| 5 | Bug no build: a blocklist congelava a partir do 2º build | Média | corrigido |
| 6 | `changePassword` aceitava nova senha igual à atual | Baixa | corrigido |
| 7 | Contexto cobria só o username, não o email nem o nome do site | Baixa a Média | corrigido |
| 8 | Seed do admin escapa da política inteira | Média | não corrigido (decisão) |

A gravidade de cada linha veio menos do dano isolado e mais do quanto a falha silenciava um controle que eu acreditava ter. Os achados 1 e 5 são os mais altos por esse critério, porque nos dois casos o sistema respondia como se estivesse protegido. O 3 foi classificado com cautela, pelos motivos detalhados na seção de impacto. O 6 é o mais baixo, porque exige que o usuário já tenha errado, mas entra na lista porque a resposta da API afirmava algo falso.

### O achado central: a blocklist era 99,8% inalcançável

A validação Zod roda no controller, antes do service, e a blocklist é consultada no service. Então qualquer senha com menos de 15 caracteres era rejeitada por comprimento e nunca chegava a ser consultada na lista.

Medindo a distribuição da wordlist por comprimento:

| faixa de comprimento | entradas | alcançáveis com `min(15)`? |
|---|---|---|
| ≥ 15 | 18 | sim |
| 12–14 | 100 | não |
| 10–11 | 688 | não |
| 8–9 | 3.213 | não |
| < 8 | 5.981 | não |

Apenas 18 de 10.000. As outras 9.982 entradas eram peso morto: o arquivo era lido na subida do servidor, o `Set` era montado, a memória era ocupada, e nada daquilo podia ser consultado.

O ponto central não é o bug em si, e sim o fato de que não havia um controle quebrado: eram dois controles corretos que se anulavam. A política de comprimento e a blocklist deveriam se complementar, mas, implementadas nesta ordem, a primeira tornava a segunda inerte.

Indo atrás da procedência da lista, ficou claro que isso é estrutural, e não uma particularidade desta wordlist. O arquivo é o `Pwdb_top-10000.txt` do SecLists, que vem do projeto Pwdb-Public, um ranking de frequência extraído de 1 bilhão de credenciais vazadas. Depois de descartadas 257,6 milhões de linhas corrompidas ou de contas de teste, sobraram 168,9 milhões de senhas, com comprimento médio de 9,48 caracteres.

Uma lista das senhas mais comuns do mundo real é, por construção, uma lista de senhas curtas, porque é isso que as pessoas usam. Ou seja, qualquer política de comprimento moderna passa por cima de qualquer blocklist comparada por match exato. Trocar de lista não resolveria, porque toda lista honesta tem a mesma propriedade, e é por isso que a correção foi mudar a forma de comparar, e não a lista.

Dois números da mesma fonte ajudam a dimensionar o alcance de uma lista de 10.000 entradas: `123456` sozinho cobre 0,722% de todas as senhas do corpus, e as 1.000 mais comuns cobrem 6,607%. Dez mil entradas são a ponta de uma cauda muito longa, e não uma cobertura ampla.

## Prova de conceito

Diferente dos writeups anteriores, este não traz capturas de tela. Lá a evidência era comparativa, duas respostas lado a lado no Comparer do Burp; aqui ela é quantitativa (alcance de lista, taxa de falso positivo, contagem de bytes, milissegundos por tentativa), e por isso está registrada como saída de scripts que podem ser executados de novo. Os valores citados abaixo saem de dois scripts versionados em `pocs/`, ambos rodando com `npx tsx` a partir de `backend/`: o [`04-blocklist-normalizacao.ts`](pocs/04-blocklist-normalizacao.ts), que mede a blocklist, os falsos positivos, o bloqueio contextual e o custo da validação, e o [`04-bcrypt-e-oraculo.ts`](pocs/04-bcrypt-e-oraculo.ts), que mede o truncamento do bcrypt, o custo de cada chute e o limitador compartilhado. O restante sai de comandos que estão no próprio texto. As contagens são determinísticas; os tempos variam com a máquina, e o que vale neles é a ordem de grandeza.

A distribuição da tabela anterior sai deste comando:

```bash
awk '{n=length($0); if(n>=15)a++; else if(n>=12)b++; else if(n>=10)c++; else if(n>=8)d++; else e++} \
  END{printf ">=15: %d\n12-14: %d\n10-11: %d\n8-9: %d\n<8: %d\n", a,b,c,d,e}' \
  backend/src/data/common-passwords.txt
```

A procedência da lista também foi verificada, e não presumida:

```bash
md5sum backend/src/data/common-passwords.txt   # e2bfa126fd50e8d778a42c9eeeb804b4
curl -sSL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/Pwdb_top-10000.txt | md5sum
```

Os dois hashes batem: o arquivo do repositório é idêntico byte a byte ao do SecLists.

### O alcance, antes e depois

O "antes" aqui não depende de memória: o script recalcula a regra antiga (match literal contra o mínimo de 15) sobre a mesma lista, então os dois números saem da mesma execução.

```
1. Alcance da blocklist (10.000 entradas)
Antes (match exato):        18 entradas alcançáveis
Depois (raiz normalizada):  ~6546 entradas alcançáveis
```

### Senhas fracas com 15+ caracteres, que passavam na política

Estas senhas foram construídas do jeito que as pessoas realmente esticam uma senha fraca para bater um mínimo de comprimento. Todas passavam antes da correção, porque todas têm 15 caracteres ou mais e nenhuma delas está literalmente na lista.

```
BLOQUEADA  senha123456789012    raiz: senha
BLOQUEADA  password12345678     raiz: password
BLOQUEADA  p4ssw0rd12345678     raiz: password
BLOQUEADA  iloveyou!!!!!!!!     raiz: iloveyou
BLOQUEADA  monkey1234567890     raiz: monkey
BLOQUEADA  qwerty1234567890     raiz: qwerty
passa      2024corinthians!     raiz: corinthians
BLOQUEADA  flamengo00000000     raiz: flamengo
BLOQUEADA  PRINCESS12345678     raiz: princess
BLOQUEADA  sunshine!!!!!!!!     raiz: sunshine
passa      futebol1234567890    raiz: futebol
passa      a$tr0naut12345678    raiz: astronaut

Cobertura: 9/12
```

As três que escaparam não escaparam por falha da normalização, e sim porque `futebol`, `corinthians` e `astronaut` não estão na lista. Esse é o vetor residual de idioma, discutido no fim.

### O custo da mitigação: falsos positivos

Uma mitigação que barra senha boa é pior que a doença, porque empurra o usuário de volta para a senha curta. Medi contra três corpora:

```
Passphrases escritas à mão      12 amostras -> 0 bloqueadas (0.000%)
Aleatórias de gerenciador     20000 amostras -> 0 bloqueadas (0.000%)
Passphrases sintéticas        20000 amostras -> 0 bloqueadas (0.000%)
```

Zero falsos positivos em 40.012 amostras. Os corpora são passphrases escritas à mão no estilo que a política nova quer incentivar, senhas aleatórias de gerenciador entre 16 e 24 caracteres, e combinações de palavras comuns do português que não são senhas de lista.

Esse zero, porém, é mais frágil do que parece. Os corpora aleatórios são gerados com um PRNG de semente fixa, e isso é deliberado: na primeira versão do script eles usavam `Math.random()`, então cada execução media um conjunto diferente de senhas, e rodando três vezes seguidas obtive 0, 0 e 1 falso positivo. Para afirmar zero falsos positivos, o número precisa ser reproduzível, e um corpus aleatório sem semente não é.

Com a semente fixa, o bloco acima virou um teste de regressão: se um dia der diferente de zero, alguma regra passou a barrar demais. Ele não serve, porém, como estimativa da taxa. A taxa é medida à parte, no bloco 6 do mesmo script (`--varredura`), com 2 milhões de senhas de gerenciador geradas a partir de outra semente, também fixa:

```
6. Varredura longa de falso positivo
Aleatórias de gerenciador: 2.000.000 amostras -> 3 bloqueadas
Taxa: 0.00015%  (1 em ~666.667)
    Lf!riEp3E*htDsHo-Chan+fb   A senha não pode conter o nome do site.
    =qa4KQ4yjlK8wRNo2ch4n0     A senha não pode conter o nome do site.
    1D%W8_CZwzZeJ-U7f^CHAN#=   A senha não pode conter o nome do site.
```

As três têm a mesma causa: o termo curto `chan` casando por acaso, com a fronteira de não-letra satisfeita por um símbolo ou dígito que o gerador colocou ali. Na segunda, o casamento só acontece depois de a canonização desfazer o leet (`ch4n` vira `chan`). Não é bug, é o custo da decisão de incluir um termo de quatro letras na lista de contexto, e agora ele está quantificado. Com apenas três eventos, o número vale como ordem de grandeza: um usuário a cada algumas centenas de milhares de senhas geradas vai precisar clicar em "gerar de novo". Considero a troca aceitável, já que o inverso seria deixar passar o apelido do próprio site.

Quarenta mil amostras não bastam para enxergar um evento dessa raridade, e é por isso que o bloco 3 dá zero. Zero em uma rodada não significa que o evento não acontece.

O bloco 5 do mesmo script mede o custo de execução:

```
5. Custo de execução
Carga e canonização da lista: 6 ms (9789 literais, 6528 raízes)
Custo por validação:          7.44 µs
```

A lista tem 10.000 linhas, mas 211 delas só diferem de outra pela caixa, então sobram 9.789 literais distintos depois de passar para minúsculas. A carga acontece uma única vez, na subida do servidor. O número acima foi medido com o processo já aquecido, então a carga fria pode levar algumas vezes mais, mas continua na casa dos milissegundos. A validação custa alguns microssegundos, já com as duas passadas da blocklist e o contexto inteiro (username, email e nome do site), e não cresce com o tamanho da lista, porque as consultas são feitas em `Set`. É um custo desprezível perto dos cerca de 54 ms do `bcrypt.compare` que vem logo depois.

### O truncamento do bcrypt

Duas senhas de 64 caracteres, ambas válidas pela política antiga, com os mesmos 72 primeiros bytes. A última coluna já mostra a correção descrita mais adiante, o teto em bytes, rejeitando as duas:

```
1. Truncamento do bcrypt (72 bytes)
A | chars: 64 | bytes: 106 | max(64) antigo: PASSA | teto em bytes atual: REJEITA
B | chars: 64 | bytes: 106 | max(64) antigo: PASSA | teto em bytes atual: REJEITA
A === B ?  false
bcrypt.compare(B, hash de A) -> true
```

Onde exatamente o corte acontecia:

```
Senha: 64 chars / 106 bytes
bcrypt lê até o caractere 36 (72 bytes)
IGNORADO em silêncio: 28 caracteres, 44% da senha

Parte que conta : çãõéüñçãõéüñçãõéüñçãõéüñçãõéüñçãõéüñ
Parte descartada: çãõéüñaaaaaaaaaaaaaaaaaaaaaa
```

Uma nota de método: a primeira versão deste teste estava errada. A senha B tinha 77 caracteres e era rejeitada pelo Zod, então o teste provava o truncamento do bcrypt, mas não provava a vulnerabilidade, porque uma das duas senhas nem passaria na política. Refiz com duas senhas de 64 caracteres. A lição vale para qualquer PoC de colisão: as duas entradas precisam passar por todos os controles, senão o que se prova é uma curiosidade, e não uma falha.

### O oráculo de senha sem rate limit

`PATCH /me/password` e `DELETE /me` rodam `bcrypt.compare` contra a senha do usuário e respondem com um erro distinto quando ela está errada. Medindo o custo por tentativa:

```
2. Custo de cada chute contra o oráculo de senha
bcrypt.compare (custo 10): 54 ms por tentativa
Sem rate limit, 5 min de chutes sequenciais: ~5.545 tentativas
```

### Bloqueio contextual

Os casos negativos deste teste são tão importantes quanto os positivos, porque são eles que provam que a regra não barra demais:

```
4. Bloqueio contextual: username, email e nome do site
   usuario: joaosilva   email: joao.silva+news@provedor.com
 ok   BLOQUEADA  joaosilva minha senha    username literal (já pegava antes)
 ok   BLOQUEADA  J0a0Silva do bairro!!    username com leet, só a raiz pega
 ok   BLOQUEADA  joao.silva senha boa     local-part inteiro do email
 ok   BLOQUEADA  a senha do silva aqui    pedaço do local-part
 ok   BLOQUEADA  news da manha bem cedo   tag +news do email
 ok   BLOQUEADA  imageboard do trabalho   nome do serviço
 ok   BLOQUEADA  senha do chan de novo    apelido do serviço, palavra solta
 ok   BLOQUEADA  minha senha no 4chan!!   apelido colado em não-letra
 ok   passa      uma chance boa de novo   "chance" NÃO é o site
 ok   passa      manchando o caderno la   "manchando" NÃO é o site
 ok   passa      silvana mora na esquina  "silvana" NÃO é o local-part

Casos corretos: 11/11
```

Nos mesmos 40.000 registros dos corpora de gerenciador e de passphrase sintética, agora com um usuário real por trás, o contexto novo também não barrou nada.

### Contra o servidor rodando

Os scripts provam a lógica de validação isolada. Estas são as respostas da API de verdade, com o servidor no ar e o banco conectado, que é onde a ordem das camadas (Zod no controller, blocklist no service) realmente se manifesta:

```
POST /auth/register  email: joao.silva+news@teste.local  password: "joao.silva na estrada"
  -> 400 {"error":"A senha não pode conter partes do seu email."}

POST /auth/register  password: "imageboard do trabalho"
  -> 400 {"error":"A senha não pode conter o nome do site."}

POST /auth/register  password: "uma chance boa de novo"
  -> 201 (o falso positivo que NÃO pode acontecer)

PATCH /auth/me/password  {current: "uma chance boa de novo", new: "uma chance boa de novo"}
  -> 400 {"error":"A nova senha deve ser diferente da senha atual"}

PATCH /auth/me/password  {current: "uma chance boa de novo", new: "outra frase bem comprida"}
  -> 200 {"success":true}
```

As mesmas requisições podem ser repetidas em RAW no Repeater do Burp, como nos writeups anteriores. O veredito é o mesmo, muda apenas a ferramenta.

## Impacto

O impacto desta categoria não se mede isoladamente, e sim na cadeia com os outros writeups deste laboratório. O writeup 03 (user enumeration) entrega ao atacante a lista de contas que existem. O writeup 01 (rate limiting) determina quanto custa cada tentativa contra essa lista. E a política de senha determina quantas tentativas são necessárias. A senha fraca é o elo que torna os outros dois eficazes: enumerar alvos e ter orçamento de tentativas só compensa se as senhas forem adivinháveis.

Sobre o oráculo de senha do achado 4, vale explicar o modelo de ameaça. O atacante já precisa de uma sessão válida, seja por um cookie roubado via XSS, uma máquina compartilhada ou uma sessão esquecida aberta. A pergunta natural é por que ele iria querer a senha se já está logado, e a resposta é que a sessão é temporária e limitada, enquanto a senha é permanente. Com a senha em mãos ele troca a senha e tranca o dono real para fora, apaga a conta e, principalmente, reusa a credencial em outros serviços, porque as pessoas repetem senha. O `currentPassword` era a barreira entre ter a sessão da vítima por algumas horas e se passar por ela indefinidamente.

O bcrypt de custo 10 é um freio parcial, já que não permite milhões de chutes por segundo. Mas cerca de 5,5 mil tentativas em cinco minutos derrubam qualquer senha do padrão antigo de 5 caracteres, que é exatamente o caso das contas legadas. Há ainda um segundo impacto no mesmo achado: cada chute consome cerca de 54 ms de CPU do servidor, então o endpoint sem limite também era um vetor barato de negação de serviço.

### O alcance real do truncamento

Este achado é fácil de superdimensionar, então vale delimitar o que ele é e o que não é.

Não se trata de bypass de autenticação, e não existe senha coringa. O que existe é que todas as senhas que compartilham os mesmos 72 primeiros bytes viram a mesma senha para o bcrypt. Quem não souber o começo da senha continua sem entrar.

O dano real é um teto silencioso de entropia: quem escolheu uma senha longa de propósito teve até 44% dela descartada sem nenhum aviso, e acredita estar protegido por 64 caracteres quando na prática tem 36. O escopo também é limitado, porque só afeta senhas com caracteres multibyte: sessenta e quatro caracteres ASCII são 64 bytes e nunca chegam ao limite. Em um board brasileiro, com acentos, o cenário é plausível, mas não é o caso comum.

Por isso classifico o achado como truncamento silencioso de senha, de severidade baixa a média, e não como falha de autenticação.

### Por que `iloveyou!!!!!!!!` continua fraca

Ela é bem melhor que `iloveyou`, e bem pior do que o número de caracteres sugere.

`iloveyou` está no topo de qualquer lista vazada (é a 15ª entrada da lista usada aqui), e mesmo uma lista inteira de 10.000 bases custa só cerca de 2^13 tentativas. Os oito `!` parecem somar 52 bits (95^8, se fossem aleatórios), mas não são aleatórios: são uma mutação previsível dentro de um espaço de regras de talvez 2^15 a 2^20. Percorrer a lista inteira com essas regras fica na casa de 2^28 a 2^33 tentativas, e não de 2^65, e isso cobre qualquer senha dessa forma, não só esta; `iloveyou!!!!!!!!` cai bem antes, porque a base está no começo da lista.

Traduzindo para tempo contra o bcrypt de custo 10 deste projeto: uma GPU moderna faz na ordem de poucos milhares de hashes por segundo nesse custo, então 2^28 candidatos levam de horas a poucos dias em uma única GPU. Em comparação, uma passphrase de quatro palavras sorteadas de um dicionário grande passa de 2^50 mesmo com o atacante sabendo o formato exato. São classes diferentes de senha, e não graus da mesma.

Esses números são estimativas de ordem de grandeza, derivadas de benchmarks públicos de hashcat, e não medições feitas nesta máquina como o resto do writeup. Estão aqui para dimensionar a diferença entre as duas classes de senha, não para afirmar um tempo exato.

Há um segundo motivo, mais prático que o primeiro: as variantes mutadas também estão nos vazamentos reais. `iloveyou!!!` não é hipótese, milhares de pessoas fizeram a mesma transformação óbvia, então ela aparece nos corpora de credential stuffing. E o credential stuffing é o ataque que realmente acontece contra um imageboard, muito mais que o cracking offline, que exige o banco já vazado.

## Correção

### Normalização: como a blocklist voltou a valer

Havia quatro caminhos para resolver o achado central:

| opção | o que era | por que não |
|---|---|---|
| Baixar o mínimo para 8 | Tornaria 4.019 entradas alcançáveis | Violaria a norma: na SP 800-63B-4 os 15 caracteres são `SHALL`, não recomendação |
| Trocar por lista de senhas longas | Filtrar uma wordlist maior por ≥15 chars | Senhas longas vazadas são poucas; esforço alto, ganho baixo |
| HIBP via k-anonymity | Consultar o Pwned Passwords enviando só 5 chars do SHA-1 | Dependência de rede no cadastro, e exige decidir entre fail-open e fail-closed |
| Normalizar antes de comparar | Derivar a raiz da senha e comparar raiz com raiz | Foi o escolhido |

A função `canonizar()` reduz a senha à palavra que sobra depois de tirar as mutações previsíveis:

```typescript
// backend — passwordBlocklist.ts
function canonizar(texto: string): string {
  return texto
    .toLowerCase()
    // 1. Tira dígitos, símbolos e espaços das pontas: os sufixos e prefixos
    //    decorativos ("senha2024", "!!!admin") não mudam o miolo da senha.
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    // 2. Desfaz o leet mais comum, agora que só sobrou o miolo: p4ssw0rd para password.
    .replace(/[4@]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    // 3. Colapsa repetições de 3 ou mais: "passworddddd" -> "password".
    .replace(/(.)\1{2,}/g, '$1')
}
```

São duas estruturas em memória: `senhasComuns`, com as senhas literais para o match exato (o comportamento original, que continua valendo), e `raizesComuns`, com as raízes das entradas. Comparar raiz contra raiz evita ter que gerar e guardar todas as mutações possíveis de cada palavra.

Duas decisões de implementação não são óbvias. A primeira é a ordem das etapas: as pontas são limpas antes do leet. Se fosse ao contrário, `password1234` viraria `passwordi2ea`, porque o `1` e o `3` do sufixo virariam letras; o sufixo deixaria de ser removível e a raiz nunca casaria. É um detalhe que só aparece testando.

A segunda é o piso de quatro letras. Raízes curtas viram coringas: a entrada `abc123` canoniza para `abc` e passaria a barrar qualquer senha cuja raiz também fosse `abc`. Quatro letras é onde a raiz ainda descreve uma palavra, e não um prefixo qualquer.

A normalização também não é uma heurística inventada, porque ela espelha a técnica de ataque. Ninguém joga uma wordlist crua contra um hash: o hashcat e o John recebem a lista junto com um conjunto de regras de mutação (`best64.rule`, `OneRuleToRuleThemAll`), e essas regras fazem exatamente o que a `canonizar()` faz, só que no sentido contrário: pegam `iloveyou` e geram `iloveyou1`, `iloveyou123`, `iloveyou!!!`, `1loveyou`, `iloveyou2024`. A `canonizar()` implementa o inverso do que o adversário já faz há décadas.

### Frontend alinhado ao backend

Os schemas `register.schema.ts` e `perfil.schema.ts` continuavam com a política antiga, e como os dois componentes validam antes de enviar, o efeito era duplo e contraditório: uma passphrase de 26 caracteres, escrita só com letras minúsculas e espaços, era barrada pela interface por não ter maiúscula, número nem símbolo, enquanto uma senha de 5 caracteres passava na tela e só tomava 400 do servidor. A política nova estava implementada no backend e inacessível pela interface, que recusava exatamente o tipo de senha que a política queria incentivar.

A correção foi extrair a regra para um arquivo único, importado pelos dois schemas. O arquivo único é intencional, já que foi a duplicação que deixou as duas telas divergirem do backend.

| senha | antes | agora |
|---|---|---|
| passphrase de 26 chars, só minúsculas e espaços | bloqueada pela UI | passa |
| `Abc1!` | passava e tomava 400 | "mínimo 15 caracteres" |
| 65 caracteres | passava e tomava 400 | "máximo 64 caracteres" |

Na tabela, e no resto do writeup, descrevo o formato das passphrases boas em vez de imprimir uma, pelo mesmo motivo discutido na seção sobre o aviso na tela: uma passphrase publicada aqui como exemplo de senha forte viraria candidato de dicionário, e este documento também é público. As únicas senhas completas que aparecem no texto são senhas fracas ou senhas que já estão bloqueadas.

Vale registrar o que essa validação não é: ela é feedback antecipado, não fronteira de segurança. A blocklist e o bloqueio contextual rodam só no backend, de propósito. Mandar a lista de 10 mil entradas para o browser seria entregar material ao atacante e não impediria nada, já que ele fala direto com a API.

### Teto em bytes

O comentário no controller afirmava que o `max(64)` existia "para evitar o truncamento silencioso do bcrypt (72 bytes)". A afirmação era falsa: o código documentava uma proteção que não tinha. O `max(64)` conta caracteres, o bcrypt corta em bytes, e em UTF-8 um `ç` ocupa 2 bytes e um emoji até 4.

Mantive o `max(64)` de caracteres, porque ele dá a mensagem clara no caso ASCII, que é a maioria, e acrescentei um `refine` que mede bytes:

```typescript
// backend — auth.controller.ts
// O bcrypt ignora tudo que passa de 72 BYTES, sem avisar. O limite de 64
// caracteres não garante isso: em UTF-8 um "ç" ocupa 2 bytes e um emoji até 4,
// então 64 caracteres acentuados dão 106+ bytes e o final da senha é descartado
// em silêncio: duas senhas diferentes com os mesmos 72 primeiros bytes passam
// a abrir a mesma conta. Por isso o teto real é medido em bytes, não em chars.
const LIMITE_BYTES_BCRYPT = 72

const cabeNoBcrypt = (senha: string) =>
  new TextEncoder().encode(senha).length <= LIMITE_BYTES_BCRYPT

// Política de senha alinhada ao NIST SP 800-63B-4 (seção 3.1.1.2):
// prioriza comprimento sobre complexidade. Sem regras de composição
// obrigatória (proibidas pelo padrão: "SHALL NOT impose other composition
// rules"). A blocklist de senhas comuns e a checagem contextual ficam no
// service, pois exigem contexto (a lista carregada, o username e o email).
const passwordRules = z.string()
  .min(15, 'A senha deve ter no mínimo 15 caracteres')
  .max(64, 'A senha deve ter no máximo 64 caracteres')
  .refine(cabeNoBcrypt, 'A senha é longa demais. Acentos e emojis ocupam espaço extra. Use menos caracteres.')
```

Usei `TextEncoder` porque ele existe igual no Node e no browser, então a mesma função roda nos dois lados sem depender de API específica de plataforma.

Existe uma alternativa que elimina o limite dos 72 bytes de vez: o pré-hash, em que a senha passa por uma função SHA antes de chegar ao bcrypt (o Dropbox, por exemplo, usa SHA-512), de modo que qualquer comprimento cabe. Não a adotei porque isso mudaria o formato dos hashes já gravados e exigiria versionamento do esquema de senha, o que é desproporcional para um projeto deste tamanho. Aqui, rejeitar a senha que não cabe resolve o problema com menos risco. O custo dessa escolha é que, em senhas acentuadas, o limite efetivo fica abaixo de 64 caracteres, enquanto a mesma seção do NIST recomenda permitir pelo menos 64 ("SHOULD permit a maximum password length of at least 64 characters"); o pré-hash resolveria isso também.

### Rate limit no oráculo de senha

Havia uma inconsistência na malha de limitadores: `/register` e `/login` tinham o `authLimiter` (5 por 15 minutos), `PATCH /me` tinha o `profileLimiter` (3 por hora), e os dois endpoints que rodam `bcrypt.compare` contra a senha do usuário não tinham nada.

```typescript
// backend — rateLimit.middleware.ts
// Limite ESTRITO para as ações que exigem confirmar a senha ATUAL
// (trocar senha e excluir conta).
// Objetivo: esses endpoints rodam bcrypt.compare contra a senha do usuário, ou
// seja, respondem "essa senha está certa?". São um oráculo de senha para quem
// já tem a sessão (cookie roubado via XSS, máquina compartilhada, sessão
// esquecida aberta). Sem limite, dá para forçar a senha atual à vontade por
// trás do authMiddleware. Trocar senha e excluir conta são ações raras, então
// 5 tentativas por hora não incomodam o uso legítimo.
export const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
})

// backend — auth.routes.ts
// As duas rotas abaixo conferem a senha atual com bcrypt.compare, então
// compartilham o mesmo limitador: as tentativas somam entre elas, senão daria
// para alternar entre os dois endpoints e dobrar o orçamento de chutes.
router.patch('/me/password', authMiddleware, passwordLimiter, (req, res) => authController.changePassword(req, res))
router.delete('/me', authMiddleware, passwordLimiter, (req, res) => authController.deleteAccount(req, res))
```

A decisão que merece destaque é o uso da mesma instância nas duas rotas. O `express-rate-limit` guarda o contador por instância, então compartilhá-la faz as tentativas somarem. Com limitadores separados, o atacante alternaria entre `PATCH /me/password` e `DELETE /me` e dobraria o orçamento de chutes. O bloco 3 do [`04-bcrypt-e-oraculo.ts`](pocs/04-bcrypt-e-oraculo.ts) sobe um Express com a mesma instância do `passwordLimiter` nas duas rotas e alterna entre elas. Os handlers só respondem 200 e o `authMiddleware` fica de fora, porque o que está sob teste é o limitador:

```
3. passwordLimiter compartilhado entre as duas rotas
 1. PATCH  /auth/me/password  -> 200  RateLimit-Remaining: 4
 2. DELETE /auth/me           -> 200  RateLimit-Remaining: 3
 3. PATCH  /auth/me/password  -> 200  RateLimit-Remaining: 2
 4. DELETE /auth/me           -> 200  RateLimit-Remaining: 1
 5. PATCH  /auth/me/password  -> 200  RateLimit-Remaining: 0
 6. DELETE /auth/me           -> 429  RateLimit-Remaining: 0  (bloqueado)
 7. PATCH  /auth/me/password  -> 429  RateLimit-Remaining: 0  (bloqueado)
 8. DELETE /auth/me           -> 429  RateLimit-Remaining: 0  (bloqueado)
```

O `RateLimit-Remaining` cai a cada requisição, qualquer que seja a rota, e o `429` aparece na sexta, em um endpoint diferente do que consumiu a maioria das tentativas. É isso que prova o orçamento compartilhado. Escolhi 5 por hora, e não 5 por 15 minutos como o `authLimiter`, pelo mesmo raciocínio do `profileLimiter` do writeup 03: trocar senha e excluir conta são ações raras e deliberadas.

### A troca de senha precisa trocar a senha

O `changePassword` conferia a senha atual, validava a nova contra a blocklist e gravava, sem nunca verificar se as duas eram a mesma. Mandar `currentPassword` e `newPassword` idênticas devolvia `200 {"success":true}`.

O motivo mais comum para alguém trocar de senha é achar que ela vazou, e o `200` diz que a troca foi feita. Quem digitou a mesma senha nos dois campos, por engano ou porque o gerenciador preencheu os dois, sai da tela acreditando que rotacionou uma credencial que continua exatamente onde estava. O dano não está no estado do banco, e sim na crença falsa que a resposta de sucesso produz.

```typescript
// backend — auth.service.ts (changePassword)
// A senha nova precisa ser de fato nova: sem isso, a troca de senha aceita
// repetir a senha atual e devolve 200. O usuário que trocou a senha porque
// desconfiou de vazamento sai da tela achando que rotacionou a credencial
// sem ter rotacionado nada.
// A comparação é contra o HASH, não contra a currentPassword em texto puro,
// porque o bcrypt só lê os 72 primeiros bytes: uma senha antiga longa (de
// antes do teto em bytes) e uma nova que só difere depois do byte 72 seriam
// strings diferentes e a MESMA senha para o verificador. Quem responde
// "mudou?" é o mesmo componente que vai autenticar depois.
const senhaRepetida = await bcrypt.compare(newPassword, user.password)
if (senhaRepetida) {
  throw new Error('A nova senha deve ser diferente da senha atual')
}
```

Essa escolha é o achado do truncamento aparecendo de novo, agora como critério de projeto. Ela custa um `bcrypt.compare` a mais, cerca de 54 ms, em uma operação rara que já está atrás de um limitador de 5 por hora.

### Contexto: email e nome do site

O bloqueio contextual olhava só o username, com `includes` literal. O NIST pede "context-specific words" e cita o nome do serviço ao lado do username, e o local-part do email é tão previsível quanto o username, porque em geral é o mesmo texto.

| contexto | de onde sai | exemplo barrado |
|---|---|---|
| username | o cadastro | `joaosilva minha senha` |
| username mutado | a raiz canonizada | `J0a0Silva do bairro!!` |
| local-part inteiro | `joao.silva+news@…` | `joao.silva senha boa` |
| pedaços do local-part | split em `. - _ +` | `a senha do silva aqui`, `news da manha bem cedo` |
| nome do serviço | lista fixa | `imageboard do trabalho`, `senha do chan de novo` |

A comparação roda duas vezes, contra a senha literal e contra a raiz canonizada. Reusar a `canonizar()` aqui não tem custo adicional: quem escreve `J0a0Silva2026` está aplicando ao próprio username exatamente as mutações que a função já sabe desfazer.

A segunda decisão foi a que exigiu mais calibragem: termo curto exige fronteira de não-letra. `chan` como substring solta barraria `chance`, `chantagem` e `manchando`, que são palavras legítimas em português. A regra ficou assim: termo com 6 ou mais letras casa em qualquer posição, e termo menor precisa estar cercado por não-letra. Dessa forma `4chan` e `chan` sozinho são pegos, e `chance` passa.

```typescript
// backend — passwordBlocklist.ts
// A partir deste tamanho o termo casa em qualquer posição da senha. Abaixo dele
// exige fronteira de não-letra: "chan" sozinho ou em "4chan" é contexto do site,
// "chan" dentro de "chance" ou "manchando" é coincidência de sílaba. Barrar
// passphrase legítima é o jeito mais rápido de empurrar o usuário de volta para
// a senha curta que a política inteira está tentando evitar.
const TAMANHO_SUBSTRING_LIVRE = 6

const escaparRegex = (termo: string) => termo.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

function casa(texto: string, termo: string): boolean {
  if (termo.length >= TAMANHO_SUBSTRING_LIVRE) {
    return texto.includes(termo)
  }
  return new RegExp(`(^|[^a-z])${escaparRegex(termo)}([^a-z]|$)`).test(texto)
}
```

O domínio do email ficou de fora de propósito: `gmail` é compartilhado por meio mundo e não é contexto de ninguém em particular.

### Build idempotente

O script de build era `cp -r src/data dist/data`, e o `cp` se comporta de dois jeitos conforme o destino existir ou não: se `dist/data` não existe, ele cria a cópia corretamente; se já existe, ele copia para dentro, gerando `dist/data/data/`. Como o `tsc` não limpa o `dist/`, o primeiro build funcionava e todos os seguintes não.

O agravante é o modo de falha: não há erro, o build passa verde e a aplicação sobe funcionando, porque o arquivo antigo continua lá desde o primeiro build. Uma atualização de 5.000 senhas na blocklist passaria pelo deploy sem nenhum alerta, e a produção seguiria validando contra a lista original. Um controle que para de receber atualizações sem avisar é pior que um controle ausente, porque continua transmitindo uma segurança que não entrega.

```json
"build": "tsc && mkdir -p dist/data && cp -r src/data/. dist/data/"
```

O `mkdir -p` garante que o destino existe e não reclama se já existir, e o `/.` no final da origem significa "o conteúdo de `src/data`" em vez de "o diretório `src/data`". Com isso o comando fica idempotente. Verifiquei com três builds seguidos, o terceiro com o arquivo alterado, para confirmar que a mudança chega ao artefato.

### O aviso na tela, e o problema que ele criou

O formulário de perfil mostrava, embaixo do campo de nova senha: "Mínimo 5 caracteres, com 1 maiúscula, 1 número e 1 caractere especial." A tela ensinava a política antiga, a mesma que o backend já tinha abandonado, e um usuário que seguisse o texto tomaria 400. O formulário de cadastro não tinha aviso nenhum, e o mínimo de 15 só aparecia na mensagem de erro.

A correção foi uma constante exportada do mesmo arquivo que guarda a regra, usada nas duas telas e ligada ao input por `aria-describedby`. Ela fica junto da regra pelo mesmo motivo que a regra virou arquivo único: um aviso que diverge da validação é pior que aviso nenhum, e o texto velho do perfil é a prova disso, porque sobreviveu à troca de política justamente por estar longe dela.

A primeira versão desse aviso trazia um exemplo de passphrase boa, para dar permissão explícita ao usuário: sem isso ele lê "mínimo 15" e produz `Senha@123456789`, que é exatamente a mutação previsível que a política queria eliminar. Depois de pronta, essa correção foi questionada com uma objeção pertinente: o NIST não proíbe hint de senha, justamente para não ajudar a montar wordlist?

A objeção confunde duas coisas diferentes que têm o mesmo nome, e a §3.1.1.2 trata das duas na mesma seção:

> "Verifiers and CSPs **SHALL NOT** permit the subscriber to store a hint (e.g., a reminder of how the password was created) that is accessible to an unauthenticated claimant."

> "Verifiers **SHALL** offer guidance to the subscriber to help the subscriber choose a strong password. This is particularly important following the rejection of a password on the blocklist as it discourages trivial modifications of listed weak passwords."

O proibido é o hint por usuário: o lembrete que o próprio dono escreve, guardado na conta e exibido para quem ainda não se autenticou, que vaza informação sobre uma senha específica. O que está na tela é o texto da política, igual para todo mundo, e ele é `SHALL`. Por isso a constante se chama `TEXTO_POLITICA_SENHA`, e não `PASSWORD_HINT`, que convidaria à mesma confusão.

Divulgar a política também não ajuda o atacante, por dois motivos. Primeiro, ela já é pública pela própria API: uma requisição no `/register` com senha curta devolve a regra na mensagem de erro. O NIST vai na mesma direção quando exige que a recusa pela blocklist venha com o motivo ("SHALL provide the reason for rejection"). Segundo, o efeito é o inverso do que a intuição sugere: saber que o mínimo é 15 não estrutura a busca, e sim poda a lista do atacante. É o número do achado central lido do outro lado, já que 9.982 das 10.000 entradas ele não consegue nem digitar.

A objeção só se aplica a outro tipo de política: "exatamente 8, 1 maiúscula, 1 número, 1 símbolo" entrega o formato `Xxxxxx9!` pronto e reduz o espaço de busca de verdade. Política de composição divulgada ajuda o atacante, política de comprimento divulgada atrapalha, e a política antiga deste projeto estava do lado errado dessa linha.

Ainda assim, a objeção expôs um problema real, só que em outro lugar: não no texto da política, e sim no exemplo concreto dentro dele. Um exemplo de senha é impresso para todo usuário e lido por todo atacante, e sempre há quem digite exatamente o que apareceu na tela. Isso não é a política vazando, é um candidato de senha distribuído pela própria aplicação.

A primeira resposta foi colocar as frases de exemplo na blocklist, pelo mesmo caminho das outras entradas, o que faz as variações decoradas caírem na checagem por raiz:

```
BLOQUEADA  correta cavalo bateria grampo      (a frase canônica do XKCD)
BLOQUEADA  cavalo bateria grampo azul
BLOQUEADA  Cavalo Bateria Grampo Azul2026
BLOQUEADA  cavalo bateria grampo azul!!!!
```

Funciona, mas cria um acoplamento: bloquear obriga a lembrar de bloquear. Se alguém trocar o exemplo da tela, a entrada da blocklist vira órfã em silêncio e o exemplo novo passa a ser aceito. É o mesmo tipo de acoplamento frágil descrito duas seções acima, no build.

A alternativa seguinte, remover o aviso inteiro, seria pior. Ela descartaria justamente o trecho que faz o trabalho de segurança: quem lê "mínimo de 15 caracteres" sem mais nada produz `Senha@123456789`, esticando a mutação previsível até bater o número. É o modo de falha descrito no início deste writeup, e é o motivo declarado pelo NIST para exigir orientação: "as it discourages trivial modifications of listed weak passwords".

A solução foi separar as partes do aviso:

| parte do aviso | o que faz | veredito |
|---|---|---|
| a permissão ("não exigimos maiúscula, número ou símbolo") | impede a mutação previsível; é o `SHALL` da norma | fica |
| o formato ("uma frase com quatro ou cinco palavras") | ensina o que fazer, sem entregar string | fica |
| o exemplar concreto | candidato de dicionário publicado pela própria aplicação | sai |

O valor pedagógico estava na permissão, e não na string. Descrever o formato entrega o benefício inteiro sem o risco, e não sobra nada para colocar na blocklist, porque não há candidato:

```typescript
// frontend — password.schema.ts
// A orientação descreve o FORMATO e não imprime um exemplar. A permissão
// explícita ("não exigimos maiúscula, número ou símbolo") é o que faz o trabalho
// de segurança: sem ela o usuário lê "mínimo 15" e produz "Senha@123456789",
// esticando a mutação previsível que a política inteira quer eliminar — que é o
// motivo declarado pelo NIST para exigir orientação ("...as it discourages
// trivial modifications of listed weak passwords").
// Já um EXEMPLO concreto de senha é lido pelo atacante junto com o usuário, e
// sempre tem quem digite exatamente o que viu: vira candidato de dicionário
// distribuído pela própria aplicação. As duas coisas são separáveis, e o valor
// está na permissão, não na string. Por isso: descreva a frase, não a escreva.
export const TEXTO_POLITICA_SENHA =
    "Mínimo de 15 caracteres. Não exigimos maiúscula, número ou símbolo: uma frase com quatro ou cinco palavras é mais forte e mais fácil de lembrar do que uma senha curta e complicada.";
```

Dizer "quatro ou cinco palavras" não estrutura a busca. Passphrase de quatro palavras é a recomendação padrão do NIST, do XKCD e de qualquer gerenciador de senhas, então o atacante já parte dessa premissa, e quatro palavras sorteadas passam de 2^50 mesmo com ele sabendo o formato exato. Continua valendo a mesma linha divisória: comprimento divulgado atrapalha o atacante, composição divulgada ajuda.

As entradas continuam na blocklist por dois motivos que independem da tela: a frase do XKCD é conhecida no mundo inteiro e merece estar em qualquer blocklist por mérito próprio, e as frases seguem impressas neste writeup, que também é público. A regra geral é que toda senha que a aplicação ou a documentação mostra deixa de ser uma senha possível no instante em que é publicada, o que vale para o exemplo do placeholder, para a senha de demonstração em um README e para a senha do seed.

Em resumo: a orientação é obrigatória pela norma, o exemplo é opcional, e só o exemplo traz risco.

## Vetores residuais

As correções fecharam o que era explorável, mas não eliminaram a categoria. O que sobrou está registrado aqui porque foi decisão de escopo ou limite de projeto, e não descuido.

O primeiro resíduo é que o bloqueio contextual pode ser contornado pela ordem das operações, e não tem correção limpa. Basta cadastrar com a senha `estrada de terra molhada`, que passa porque nenhum contexto bate, e depois trocar o username para `estrada` via `PATCH /auth/me`. O `updateProfile` nunca toca na senha, e a correção óbvia não existe: no momento da troca de username a aplicação só tem o hash, e perguntar se a senha contém a string `estrada` não é algo que se responda contra um hash, diferente de perguntar se esta é a senha, que é o que o `bcrypt.compare` responde. O princípio por trás é que um controle contextual só é executável no instante em que o segredo está em texto puro, e depois disso o contexto pode mudar sem que o controle tenha como reagir. A única correção real seria exigir a senha atual para trocar username e email, como já acontece na troca de senha e na exclusão de conta, e isso é decisão de produto, não conserto de bug. O `profileLimiter` de 3 por hora atrasa, mas não impede.

O segundo é que nada impede que alguém volte a publicar um exemplo de senha na interface. Enquanto o exemplo existia, ele estava duplicado em dois lugares, a string no frontend e a entrada na blocklist do backend, e trocar um sem lembrar do outro deixaria a entrada órfã em silêncio. Tirar o exemplo da tela eliminou a duplicação, mas não criou nenhum mecanismo que impeça a reintrodução: é uma convenção documentada, não uma invariante verificada. Um teste que falhasse se o texto da política contivesse uma senha aceita pelo backend fecharia isso, e é o que eu faria se o projeto crescesse.

O terceiro é o viés de idioma da lista. A cobertura de português é parcial: há `senha`, `amor`, `brasil`, `flamengo`, `saopaulo` e `familia`, mas não há `futebol`, `gremio`, `deus` nem `corinthians`. Com a procedência confirmada dá para explicar o motivo: a lista é o topo por frequência de uma compilação global de vazamentos, então ela não é anglófona por descuido, e sim global por frequência. Cada idioma aparece na proporção da massa que tem naquele corpus, e o português brasileiro não tem massa suficiente. Para um imageboard brasileiro isso é uma limitação real, e a normalização amplia o alcance de uma lista cujo viés continua sendo o da origem.

O quarto é que a normalização só cobre as mutações que eu modelei: pontas decorativas, leet comum e repetição. `il0v3y0u#x7q` escaparia, porque o símbolo no meio não se encaixa em nenhuma das três. É uma elevação de piso, e não uma solução completa.

O quinto é que as senhas legadas continuam válidas. Quem se cadastrou sob a política de 5 caracteres não é forçado a trocar, e o login não revalida. Isso é intencional e está alinhado à norma, que é contra a rotação forçada: "Verifiers and CSPs **SHALL NOT** require subscribers to change passwords periodically." A política protege o futuro, não o passado, e por isso as contas antigas seguem sendo o alvo mais barato do sistema.

O sexto é que o seed do admin escapa da política inteira. A variável `SEED_ADMIN_PASSWORD` vai direto para o `bcrypt.hash`, sem passar pelo Zod nem pela blocklist, e a conta de maior privilégio do sistema acaba sendo a única isenta das regras, o inverso do que faria sentido. Não corrigi no código porque a solução operacional é trocar o valor no `.env` por uma passphrase que passaria na política.

O sétimo é que o rate limit conta por IP, e não por conta. Vale aqui a mesma ressalva dos writeups 01 e 03: quem rotaciona origens dilui o limite. No caso do `passwordLimiter` o cenário é ainda mais favorável ao atacante, porque ele já está autenticado e trocar de IP não lhe custa nada. Fechar isso exigiria um `keyGenerator` com o id do usuário do token, que está disponível porque as duas rotas ficam atrás do `authMiddleware`.

Por fim, o termo contextual curto só casa com fronteira de não-letra: `4chan` é pego, `meuchan123` escapa. É o preço de não barrar `chance` e `manchando`, e prefiro errar para esse lado. O mesmo termo curto cobra um preço do outro lado, e ele está medido: na varredura de 2 milhões, 3 senhas de gerenciador foram recusadas por acaso, algo da ordem de uma a cada algumas centenas de milhares, quando o gerador produz algo que canoniza para `chan` entre não-letras. Quem receber essa recusa vai clicar em "gerar de novo" sem entender o motivo, e a mensagem de erro não ajuda, porque fala em "nome do site" para uma senha que não tem nada a ver com o site.

## Referências

- [NIST SP 800-63B-4 — Digital Identity Guidelines, §3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Top 10 — A07:2021 Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [Dropbox — How Dropbox securely stores your passwords](https://dropbox.tech/security/how-dropbox-securely-stores-your-passwords), o pré-hash com SHA-512 antes do bcrypt
- [SecLists — `Passwords/Common-Credentials/Pwdb_top-10000.txt`](https://github.com/danielmiessler/SecLists) (licença MIT), a wordlist usada na blocklist
- [Pwdb-Public](https://github.com/ignis-sec/Pwdb-Public), a origem a montante da wordlist e a fonte das estatísticas do corpus
