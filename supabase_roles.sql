-- =====================================================
-- EJECUTAR DESPUÉS de crear las cuentas (con "Crear cuenta" en la página
-- o en Authentication → Users). Asigna el rol según el correo.
-- =====================================================
update public.perfiles set rol = 'admin',    nombre = 'Administrador' where email = 'admin@dulcefrio.com';
update public.perfiles set rol = 'vendedor', nombre = 'Empleado'      where email = 'vendedor@dulcefrio.com';

-- Para convertir a otra persona en empleado o administrador (cambia el correo):
-- update public.perfiles set rol = 'vendedor' where email = 'correo@ejemplo.com';

-- Comprobar:
select nombre, email, rol from public.perfiles order by rol;
