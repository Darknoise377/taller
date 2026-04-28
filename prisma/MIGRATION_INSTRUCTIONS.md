# Migración Prisma: Agregar `sku`, `tags`, `diagramNumber`

He actualizado `prisma/schema.prisma` y el código para usar los nuevos campos. Si `npx prisma migrate dev` falla (por ejemplo, por caracteres especiales en la ruta como `&`), sigue una de estas opciones para aplicar los cambios en tu base de datos.

Opción A — Ejecutar la migración Prisma (recomendado cuando funcione):

1. Abre PowerShell en el directorio del proyecto (quita o escapa `&` si existe en la ruta):

```powershell
Set-Location -LiteralPath 'C:\Users\fabian\Desktop\taller a&r'
npx prisma migrate dev --name add_sku_tags_diagramNumber
npx prisma generate
```

Si PowerShell sigue lanzando errores por el `&`, mueve temporalmente la carpeta del proyecto a una ruta sin caracteres especiales, por ejemplo `C:\projects\taller-ar`, y ejecuta los mismos comandos allí.

Opción B — Aplicar SQL manualmente (si no puedes ejecutar `prisma migrate` desde aquí):

1. Abre el archivo `prisma/migrations/manual_add_sku_tags_diagramNumber.sql` y ejecútalo contra tu base de datos (psql, DBeaver, PgAdmin, supabase SQL editor, etc.).

2. Luego actualiza el cliente Prisma localmente:

```bash
npx prisma generate
```

Notas:
- El archivo SQL añade columnas `sku` (texto, único), `tags` (arreglo de texto) y `diagramNumber` (texto).
- Después de aplicar la migración asegúrate de revisar el panel admin y crear o editar un producto para completar los valores.
- Si quieres que ejecute la migración aquí, puedo intentarlo de nuevo si me indicas que muevas el proyecto a un path sin `&`, o si prefieres que lo haga desde WSL/una ruta limpia.
