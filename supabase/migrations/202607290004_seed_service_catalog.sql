-- Seed megcredit_service_catalog with the initial service list from the pricing sheet.
-- Standard = one-time price. Premium = financed (recurring) price, same service.
-- Guarded with "where not exists" so re-running this migration is a no-op.

insert into public.megcredit_service_catalog (name, description, default_price_cents)
select v.name, v.description, v.price_cents
from (
  values
    ('Hard Inquiries (Standard)', 'Disputa de consultas (hard inquiries) — plan estándar, pago único.', 12500),
    ('Hard Inquiries (Premium - Financiado)', 'Disputa de consultas (hard inquiries) — plan premium financiado.', 20000),
    ('Collections (Standard)', 'Disputa de cuentas en cobranza — plan estándar, pago único.', 120000),
    ('Collections (Premium - Financiado)', 'Disputa de cuentas en cobranza — plan premium financiado.', 200000),
    ('Charge Off (Standard)', 'Disputa de cuentas dadas de baja (charge off) — plan estándar, pago único.', 120000),
    ('Charge Off (Premium - Financiado)', 'Disputa de cuentas dadas de baja (charge off) — plan premium financiado.', 200000),
    ('Repossessions (Standard)', 'Disputa de repossessions — plan estándar, pago único.', 200000),
    ('Repossessions (Premium - Financiado)', 'Disputa de repossessions — plan premium financiado.', 300000),
    ('Evictions (Standard)', 'Disputa de evicciones — plan estándar, pago único.', 200000),
    ('Evictions (Premium - Financiado)', 'Disputa de evicciones — plan premium financiado.', 300000),
    ('Bankruptcy (Standard)', 'Disputa de bancarrota — plan estándar, pago único.', 450000),
    ('Bankruptcy (Premium - Financiado)', 'Disputa de bancarrota — plan premium financiado.', 600000)
) as v(name, description, price_cents)
where not exists (
  select 1 from public.megcredit_service_catalog existing where existing.name = v.name
);
