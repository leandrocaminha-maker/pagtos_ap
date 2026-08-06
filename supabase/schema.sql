-- =====================================================================
-- AP Academia - Folha de Pagamento
-- Cole este script no SQL Editor do Supabase e execute (Run).
-- =====================================================================

-- Colaboradores -------------------------------------------------------
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  -- clt_mensalista | clt_horista | estagio | nenhum (apenas autonomo)
  tipo_contrato text not null default 'nenhum'
    check (tipo_contrato in ('clt_mensalista', 'clt_horista', 'estagio', 'nenhum')),
  autonomo boolean not null default false,
  valor_transporte numeric(10,2) not null default 0,
  valor_bolsa_hora numeric(10,2) not null default 0,
  -- horas por dia da semana (CLT horista / estagio)
  horas_dom numeric(4,1) not null default 0,
  horas_seg numeric(4,1) not null default 0,
  horas_ter numeric(4,1) not null default 0,
  horas_qua numeric(4,1) not null default 0,
  horas_qui numeric(4,1) not null default 0,
  horas_sex numeric(4,1) not null default 0,
  horas_sab numeric(4,1) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Atividades (config de valor de sessao e bonificacao) ----------------
create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  valor_sessao numeric(10,2) not null default 0,
  tem_bonificacao boolean not null default false,
  bonus_min_presencas int not null default 0,   -- N: presencas acima disso geram bonus
  valor_bonus numeric(10,2) not null default 0, -- valor por presenca excedente
  created_at timestamptz not null default now()
);

-- Sessoes / aulas dadas por autonomos ---------------------------------
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  competencia text not null,                    -- 'AAAA-MM'
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  atividade_id uuid references atividades(id) on delete set null,
  data date,
  horario text,
  presencas int not null default 0,
  valor_sessao numeric(10,2) not null default 0,
  valor_bonificacao numeric(10,2) not null default 0,
  origem text not null default 'importacao',    -- importacao | manual
  created_at timestamptz not null default now()
);
create index if not exists sessoes_comp_colab_idx on sessoes (competencia, colaborador_id);

-- Salario liquido informado pelo DP (espelho de pagamento) ------------
create table if not exists salarios_dp (
  id uuid primary key default gen_random_uuid(),
  competencia text not null,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  salario_liquido numeric(10,2) not null default 0,
  unique (competencia, colaborador_id)
);

-- Lancamentos manuais da folha do mes ---------------------------------
create table if not exists folha_itens (
  id uuid primary key default gen_random_uuid(),
  competencia text not null,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  ajuste_horas numeric(6,1) not null default 0,
  valor_extras numeric(10,2) not null default 0,
  valor_servicos numeric(10,2) not null default 0,
  valor_adiantado numeric(10,2) not null default 0,
  status_pagamento text not null default 'pendente'
    check (status_pagamento in ('pendente', 'pago')),
  unique (competencia, colaborador_id)
);

-- Seguranca: RLS ligado sem policies => apenas a service_role key
-- (usada somente no servidor do app) consegue ler/escrever.
alter table colaboradores enable row level security;
alter table atividades enable row level security;
alter table sessoes enable row level security;
alter table salarios_dp enable row level security;
alter table folha_itens enable row level security;
