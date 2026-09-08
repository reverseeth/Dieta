# Dieta — Gustavo Cota

Plano alimentar diário como página estática, no mesmo sistema de design do
site da RVSE (Geist / Geist Mono, preto puro + neutros QOVES, easing expo).

**Live:** https://reverseeth.github.io/Dieta/

## O que a página faz

- Marca refeições do dia (e creatina); os totais de kcal e macros animam.
- Tudo zera automaticamente à meia-noite; estado fica no `localStorage` do navegador.
- "Próxima refeição" segue o relógio; o card da vez acende um véu em gradiente.
- O véu segue a luz do dia: dourado no amanhecer (5–10h), slate-ciano no meio
  do dia (10–15h), pêssego à tarde (15–18h), rosa no crepúsculo (18–21h) e
  lavanda à noite.
- Lista de compras com checks persistentes e tema claro/escuro.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Conteúdo — refeições, quantidades e macros estão aqui (data-attributes nos cards) |
| `styles.css` | Design system (tokens no `:root`; tema escuro em `html[data-theme="dark"]`) |
| `main.js` | Estado, reset diário, animações |

Sem build, sem dependências. Para editar uma refeição, mude o card em
`index.html` (os `data-kcal/p/c/g` alimentam os totais). `python3 -m http.server`
para testar; push na `main` republica.
