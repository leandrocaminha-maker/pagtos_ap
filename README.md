# AP Academia · Pagamentos

Web app (Next.js + Supabase) para gerenciar a folha de pagamento dos colaboradores da AP Academia:
CLT mensalistas, CLT horistas, estagiários e autônomos/freelancers.

## Funcionalidades

- **Colaboradores**: cadastro com tipo de contrato (CLT/estágio, combinável com autônomo),
  vale transporte, bolsa por hora (estágio) e horas por dia da semana (horista/estágio).
  Cadastro automático a partir dos arquivos importados.
- **Atividades**: valor por sessão e regra de bonificação
  (presenças > N ⇒ bônus = (presenças − N) × valor por presença excedente).
- **Importar**: PDF do espelho de pagamento do DP (salário líquido dos CLT) e
  XLSX de aulas dos autônomos (Data, Hora, Atividade, Participantes, Professor).
- **Aulas**: abas por professor com todas as aulas do mês; células editáveis,
  inserir/excluir sessão, bonificação recalculada automaticamente.
  Botões para baixar em PDF as aulas do professor atual ou de todos (um por página).
- **Folha do mês**: horas calculadas + ajuste, salário DP, bolsa estágio, valor aulas,
  transporte, extras, serviços, adiantamento (desconto), total a pagar e status de pagamento.
  Botão que gera o texto com **nome e total de horas dos horistas** para colar no e-mail ao DP
  e botão para baixar a folha completa em PDF (paisagem, com totais por coluna).
- Dados preservados por competência (mês), armazenados no Supabase.

## 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e abra (ou crie) seu projeto.
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
4. Vá em **Project Settings → API** e copie:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - **service_role key** (em "Project API keys" — não é a anon!)

## 2. Configurar o app

```bash
# na pasta do projeto
copy .env.example .env
```

Edite o `.env`:

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
APP_PASSWORD=uma-senha-para-acessar-o-app
```

> `APP_PASSWORD` protege o app com uma tela de login (importante no servidor público).
> Se ficar vazio, o app abre sem senha (útil só em desenvolvimento).

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — fluxo sugerido no primeiro uso:

1. **Importar** → envie o PDF do espelho e o XLSX de aulas (confira a competência no topo).
2. **Atividades** → configure valor da sessão e bonificação das atividades criadas; reimporte o
   XLSX para aplicar os valores (ou edite direto na tela Aulas).
3. **Colaboradores** → complete os cadastros criados automaticamente (tipo de contrato,
   transporte, horas semanais, bolsa/hora).
4. **Folha do mês** → confira totais, lance extras/serviços/adiantamentos, copie as horas dos
   horistas para o DP e marque os pagamentos.

## 4. Subir para o git

```bash
git init
git add .
git commit -m "App de folha de pagamento AP Academia"
git remote add origin <url-do-seu-repositorio>
git push -u origin main
```

O `.env` está no `.gitignore` e **não** vai para o repositório (as chaves ficam só nas máquinas).

## 5. Produção (VPS)

O app já está instalado no servidor. Como o VPS hospeda outros sistemas, vale conhecer o mapa:

| Aplicação | Porta | Diretório | Domínio |
| --- | --- | --- | --- |
| `apacademia-site` | 3001 | `/var/www/site` | apacademia.com.br |
| `ap-academia` (aqua) | 3000 | `/var/www/aqua` | aqua.apacademia.com.br |
| `cron-worker` | — | `/var/www/aqua` | — |
| **`pagtos-ap`** (este app) | **3002** | **`/var/www/pagtos`** | pagtos.apacademia.com.br |

Todos rodam sob **pm2** (`pm2 list`) e o **nginx** faz o proxy reverso por subdomínio,
com certificados Let's Encrypt renovados automaticamente (`certbot-renew.timer`).
A porta vem da variável `PORT` do `.env` — **não use 3000 nem 3001**, já ocupadas.

### Atualizar o app depois de novos commits

```bash
ssh -p 22022 root@108.174.151.51
cd /var/www/pagtos && git pull && npm ci && npm run build && pm2 restart pagtos-ap
```

### Comandos úteis no servidor

```bash
pm2 list                        # o que está rodando
pm2 logs pagtos-ap --lines 50   # logs do app
pm2 restart pagtos-ap           # reiniciar
nginx -t && systemctl reload nginx   # validar e recarregar o nginx
```

### Instalar do zero em outro servidor

```bash
git clone https://github.com/leandrocaminha-maker/pagtos_ap.git /var/www/pagtos
cd /var/www/pagtos
npm ci
nano .env          # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_PASSWORD, PORT
chmod 600 .env     # o arquivo contém a chave de serviço do banco
npm run build
PORT=3002 pm2 start npm --name pagtos-ap -- start
pm2 save
pm2 startup        # siga a instrução exibida para subir junto com o servidor
```

Depois crie o server block do nginx apontando para `http://localhost:3002` e emita o
certificado com `certbot --nginx -d seu.dominio.com.br --redirect`.

## Estrutura

- `src/app/*` — telas (folha, aulas, importar, colaboradores, atividades, login)
- `src/app/api/*` — APIs (CRUD, importação, cálculo da folha)
- `src/lib/parseEspelho.ts` — parser do PDF do espelho (SCI VISUAL Practice)
- `src/lib/parseAulas.ts` — parser do XLSX de aulas
- `src/lib/calc.ts` — horas do mês, bonificação, competência
- `src/lib/pdf.ts` — geração dos PDFs da folha e das aulas (jsPDF, no navegador)
- `supabase/schema.sql` — criação das tabelas
