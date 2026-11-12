# Alcance de CadvoSalud

Prototipo local de curso con React, FastAPI y SQLite. Incluye directorio CLUES, búsqueda opcional por ubicación y flujo ficticio de citas con doble confirmación.

El acceso por nombre y perfil solo sirve para demostración: no autentica, no restringe la API y no garantiza privacidad. La agenda no refleja disponibilidad real. La ubicación se envía al servidor local; el registro de acceso de Uvicorn puede contener coordenadas en la URL. No utilizar datos reales ni desplegar públicamente.

El chat busca texto en documentos de demostración y envía la pregunta y el fragmento a Ollama local. No almacena preguntas en la base de datos. La selección puede ser incorrecta. Hay historiales y laboratorios ficticios precargados y opiniones de ejemplo persistentes; son visibles para todos los usuarios del prototipo. La autenticación real es una etapa futura. Para uso real se requiere un diseño de seguridad y privacidad, revisión legal y acuerdos con los establecimientos.
