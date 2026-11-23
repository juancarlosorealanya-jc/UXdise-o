-- =====================================================
-- Heladería Dulce Frío - Base de datos para SUPABASE
-- Pégalo COMPLETO en Supabase → SQL Editor → Run
-- (Se puede ejecutar de nuevo: borra y recrea las tablas)
-- =====================================================

-- ---------- LIMPIEZA ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.pedido_items cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.productos cascade;
drop table if exists public.categorias cascade;
drop table if exists public.perfiles cascade;
drop function if exists public.crear_pedido(text,text,text,text,jsonb);
drop function if exists public.crear_pedido(text,text,text,text,jsonb,text,text,text);
drop policy if exists fotos_publicas on storage.objects;
drop policy if exists fotos_admin_subir on storage.objects;

-- ---------- TABLAS ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  email text not null default '',
  telefono text default '',
  rol text not null default 'cliente' check (rol in ('cliente','admin','vendedor')),
  creado timestamptz default now()
);
create table public.categorias (id serial primary key, nombre text not null, emoji text default '🍦');
create table public.productos (
  id serial primary key,
  nombre text not null,
  descripcion text default '',
  precio numeric(8,2) not null check (precio > 0),
  categoria_id int not null references public.categorias(id),
  emoji text default '🍦',
  imagen text default '',
  disponible boolean not null default true
);
create table public.pedidos (
  id serial primary key,
  cliente_id uuid references public.perfiles(id) on delete set null,
  vendedor_id uuid references public.perfiles(id) on delete set null,
  cliente_nombre text default '',
  documento text default '',
  email_boleta text default '',
  tipo text not null default 'domicilio' check (tipo in ('domicilio','tienda')),
  direccion text default '',
  pago text not null default 'efectivo' check (pago in ('efectivo','yape','tarjeta')),
  estado text not null default 'pendiente' check (estado in ('pendiente','preparando','en_camino','entregado')),
  origen text not null default 'web' check (origen in ('web','mostrador')),
  envio numeric(8,2) not null default 0,
  total numeric(8,2) not null default 0,
  creado timestamptz not null default now()
);
create table public.pedido_items (
  id serial primary key,
  pedido_id int not null references public.pedidos(id) on delete cascade,
  producto_id int references public.productos(id) on delete set null,
  nombre text not null,
  precio numeric(8,2) not null,
  cantidad int not null check (cantidad > 0),
  nota text default ''
);

-- ---------- FUNCIONES ----------
create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

-- Crea el perfil automáticamente cuando alguien se registra (siempre como cliente)
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, email, telefono)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre',''), coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'telefono',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.nuevo_usuario();

-- Crea el pedido y la boleta calculando los precios en el servidor (más seguro)
create or replace function public.crear_pedido(
  p_tipo text, p_direccion text, p_pago text, p_origen text, p_items jsonb,
  p_cliente text default '', p_documento text default '', p_email text default '')
returns int language plpgsql security definer set search_path = public as $$
declare v_rol text := public.rol_actual(); v_id int; v_envio numeric := 0; v_total numeric := 0;
        v_nombre text; it jsonb; pr record;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_origen = 'mostrador' and v_rol <> 'vendedor' then raise exception 'Solo un empleado puede registrar ventas de mostrador'; end if;
  if p_origen = 'web' and v_rol <> 'cliente' then raise exception 'Solo un cliente puede hacer pedidos web'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'El pedido no tiene productos'; end if;
  if p_origen = 'web' and p_tipo = 'domicilio' then v_envio := 3; end if;
  if p_origen = 'web' then select nombre into v_nombre from perfiles where id = auth.uid();
  else v_nombre := coalesce(nullif(trim(p_cliente),''), 'Cliente varios'); end if;
  insert into pedidos (cliente_id, vendedor_id, cliente_nombre, documento, email_boleta, tipo, direccion, pago, estado, origen, envio, total)
  values (case when p_origen = 'web' then auth.uid() end,
          case when p_origen = 'mostrador' then auth.uid() end,
          v_nombre, coalesce(p_documento,''), coalesce(p_email,''), p_tipo, coalesce(p_direccion,''), p_pago,
          case when p_origen = 'mostrador' then 'entregado' else 'pendiente' end, p_origen, v_envio, 0)
  returning id into v_id;
  for it in select value from jsonb_array_elements(p_items) loop
    select * into pr from productos where id = (it->>'id')::int and disponible;
    if not found then raise exception 'Un producto ya no está disponible'; end if;
    insert into pedido_items (pedido_id, producto_id, nombre, precio, cantidad, nota)
    values (v_id, pr.id, pr.nombre, pr.precio, (it->>'cantidad')::int, coalesce(it->>'nota',''));
    v_total := v_total + pr.precio * (it->>'cantidad')::int;
  end loop;
  update pedidos set total = v_total + v_envio where id = v_id;
  return v_id;
end $$;
revoke execute on function public.crear_pedido(text,text,text,text,jsonb,text,text,text) from public, anon;
grant execute on function public.crear_pedido(text,text,text,text,jsonb,text,text,text) to authenticated;

-- ---------- SEGURIDAD (RLS) ----------
alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;

create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.rol_actual() in ('admin','vendedor'));
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and rol = public.rol_actual());
create policy perfiles_admin on public.perfiles for update to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- La portada pública puede ver el catálogo
create policy categorias_ver on public.categorias for select to anon, authenticated using (true);
create policy productos_ver on public.productos for select to anon, authenticated using (true);
create policy productos_admin on public.productos for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

create policy pedidos_ver on public.pedidos for select to authenticated
  using (cliente_id = auth.uid() or public.rol_actual() in ('admin','vendedor'));
create policy pedidos_actualizar on public.pedidos for update to authenticated
  using (public.rol_actual() in ('admin','vendedor')) with check (public.rol_actual() in ('admin','vendedor'));
create policy items_ver on public.pedido_items for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id
         and (p.cliente_id = auth.uid() or public.rol_actual() in ('admin','vendedor'))));

-- ---------- FOTOS DE PRODUCTOS (Storage) ----------
insert into storage.buckets (id, name, public) values ('productos','productos', true) on conflict (id) do nothing;
create policy fotos_publicas on storage.objects for select using (bucket_id = 'productos');
create policy fotos_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.rol_actual() = 'admin');

-- ---------- DATOS DE EJEMPLO ----------
insert into public.categorias (nombre, emoji) values ('Conos','🍦'), ('Vasos','🍨'), ('Batidos','🥤');
insert into public.productos (nombre, descripcion, precio, categoria_id, emoji, disponible) values
 ('Cono Oreo','Vainilla con galletas Oreo',12.90,1,'🍦',true),
 ('Cono Especial','Chocolate con almendras',13.90,1,'🍫',true),
 ('Cono de Fresa','Helado cremoso de fresas naturales',13.50,1,'🍓',true),
 ('Vaso Triple','Fresa, chocolate y vainilla',14.90,2,'🍨',true),
 ('Vaso de Chocolate','Chocolate intenso con chispas',11.50,2,'🍨',true),
 ('Vaso de Vainilla','Vainilla clásica con topping a elección',10.90,2,'🍨',true),
 ('Batido de Oreo','Batido cremoso con galletas Oreo',11.50,3,'🥤',false),
 ('Batido de Fresa','Batido de fresa natural',10.50,3,'🥤',true),
 ('Batido de Chocolate','Batido de chocolate con crema',11.00,3,'🥤',true);
