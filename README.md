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
- **Folha do mês**: horas calculadas + ajuste, salário DP, bolsa estágio, valor aulas,
  transporte, extras, serviços, adiantamento (desconto), total a pagar e status de pagamento.
  Botão que gera o texto com **nome e total de horas dos horistas** para colar no e-mail ao DP.
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

## 5. Deploy no VPS HostGator (via SSH)

Pré-requisito: Node.js 20+ no servidor (`node -v`). Se precisar, instale via
[nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash`
e depois `nvm install 22`.

```bash
# 1. conectar
ssh usuario@seu-servidor

# 2. clonar e instalar
git clone <url-do-seu-repositorio> pagtos_ap
cd pagtos_ap
npm ci

# 3. criar o .env no servidor
nano .env   # cole SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e APP_PASSWORD

# 4. build e iniciar com pm2 (mantém o app no ar e reinicia se cair)
npm run build
npm install -g pm2
pm2 start npm --name pagtos-ap -- start
pm2 save
pm2 startup   # siga a instrução exibida para iniciar junto com o servidor
```

O app sobe na porta **3000**. Para acessar por um domínio (porta 80/443), crie um proxy no
Apache/Nginx do VPS apontando para `http://127.0.0.1:3000` — no cPanel/WHM da HostGator isso
pode ser feito com um "reverse proxy" no domínio desejado. Alternativa rápida: liberar a porta
3000 no firewall e acessar `http://seu-ip:3000`.

Para atualizar depois de novos commits:

```bash
cd pagtos_ap && git pull && npm ci && npm run build && pm2 restart pagtos-ap
```

## Estrutura

- `src/app/*` — telas (folha, aulas, importar, colaboradores, atividades, login)
- `src/app/api/*` — APIs (CRUD, importação, cálculo da folha)
- `src/lib/parseEspelho.ts` — parser do PDF do espelho (SCI VISUAL Practice)
- `src/lib/parseAulas.ts` — parser do XLSX de aulas
- `src/lib/calc.ts` — horas do mês, bonificação, competência
- `supabase/schema.sql` — criação das tabelas
