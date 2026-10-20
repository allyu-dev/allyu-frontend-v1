# CORS para conectar el frontend con el backend

Esta guia describe cambios pendientes en allyu-backend-v1. No se han aplicado al backend. CORS no se resuelve poniendo cabeceras en React o en el Nginx del frontend: debe responderlas el servidor que recibe la API.

## Por que funciona en desarrollo y falla al publicar

En desarrollo el navegador consulta /api/v1 en el mismo origen de Vite; su proxy reenvia al backend. En produccion el navegador consulta directamente VITE_API_BASE_URL. El dominio de Amplify y el dominio de Lightsail son origenes distintos.

El header Authorization y los cuerpos JSON provocan un preflight OPTIONS. Ese preflight no lleva el ID token y debe resolverse antes de AuthMiddleware. No usar mode: no-cors: impediria leer la respuesta y no arregla autenticacion.

## Politica propuesta

| Opcion | Valor |
| --- | --- |
| Origenes | CORS_ORIGINS: lista explicita separada por comas |
| Metodos | GET, POST, PATCH, OPTIONS |
| Cabeceras de peticion | Authorization, Content-Type |
| Credenciales de navegador | false; el cliente usa credentials: omit |
| Preflight | 204, sin autenticacion; cache de 600 segundos |

Un origen incluye protocolo y puerto si existe, pero no rutas ni barra final. Ejemplo:

```text
CORS_ORIGINS=https://production.TU_APP.amplifyapp.com,http://localhost:8080
```

Usar el hostname real que entregue Amplify. Eliminar localhost en el entorno de produccion cuando ya no se necesite. No usar *, patrones de subdominio ni todos los previews de una cuenta.

## Cambio que debe realizar el propietario

Instalar cors y @types/cors en el backend usando su entorno Node 20. Son dependencias del backend, no del frontend. Conservar su lockfile y sus pruebas. No ejecutar seeds.

En src/app.ts del backend, despues de crear app y antes de express.json(), /health, las rutas y los handlers de error:

```ts
import cors from "cors";

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (allowedOrigins.size === 0 || allowedOrigins.has("*")) {
  throw new Error("CORS_ORIGINS requiere origenes explicitos.");
}

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: false,
  maxAge: 600,
  optionsSuccessStatus: 204,
}));
```

El import va junto con los demas imports; el resto del bloque va despues de const app = express(). El middleware cors aplicado con app.use ya atiende OPTIONS. No hace falta agregar app.options("*"): ese patron no es valido tal cual en Express 5.

cors refleja solo el origen permitido y agrega Vary: Origin. Un origen rechazado no recibe Access-Control-Allow-Origin: no se exige que el status sea 403. Las peticiones sin Origin, como health checks y clientes HTTP, siguen funcionando; la API mantiene su autenticacion Firebase. CORS no sustituye permisos ni impide que un cliente fuera del navegador llame al servidor.

No envolver solamente las respuestas 200: el navegador tambien debe poder leer los 400, 401, 404 y 500 del backend desde un origen permitido.

## Hacer llegar CORS_ORIGINS a Lightsail

El despliegue actual del backend construye environment en scripts/deploy-lightsail.mjs y no copia automaticamente todas las variables del runner. Anadir CORS_ORIGINS solo en GitHub no la envia al contenedor.

1. En el repositorio del backend, crear la variable de Actions CORS_ORIGINS con la lista de origenes autorizados.
2. En el step Deploy and check health de .github/workflows/deploy-lightsail.yml del backend, agregar a env:

```yaml
CORS_ORIGINS: ${{ vars.CORS_ORIGINS }}
```

3. En el objeto environment del payload de scripts/deploy-lightsail.mjs del backend, conservar NODE_ENV, PORT y FIREBASE_SERVICE_ACCOUNT_JSON y agregar:

```js
CORS_ORIGINS: process.env.CORS_ORIGINS ?? "",
```

4. Revisar las pruebas del script y desplegar una imagen nueva del backend con el middleware instalado. La configuracion propuesta falla al arrancar si falta la lista, por lo que debe estar definida antes de desplegar.
5. Comprobar en Lightsail que la revision activa contiene CORS_ORIGINS y que /health responde 200. No imprimir el JSON completo de despliegue: tambien contiene credenciales administrativas.

Como alternativa puntual se puede crear una revision en la consola de Lightsail conservando imagen, puerto, health check y las variables existentes. No reemplazar el secreto Firebase por un valor vacio. El siguiente despliegue automatico borrara ese ajuste si el script no se actualiza tambien.

## Verificacion sin compartir tokens

PowerShell, con la URL vigente del backend y el origen real del frontend:

```powershell
$ApiBase = 'https://TU_BACKEND.cs.amazonlightsail.com'
$FrontendOrigin = 'https://production.TU_APP.amplifyapp.com'
curl.exe -i -X OPTIONS "$ApiBase/api/v1/users/me" -H "Origin: $FrontendOrigin" -H "Access-Control-Request-Method: PATCH" -H "Access-Control-Request-Headers: authorization,content-type"
```

Debe responder 204, Access-Control-Allow-Origin igual al origen solicitado, metodos y cabeceras permitidos, y Vary: Origin. No debe incluir Access-Control-Allow-Credentials: true. No enviar Authorization en este preflight.

```powershell
curl.exe -i -X OPTIONS "$ApiBase/api/v1/users/me" -H "Origin: https://no-autorizado.example" -H "Access-Control-Request-Method: PATCH" -H "Access-Control-Request-Headers: authorization,content-type"
```

Esta segunda respuesta no debe incluir Access-Control-Allow-Origin. Un 401 o 404 sin esa cabecera puede ser normal para este origen rechazado.

Finalmente abrir el frontend HTTPS, iniciar sesion con una cuenta de prueba y revisar Network: OPTIONS correcto, sync correcto y luego GET/PATCH de perfil y evaluacion. No pegar ID tokens en documentos, capturas, incidencias ni logs.

## Diagnostico rapido

| Sintoma | Revisar |
| --- | --- |
| OPTIONS responde 401 | CORS debe ir antes de AuthMiddleware. |
| OPTIONS responde sin Allow-Origin | Origen exacto, puerto, barra final y revision activa de CORS_ORIGINS. |
| Frontend recibe HTML en lugar de JSON | VITE_API_BASE_URL vacia o rewrite SPA aplicado por error a la API. |
| Mixed Content | Usar backend HTTPS, no http desde Amplify HTTPS. |
| Respuesta 401 legible | Es autenticacion, no CORS: proyecto Firebase, ID token y cuenta. |
| Fetch falla sin respuesta | DNS, backend apagado, TLS, red o CORS; mirar consola y Network. |
| Cambio de variable sin efecto | Reconstruir frontend para VITE_*; crear revision backend para CORS_ORIGINS. |

Probar tambien PATCH real y errores 401/404 desde un origen permitido en el entorno de pruebas. El ajuste descrito no se ha desplegado ni verificado contra AWS durante esta entrega.