# Citas médicas — prototipo educativo

Aplicación independiente para demostrar solicitudes de citas y consultar un directorio nacional. **No reserva citas reales, no consulta disponibilidad real y no sirve para emergencias.** En una emergencia llama al 911.

Los establecimientos son referencias públicas pendientes de verificación; los médicos, pacientes, horarios y citas son ficticios. La pantalla de acceso solo solicita un nombre ficticio y perfil: no autentica ni protege la API. No introducir datos reales ni publicar esta aplicación.

El prototipo incluye dos historiales ficticios con visitas y resultados de laboratorio sin interpretación médica. Las opiniones son de demostración sobre la aplicación, no valoraciones de centros; se guardan en `citas.db` y cualquier usuario local puede leerlas. No introducir nombres reales, información clínica real ni comentarios sobre terceros.

El directorio nacional procede del [catálogo oficial CLUES](http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html), corte octubre 2026. La búsqueda muestra registros que figuraban en operación en ese corte, sin garantizar su situación actual. El directorio no está conectado a las citas de ejemplo. Las imágenes de Unsplash son ilustrativas y no representan a los médicos ficticios.

Las tarjetas indican que su operación actual no está verificada. Los registros que el usuario reportó en Santiago Papasquiaro tienen avisos específicos; véase `documentacion/verificacion-centros.md`. No se borran ni se declaran cerrados sin evidencia suficiente.

El directorio permite elegir un solo orden: municipio/nombre o cercanía aproximada con ubicación autorizada. Los registros sin coordenadas válidas se muestran al final. Las valoraciones de Google y la disponibilidad real no están integradas y no se inventan.

Se puede filtrar por estado, municipio, nombre y teléfono registrado. La sección de opiniones por centro usa la clave CLUES de un resultado y conserva comentarios ficticios por separado en SQLite. Son ejemplos sin verificar, no valoraciones reales ni de Google. No introducir datos reales ni hechos sobre establecimientos o terceros.

Las tarjetas y la sección de opiniones incluyen referencias puntuales de DrLoop, Yelp y Cylex/Yably para nueve hospitales, consultadas el 12 de noviembre de 2026 y asociadas mediante la clave CLUES tras comprobar nombre y dirección. No son necesariamente calificaciones de Google ni se actualizan. Los demás centros no tienen calificación externa cargada.

Para reconstruir el directorio, descarga el XLSX de la fuente oficial y ejecuta `.\.venv\Scripts\python.exe scripts\importar_clues.py ruta-al-archivo.xlsx`. Se genera `directorio_clues.db` separado de las citas; la importación reemplaza solo ese directorio. Al elegir ubicación, el navegador solicita permiso y envía las coordenadas al servidor local sin guardarlas. También se puede seleccionar estado y buscar por municipio.

Nota: el registro de acceso de Uvicorn puede mostrar las coordenadas en la URL. Para evitarlo en desarrollo, inicia Uvicorn con `--no-access-log`. El chat recupera una sección de `documentos-demo/` mediante coincidencia de palabras; si no encuentra coincidencias, solicita a Ollama que seleccione una sección entre las primeras 30. Después envía la pregunta y el fragmento a Ollama local. Solo muestra una cita literal del fragmento; si el modelo genera texto distinto, muestra el fragmento original. La selección puede ser irrelevante y la búsqueda no garantiza encontrar toda la información. No introducir datos personales ni médicos.

## Chat con IA local

Instala Ollama para Windows y asegúrate de que esté ejecutándose. El modelo predeterminado es `llama3.2:3b`; comprueba que esté disponible con `ollama list`. Si no aparece, descárgalo con `ollama pull llama3.2:3b`. La aplicación llama a `http://127.0.0.1:11434/api/chat`; si Ollama o el modelo no están disponibles, el chat muestra un error, sin inventar una respuesta. Para otro modelo local, define `$env:OLLAMA_MODEL = "nombre-del-modelo"` en la terminal antes de iniciar FastAPI. La primera respuesta puede tardar mientras se carga el modelo.

## Requisitos

Windows, Python (comando `py`) y Node.js LTS. Se recomienda abrir esta carpeta en Visual Studio Code. En PowerShell se usa `npm.cmd` para evitar problemas con la política de scripts.

## Iniciar

En una terminal PowerShell desde la raíz del proyecto:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

En otra terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abrir la dirección local que muestra Vite. API: http://127.0.0.1:8000/docs. La base `citas.db` se crea automáticamente en la raíz. La fecha y los horarios de ejemplo se generan al iniciar por primera vez.

## Pruebas

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Reglas

Una solicitud ocupa un horario mientras está pendiente o confirmada. Recepción y médico deben aprobarla, en cualquier orden. Si alguno la rechaza o el paciente la cancela, el horario se libera y se ofrecen alternativas del mismo médico y establecimiento, primero el mismo día. Elegir una alternativa requiere crear otra solicitud.

Para solicitar una cita de ejemplo, busca un centro en el directorio y selecciona «Solicitar cita de demostración» en su tarjeta; después elige una especialidad y un médico ficticio. El sistema crea una agenda ficticia de medicina general para los centros que todavía no tienen una. Los médicos, las especialidades y los horarios son ejemplos: no prueban relación laboral, servicios ofrecidos ni disponibilidad del establecimiento real. El directorio nacional no está conectado a agendas reales. La selección de especialidad no es un diagnóstico ni una recomendación clínica.

## Fases futuras

Para uso real se requerirían autenticación, autorización, privacidad, auditoría, protección de datos, revisión jurídica y acuerdos con establecimientos.
