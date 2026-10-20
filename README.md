# Allyu Frontend

Proyecto independiente con React, Vite, TypeScript, React Router y Firebase Auth. Node 20 se ejecuta en Docker; no se necesita instalar Node en Windows.

## Etapas

1. Base y autenticacion implementadas: login, persistencia, sincronizacion inicial, logout, rutas protegidas y pruebas.
2. Cliente API compartido y perfil implementados: consulta remota, edicion de displayName, validacion, errores y recuperacion. Validado con Node 20: lint sin advertencias, typecheck, 30 pruebas Vitest y build correctos. Pruebas de navegador con Firebase y API simulados en movil y escritorio; la cuenta Firebase real debe probarla el propietario.
3. Roles, test y resultado implementados. Validado con Node 20: lint, typecheck, 49 pruebas y build correctos. Flujo de pantallas probado con servicios y autenticacion simulados, sin escribir en Firestore.
4. Acabado visual implementado: negro, naranja, tipografia, fondo de conexiones, controles outline y estados responsive. Revisado en navegador con datos simulados a 320 y 1440 px, foco de teclado y movimiento reducido. Pendiente recibir el logo y la referencia oficial del propietario.
5. Dockerfile multi-stage Node 20/Nginx, Compose y CI implementados. Guias de CORS y despliegue economico AWS disponibles. La aplicacion real del cambio CORS y la publicacion en AWS quedan a cargo del propietario.

Se espera aprobacion entre etapas. No se ejecutan comandos Git ni se modifica el backend.

## Guias de publicacion

- [Despliegue AWS de bajo coste](docs/DEPLOYMENT_AWS.md): Amplify Hosting estatico + backend Lightsail existente, precios, creditos de prueba, ZIP, rutas React, Firebase, CI y limpieza.
- [CORS del backend](docs/CORS_BACKEND.md): middleware, allowlist, preflight, propagacion de CORS_ORIGINS a Lightsail y comprobaciones.

No se ha creado infraestructura AWS ni se han usado credenciales AWS. El ajuste CORS esta documentado, no aplicado. No se ha ejecutado el workflow en GitHub.

Se mantiene Node 20 por requisito del proyecto. A la fecha de esta entrega, [Node.js lo clasifica EOL](https://nodejs.org/en/about/previous-releases); planificar una migracion autorizada a una LTS mantenida antes de produccion duradera. Nginx, no Node, ejecuta el frontend de produccion.

## Configuracion

Completar `.env`, ignorado por Git. `.env.example` tiene las mismas variables sin valores.

| Variable | Valor |
| --- | --- |
| VITE_API_BASE_URL | Produccion: URL HTTPS del backend, sin barra final; desarrollo: vacia. |
| VITE_DEV_PROXY_TARGET | URL HTTPS del backend para el proxy Vite. |
| VITE_FIREBASE_API_KEY | apiKey de la configuracion web Firebase. |
| VITE_FIREBASE_AUTH_DOMAIN | authDomain de Firebase. |
| VITE_FIREBASE_PROJECT_ID | projectId del mismo proyecto utilizado por el backend. |
| VITE_FIREBASE_APP_ID | appId de la aplicacion web Firebase. |

Obtener la configuracion web en Firebase Console > Configuracion del proyecto > General > Tus aplicaciones. Todas las variables VITE_* quedan visibles en el bundle. No usar el JSON administrativo, claves privadas ni credenciales AWS.

Habilitar Email/Password y crear las cuentas desde Firebase Console. No hay pantalla de registro. Un proyecto Firebase distinto del backend genera 401.

## Desarrollo con Docker Compose

Con Docker Desktop iniciado, ejecutar desde esta carpeta en PowerShell:

```powershell
docker compose up dev
```

Abrir http://localhost:5173. El servicio ejecuta npm ci, lint, typecheck, tests y build antes de iniciar Vite. Si falla un control no inicia el servidor. Usa Node 20 y un volumen de dependencias dentro de Docker; no instala Node ni paquetes globales en Windows. Las fuentes se montan para recarga automatica y el watcher usa sondeo para Docker Desktop.

Si el puerto esta ocupado, elegir otro antes de arrancar:

```powershell
$env:DEV_PORT = '5176'
docker compose up dev
```

En ese caso abrir http://localhost:5176. Ctrl+C detiene el servicio; docker compose down retira los contenedores y conserva el volumen de dependencias. El arranque vuelve a ejecutar npm ci para respetar el lockfile.

El servicio production es opcional y no se inicia al arrancar dev. Compila en Node 20 y sirve solo dist con Nginx. No incorpora la configuracion local al contexto de build. Los valores publicos de produccion deben suministrarse como build args, mediante Compose y un archivo separado, como se explica en la guia AWS.

```powershell
docker compose --env-file .env.production.local --profile production up --build production
```

Abrir http://localhost:8080. Esta version accede directamente al backend HTTPS y requiere CORS para ese origen; no dispone del proxy Vite. Si ese puerto esta ocupado, definir PRODUCTION_PORT de la misma forma que DEV_PORT y autorizar el origen correcto en el backend. Para detenerla usar Ctrl+C y docker compose --profile production down.

El navegador llama rutas relativas /api/v1. Vite usa loadEnv y VITE_DEV_PROXY_TARGET con TLS verificado. Reiniciar Vite al cambiar la URL despues de recrear AWS. El watcher usa sondeo para detectar cambios en montajes de Docker Desktop sobre Windows.

Para consumir AWS, VITE_DEV_PROXY_TARGET debe ser el dominio HTTPS del backend, sin /api/v1. No usar localhost:3000 dentro de Docker para un backend en Windows: localhost identifica al contenedor. Para un backend local se puede usar http://host.docker.internal:3000, si esta ejecutandose en el host. No se inicia ni modifica el backend desde este proyecto.

En produccion se usa VITE_API_BASE_URL; cambiarla exige recompilar. El backend necesitara CORS para el origen publicado. Ese ajuste se documentara, sin modificar el backend.

## Validacion

Con dev iniciado, usar el mismo contenedor Node 20 para cada comando:

```powershell
docker compose exec dev npm run lint
docker compose exec dev npm run typecheck
docker compose exec dev npm test -- --maxWorkers=1
docker compose exec dev npm run build
```

Las pruebas usan mocks y no escriben en Firestore. Cubren el reintento unico tras 401, cierre de sesion, desconexion, persistencia, sincronizacion y rutas protegidas. No se registran tokens en consola.

Para ejecutar todos los controles en secuencia usar npm run verify en el contenedor. npm run dev:checked ejecuta los mismos controles antes de iniciar Vite y no inicia el servidor si alguno falla.

CI ejecuta esos controles en push y pull_request a main/develop, y valida la imagen Docker por separado. El artefacto frontend-dist solo se publica en push o ejecucion manual con las cinco variables VITE_* de produccion configuradas en Actions; la imagen de smoke test usa fixtures no desplegables. No se publican imagenes ni se despliega AWS automaticamente. Ver la guia AWS para obtener y subir el ZIP sin conectar Git.

## Prueba manual

1. Completar .env y arrancar Vite.
2. Abrir / sin sesion: debe redirigir a /login.
3. Iniciar sesion: comprobar POST /api/v1/users/sync con {} antes de acceder a /.
4. Recargar: la sesion se restaura y el perfil se sincroniza.
5. Cerrar sesion: volver a /login.
6. Con AWS inaccesible, comprobar error y boton Reintentar.

### Perfil (etapa 2)

Despues del login se abre /perfil y se consulta GET /api/v1/users/me. El formulario solo permite editar displayName: texto de 2 a 60 caracteres despues de quitar espacios extremos, o vacio para enviar null. Guardar usa PATCH /api/v1/users/me; la identidad, correo, rol, nivel, XP y racha no se envian en el body.

1. Confirmar el correo y los datos de la cuenta.
2. Cambiar el nombre, guardar y recargar para verificar persistencia en Firestore.
3. Vaciar el nombre y guardar: debe enviarse null.
4. Introducir un solo caracter: debe aparecer validacion sin llamar al backend.
5. Probar Descartar cambios: recupera el ultimo nombre confirmado.
6. Ante 404 USER_NOT_FOUND, Sincronizar perfil vuelve a ejecutar sync antes de consultar nuevamente.
7. Si AWS falla, Reintentar recupera la consulta sin borrar la sesion.

Ante 401 se renueva el ID token y se reintenta una sola vez. Un segundo 401 cierra sesion y la ruta protegida redirige al login. Los errores 403, 404, 500 y de red se muestran en espanol; los details del campo displayName se asocian al input.

### Roles y evaluacion (etapa 3)

| Ruta del frontend | Comportamiento |
| --- | --- |
| /roles | Consulta GET /api/v1/roles y permite seleccionar un rol activo. |
| /test | Consulta GET /api/v1/placement/questions y muestra una pregunta a la vez. |
| /resultado | Muestra el resultado recibido de POST /api/v1/placement/evaluate. |

1. Abrir Evaluacion en la cabecera y elegir un rol del catalogo real.
2. Pulsar Continuar. El banco debe contener 12 preguntas distintas con opciones.
3. Responder y avanzar. Siguiente no se habilita sin una respuesta.
4. Retroceder y comprobar que la opcion seleccionada se conserva. La barra indica la pregunta actual.
5. Visitar Perfil y volver al mismo rol: se conserva el borrador. Elegir otro rol lo reinicia.
6. En la pregunta 12, pulsar Evaluar. Se envia solo roleId y las 12 respuestas, sin UID, puntaje ni nivel calculado en el frontend.
7. Comprobar nivel, aciertos y rol en Resultado. Ver perfil consulta nuevamente el usuario y permite verificar el nivel guardado por el backend.
8. Repetir evaluacion borra las respuestas anteriores y vuelve a la primera pregunta. Elegir otro rol borra el borrador y vuelve al catalogo.

El borrador vive en memoria y pertenece a la sesion autenticada. Recargar, cerrar la pestana o cerrar sesion lo elimina; no se guardan tokens ni respuestas manualmente en almacenamiento del navegador. Abrir /test sin rol o /resultado sin resultado redirige al catalogo.

Los errores de carga permiten reintentar. Un fallo al evaluar conserva las respuestas y no muestra un resultado inventado. Mientras se evalua, los controles impiden envios duplicados desde la pantalla. El backend es la unica autoridad del nivel y persiste roleId y englishLevel; evaluar de nuevo reemplaza esos campos. Usar una cuenta de prueba.

Si el catalogo esta vacio, se muestra un estado vacio; este proyecto no ejecuta seeds ni crea roles. El propietario debe verificar el catalogo del backend por separado.

Usar cuentas de prueba: la sincronizacion real crea el perfil o actualiza la actividad en Firestore. La persistencia de credenciales la administra Firebase; el cliente HTTP no guarda ID tokens manualmente.

## Diseno y marca (etapa 4)

El sistema visual vive en src/styles/base.css: fondo #0B0B0C, superficies #121214, acento #E8601C, texto blanco calido y gris. Rojo y verde se reservan para errores y confirmaciones. Los titulos usan Oxanium y el texto Inter, cargadas desde Google Fonts con fallback sans-serif si la red no esta disponible.

El fondo es una red SVG decorativa estatica de baja opacidad, sin interaccion ni contenido accesible. Los controles conservan foco visible, estados deshabilitados y selecciones nativas; la preferencia de movimiento reducido elimina las animaciones. Las tarjetas de seleccion tienen radios de 6 px y los botones y campos de 4 px.

El logo esperado es src/assets/allyu-logo.png. Tambien se admite una unica variante allyu-logo.webp, allyu-logo.jpg o allyu-logo.jpeg. Application.tsx resuelve el recurso durante el build y mantiene sus proporciones dentro del espacio reservado en la cabecera. Mientras no exista ese bitmap se muestra la marca tipografica Allyu; no se ha recreado el logo en SVG ni se utiliza la ilustracion de ejemplo de Vite. La imagen oficial y letracolores.jpg siguen pendientes del propietario.

Para revisar visualmente: recorrer login, perfil, roles, test y resultado a 320 px y en escritorio; navegar con Tab para comprobar el foco; activar movimiento reducido y verificar que no hay animaciones. Los mocks usados para esta revision solo existieron en la pestana de pruebas y no forman parte de la aplicacion.

## Pendientes del propietario

- Completar configuracion web Firebase y destino AWS vigente.
- Revocar cualquier clave administrativa expuesta previamente.
- Proporcionar logo y letracolores.jpg para etapa visual.
- Aprobar etapas y versionar el proyecto por su cuenta.
- Aplicar y desplegar CORS en el backend antes de usar la API desde el dominio publicado.
- Revisar creditos y costes, desplegar Amplify y completar la prueba real de integracion.
- Planificar una actualizacion autorizada de Node 20 a una LTS con soporte.
