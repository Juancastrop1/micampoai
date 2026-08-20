-- Fincas (una cuenta puede tener varias fincas)
create table fincas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  ubicacion text,
  created_at timestamp with time zone default now()
);

-- Lotes
create table lotes (
  id uuid default gen_random_uuid() primary key,
  finca_id uuid references fincas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- Animales
create table animales (
  id uuid default gen_random_uuid() primary key,
  finca_id uuid references fincas(id) on delete cascade,
  lote_id uuid references lotes(id),
  codigo text not null,
  nombre text,
  raza text,
  sexo text check (sexo in ('macho', 'hembra')),
  fecha_nacimiento date,
  proposito text check (proposito in ('leche', 'carne', 'doble_proposito')),
  estado text check (estado in ('activo', 'vendido', 'muerto')) default 'activo',
  peso_actual numeric,
  notas text,
  created_at timestamp with time zone default now()
);

-- Registro de leche
create table registro_leche (
  id uuid default gen_random_uuid() primary key,
  finca_id uuid references fincas(id) on delete cascade,
  animal_id uuid references animales(id),
  lote_id uuid references lotes(id),
  fecha date not null,
  litros numeric not null,
  precio_litro numeric,
  created_at timestamp with time zone default now()
);

-- Eventos por animal
create table eventos_animal (
  id uuid default gen_random_uuid() primary key,
  animal_id uuid references animales(id) on delete cascade,
  tipo text check (tipo in ('vacuna', 'tratamiento', 'parto', 'servicio', 'pesaje', 'otro')),
  descripcion text not null,
  fecha date not null,
  costo numeric,
  proxima_fecha date,
  created_at timestamp with time zone default now()
);

-- Ventas de animales
create table ventas_animales (
  id uuid default gen_random_uuid() primary key,
  animal_id uuid references animales(id),
  finca_id uuid references fincas(id),
  fecha date not null,
  precio numeric not null,
  comprador text,
  peso_venta numeric,
  notas text,
  created_at timestamp with time zone default now()
);

-- Precio del litro de leche (configurable por finca)
create table config_finca (
  id uuid default gen_random_uuid() primary key,
  finca_id uuid references fincas(id) on delete cascade unique,
  precio_litro_leche numeric default 0,
  moneda text default 'COP',
  updated_at timestamp with time zone default now()
);

-- RLS policies
alter table fincas enable row level security;
alter table lotes enable row level security;
alter table animales enable row level security;
alter table registro_leche enable row level security;
alter table eventos_animal enable row level security;
alter table ventas_animales enable row level security;
alter table config_finca enable row level security;

create policy "usuarios ven sus fincas" on fincas for all using (auth.uid() = user_id);
create policy "usuarios ven sus lotes" on lotes for all using (finca_id in (select id from fincas where user_id = auth.uid()));
create policy "usuarios ven sus animales" on animales for all using (finca_id in (select id from fincas where user_id = auth.uid()));
create policy "usuarios ven su leche" on registro_leche for all using (finca_id in (select id from fincas where user_id = auth.uid()));
create policy "usuarios ven eventos" on eventos_animal for all using (animal_id in (select id from animales where finca_id in (select id from fincas where user_id = auth.uid())));
create policy "usuarios ven ventas" on ventas_animales for all using (finca_id in (select id from fincas where user_id = auth.uid()));
create policy "usuarios ven config" on config_finca for all using (finca_id in (select id from fincas where user_id = auth.uid()));
