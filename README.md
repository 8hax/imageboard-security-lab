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
| 01 | Ausência de rate limiting (brute force) | A07:2021 – Identification and Authentication Failures | Alta | Em andamento | [ver](docs/writeups/01-rate-limiting.md) |
| 02 | Ausência de security headers | A05:2021 – Security Misconfiguration | Média | Em andamento | [ver](docs/writeups/02-security-headers.md) |
| 03 | Enumeração de usuários | A07:2021 – Identification and Authentication Failures | Média | Em andamento | [ver](docs/writeups/03-user-enumeration.md) |
| 04 | Política de senha fraca | A07:2021 – Identification and Authentication Failures | Média | Em andamento | [ver](docs/writeups/04-password-policy.md) |
| 05 | `imageUrl` sem validação (XSS / SSRF) | A03:2021 – Injection | Alta | Em andamento | [ver](docs/writeups/05-imageurl-xss-ssrf.md) |
| 06 | CSRF e hardening de cookie | A01:2021 – Broken Access Control | Média | Em andamento | [ver](docs/writeups/06-csrf-cookie-hardening.md) |

## Boas práticas já presentes na aplicação

Parte da análise consiste em reconhecer o que já estava implementado corretamente, não
apenas apontar falhas:

<!-- A preencher. Exemplos a validar e descrever:
     - React escapa a saída por padrão, mitigando XSS no conteúdo dos posts
     - mensagem de erro genérica no login (evita enumeração pela via de autenticação)
     - autorização de exclusão de posts validada no backend
     - senhas armazenadas com hash bcrypt
     - anonimização dos dados ao excluir a conta -->

- ...

## A aplicação base

Stack:

- Backend: Node.js, TypeScript, Express, Prisma ORM, SQLite, JWT em cookie httpOnly
- Frontend: Next.js, React, TypeScript
- Integração: Google Gemini API

<!-- Resumo de 2-3 frases sobre o que a aplicação faz.
     Pode ser reaproveitado de README-projeto-original.md. -->

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
