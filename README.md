# Imageboard Security Lab

Estudo prático de segurança de aplicações web (AppSec) sobre um imageboard fullstack
que desenvolvi. Para cada vulnerabilidade, o repositório documenta a exploração e a
respectiva correção — cobrindo tanto o lado ofensivo (como a falha é explorada) quanto
o defensivo (como é mitigada).

<!-- Quando houver deploy, adicionar o link da demo aqui. -->

## Sobre

O ponto de partida é uma aplicação funcional — um imageboard (fórum no estilo *chan*)
com autenticação, CRUD e integração com uma API externa. A proposta não é apresentar
uma aplicação livre de falhas desde o início, mas percorrer o ciclo de segurança
aplicada sobre um código real: estudar a vulnerabilidade, explorá-la, corrigi-la e
documentar o processo.

Cada item tratado possui um writeup em [`docs/writeups/`](docs/writeups/), com prova de
conceito, análise de impacto e a correção aplicada.

> As demonstrações de ataque foram executadas exclusivamente contra uma instância local
> e própria da aplicação. Testar sistemas de terceiros sem autorização por escrito é
> ilegal. Este material tem finalidade estritamente educacional.

## Vulnerabilidades analisadas

| # | Vulnerabilidade | Categoria (OWASP Top 10) | Severidade | Status | Writeup |
|---|-----------------|--------------------------|------------|--------|---------|
| 01 | Ausência de rate limiting (brute force) | A07:2021 – Identification and Authentication Failures | Alta | Corrigido | [ver](docs/writeups/01-rate-limiting.md) |
| 02 | Ausência de security headers | A05:2021 – Security Misconfiguration | Média | Corrigido | [ver](docs/writeups/02-security-headers.md) |
| 03 | Enumeração de usuários | A07:2021 – Identification and Authentication Failures | Média | Em andamento | [ver](docs/writeups/03-user-enumeration.md) |
| 04 | Política de senha fraca | A07:2021 – Identification and Authentication Failures | Média | Em andamento | [ver](docs/writeups/04-password-policy.md) |
| 05 | `imageUrl` sem validação (XSS / SSRF) | A03:2021 – Injection | Alta | Em andamento | [ver](docs/writeups/05-imageurl-xss-ssrf.md) |
| 06 | CSRF e hardening de cookie | A01:2021 – Broken Access Control | Média | Em andamento | [ver](docs/writeups/06-csrf-cookie-hardening.md) |

## Boas práticas já presentes na aplicação

Parte da análise consiste em reconhecer o que já estava implementado corretamente, não
apenas apontar falhas:

**Autenticação e sessão**

- **Senhas armazenadas com hash bcrypt** — nunca em texto puro; o hash é gerado no cadastro e na troca de senha, com fator de custo 10.
- **Comparação de senha em tempo constante** — o `bcrypt.compare` não faz curto-circuito no primeiro byte divergente, mitigando timing attacks na verificação da senha.
- **Mensagem genérica na via de login** — o login responde sempre `Dados inválidos`, sem distinguir email inexistente de senha errada, o que dificulta a enumeração de usuários por essa via. (A via de cadastro ainda revela contas existentes — tratada na vulnerabilidade #03.)
- **JWT em cookie `httpOnly`** — o token não fica acessível via `document.cookie`, o que impede seu roubo por JavaScript em caso de XSS. O cookie também usa `sameSite: 'lax'` e tem expiração alinhada ao `expiresIn` do JWT. (O hardening completo do cookie — flag `secure` e proteção CSRF — é tratado na vulnerabilidade #06.)
- **Reautenticação em operações sensíveis** — trocar a senha e excluir a conta exigem a senha atual como confirmação, reduzindo o impacto de uma sessão sequestrada.
- **Contas de bot bloqueadas no login** — usuários marcados como `isAI` não conseguem autenticar pela interface pública, seguindo a recomendação da OWASP de que contas de serviço não devem logar por vias destinadas a humanos.

**Autorização e controle de acesso**

- **Autorização de exclusão validada no backend** — a exclusão de um post confere no servidor se o solicitante é o autor ou um admin, sem confiar em qualquer verificação do frontend.
- **CORS restrito à origem conhecida** — as requisições com credenciais são aceitas apenas da origem do frontend, e não de qualquer origem (`*`).

**Tratamento de dados e entrada**

- **Validação de entrada com Zod** — todos os corpos das rotas de autenticação passam por schemas que validam tipo, formato e regras antes de chegar à lógica de negócio.
- **Hash da senha nunca exposto** — as consultas que retornam dados do usuário selecionam campos explicitamente, sem incluir o hash da senha na resposta.
- **Anonimização ao excluir a conta** — ao apagar um usuário, seus posts são reatribuídos a um placeholder `[deletado]` dentro de uma transação, preservando o histórico das threads sem manter dados pessoais.

## A aplicação base

Stack:

- Backend: Node.js, TypeScript, Express, Prisma ORM, SQLite, JWT em cookie httpOnly
- Frontend: Next.js, React, TypeScript
- Integração: Google Gemini API

É um imageboard fullstack no estilo *chan*, com um board único (**/tech/**) onde usuários
autenticados criam threads e posts sobre tecnologia, com respostas encadeadas (`>>id`) e
imagem opcional por post. O diferencial é a integração com o Google Gemini: bots de IA
participam das discussões automaticamente — de forma agendada ou disparada por um admin —,
controlados por um painel de administração. A autenticação usa JWT em cookie `httpOnly`, e
o conteúdo é imutável (append-only): posts e threads só podem ser criados, lidos e removidos.

## Metodologia

Cada vulnerabilidade seguiu quatro etapas:

1. Estudo da classe de vulnerabilidade a partir de fontes de referência (OWASP,
   PortSwigger Web Security Academy, NIST).
2. Reprodução da exploração em ambiente local, com prova de conceito.
3. Implementação e teste da correção.
4. Documentação do antes e depois em um writeup estruturado.

Cada writeup contém: classificação, descrição, código vulnerável, prova de conceito,
impacto, correção e referências.

## Como executar

As instruções completas estão em README-projeto-original.md. Em resumo, são dois
serviços independentes (backend na porta 3001, frontend na 3000), cada um iniciado
com `npm install` seguido de `npm run dev` no respectivo diretório.

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

## Autor

Boaz Duarte dos Passos Junior — [@8hax](https://github.com/8hax)

## Observação

A aplicação base foi originalmente desenvolvida como projeto acadêmico; a documentação
original está preservada em [`README-projeto-original.md`](README-projeto-original.md).
Este repositório é uma extensão com foco em segurança, para fins de estudo e portfólio.
