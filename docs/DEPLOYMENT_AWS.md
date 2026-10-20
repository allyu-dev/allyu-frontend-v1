# Publicar Allyu en AWS con coste reducido

## Recomendacion

Conservar el backend actual en Lightsail Containers y publicar este frontend estatico en Amplify Hosting, inicialmente con despliegue manual de un ZIP. No crear otro backend ni una VM para servir React. No hace falta EKS, ECS, ALB, NAT Gateway, RDS, SSR, WAF ni un dominio comprado para esta demo.

```text
Navegador -- HTTPS --> Amplify Hosting: React + archivos estaticos
Navegador -- login --> Firebase Auth: ID token
Navegador -- HTTPS + Bearer ID token --> Lightsail: API existente
Lightsail -- Firebase Admin --> Firestore
```

El contenedor Nginx incluido sirve para probar produccion localmente o para otro hosting de contenedores. Amplify Hosting recibe dist, no ejecuta ese contenedor. No hay que publicar la imagen del frontend en ECR para esta opcion.

## Costes y cuenta de prueba

Consulta de precios: 2026-10-19, region us-east-1, catalogo publico oficial AWSAmplify. Precios de lista en USD, antes de impuestos, descuentos, creditos y ofertas aplicables:

| Concepto de Amplify | Precio de referencia |
| --- | --- |
| Datos servidos | USD 0.15 por GB |
| Artefactos almacenados | USD 0.023 por GB |
| Build estandar alojado por Amplify | USD 0.01 por minuto |

Ejemplo orientativo, no limite de gasto: 1 GB servido y 0.1 GB almacenado representan aproximadamente USD 0.1523 con estas tarifas, sin builds de Amplify. Con 10 GB servidos serian aproximadamente USD 1.5023. Los ZIP ya compilados localmente no requieren un build de Amplify; si se conecta un repositorio con autobuild, 20 minutos estandar agregarian USD 0.20.

Estos ejemplos NO incluyen el backend Lightsail, ECR, logs, trafico de API, Firebase/Firestore, GitHub Actions ni dominios. La facturacion de Lightsail depende de la capacidad y escala contratadas y puede continuar aunque nadie visite la app. Revisar esos recursos existentes por separado. Firebase pertenece a Google y los creditos AWS no cubren su facturacion.

No habilitar Amplify WAF para esta demo sin presupuestarlo: el catalogo consultado incluye una tarifa base de USD 15/mes por ese concepto y pueden existir cargos WAF adicionales.

Tener una cuenta de prueba NO significa que todos los servicios sean gratis para siempre. La documentacion actual de AWS distingue Free account plan y Paid account plan: para nuevas cuentas elegibles hay USD 100 iniciales y hasta USD 100 adicionales por actividades; el plan gratuito dura hasta seis meses o hasta agotar creditos, lo que ocurra antes. Las condiciones de cuentas antiguas y promociones pueden diferir. No asumir una oferta de 12 meses ni que todos los servicios/regiones esten disponibles en el plan.

Antes de crear recursos:

1. En Billing and Cost Management, revisar tipo de plan, creditos restantes, vencimiento y ofertas Free Tier aplicables a la cuenta y a Amplify.
2. Confirmar en la consola que Amplify Hosting esta disponible en ese plan; no pasar a plan de pago automaticamente para seguir esta guia.
3. Configurar un presupuesto pequeno y avisos por correo, por ejemplo a USD 1 y USD 5, segun tu limite. Revisar tanto consumo como creditos: una factura neta cero puede estar consumiendo saldo.
4. Recordar que las alertas no son un tope ni detienen recursos instantaneamente; pueden llegar con retraso. Revisar consumo despues de publicar.
5. Mantener una sola app y una sola rama de demo; desactivar previews y builds automaticos que no se usen.

No se ha consultado tu facturacion ni se ha creado ningun recurso AWS en esta entrega. Confirmar tarifas y elegibilidad en la consola antes de desplegar.

## 1. Preparar la configuracion de produccion

Trabajar en la carpeta del frontend, no en allyu-backend-v1. Docker Desktop debe estar iniciado. No se necesita Node, npm ni AWS CLI en Windows para el despliegue manual.

La configuracion de desarrollo existente no se modifica. La configuracion separada para produccion se llama .env.production.local y esta ignorada por las reglas del proyecto. Sus valores esperados son:

```dotenv
VITE_API_BASE_URL=https://TU_BACKEND.cs.amazonlightsail.com
VITE_FIREBASE_API_KEY=TU_API_KEY_WEB_PUBLICA
VITE_FIREBASE_AUTH_DOMAIN=TU_PROYECTO.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=TU_PROYECTO
VITE_FIREBASE_APP_ID=TU_APP_ID_WEB
```

Reemplazar los cinco valores, no desplegar los ejemplos. La URL de API es el origen HTTPS vigente de Lightsail, sin /api/v1 ni barra final. Obtenerla de la consola o de la salida service_url de tu infraestructura; no reutilizar una URL antigua si se recreo el servicio. Las cuatro variables Firebase deben corresponder a una app web del mismo proyecto que utiliza el backend.

VITE_DEV_PROXY_TARGET solo afecta al servidor Vite de desarrollo; no sirve para conectar el build publicado. Todos los VITE_* usados se incorporan al JavaScript publico. No introducir serviceAccountKey.json, private_key, claves AWS, contrasenas o ID tokens. Una API key web de Firebase no es una clave administrativa; su uso debe protegerse con la configuracion y reglas de Firebase.

La imagen ignora .env y .env.* del contexto y recibe solo los cinco build args publicos de Compose. Los avisos genericos de Docker sobre nombres API_KEY/AUTH_DOMAIN se refieren aqui a configuracion web publica, no a secretos administrativos. No utilizar build args para secretos.

## 2. Compilar y empaquetar solo el sitio estatico

PowerShell desde la raiz del frontend:

```powershell
docker compose --env-file .env.production.local --profile production build production
docker compose --env-file .env.production.local --profile production create production
if (Test-Path .\dist) { Remove-Item .\dist -Recurse -Force }
docker compose --env-file .env.production.local --profile production cp production:/usr/share/nginx/html/. ./dist
Compress-Archive -Path .\dist\* -DestinationPath .\allyu-frontend-upload.zip -Force
docker compose --env-file .env.production.local --profile production rm -f production
```

La limpieza del comando anterior elimina solo dist, el directorio generado del frontend: comprobar que se esta en la carpeta correcta. Evita mezclar recursos de builds anteriores. El ZIP debe contener index.html en la raiz y assets/ al mismo nivel; no debe contener una carpeta superior dist, fuentes, node_modules ni archivos de configuracion. Nunca comprimir toda la carpeta del proyecto. El contenedor creado para extraer los archivos no necesita iniciarse.

Para probar primero en local, en lugar de create/cp se puede ejecutar:

```powershell
docker compose --env-file .env.production.local --profile production up --build production
```

Abrir http://localhost:8080. Esta prueba usa el backend HTTPS real y necesita CORS permitiendo http://localhost:8080; ya no hay proxy Vite. Nginx sirve /perfil, /roles, /test y /resultado al recargar, no convierte /api/ en HTML y expone /healthz localmente. La configuracion VITE_* no se cambia poniendo variables al arrancar Nginx: requiere reconstruir.

El HEALTHCHECK Docker usa /healthz. No confundirlo con /health del backend.

## 3. Crear Amplify Hosting sin conectar Git

1. Abrir AWS Console > Amplify en la region elegida, preferiblemente la de tu backend para simplificar la administracion.
2. Elegir Create new app > Deploy without Git.
3. Usar un nombre como allyu-frontend-demo y una unica rama como production.
4. Elegir Drag and drop y subir allyu-frontend-upload.zip.
5. Guardar y desplegar. Anotar el origen HTTPS que entregue Amplify, por ejemplo https://production.TU_APP.amplifyapp.com; no suponer que el ejemplo es tu URL.
6. No habilitar SSR, servicios Amplify de backend, WAF, dominio personalizado ni previews para completar esta demo.

No hacen falta un PAT de GitHub ni credenciales AWS en el frontend. El dominio HTTPS administrado por Amplify basta. Las variables agregadas despues en Amplify no reescriben un ZIP precompilado: volver a compilar y subir un nuevo ZIP si cambia VITE_API_BASE_URL o Firebase.

## 4. Configurar rutas React

En Amplify > Hosting > Rewrites and redirects, agregar la regla SPA oficial con status 200 y target /index.html. Usar esta regla para no devolver HTML al pedir archivos JS/CSS inexistentes:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

Guardar y verificar que una recarga directa de /perfil o /roles no produce AccessDenied ni 404. No configurar una redireccion 301/302 a index.html. No agregar un proxy /api hacia otra URL como sustituto de la politica CORS de esta guia: el cliente usa la URL absoluta del backend.

## 5. Acoplar el backend existente

Aplicar como propietario los cambios descritos en [CORS_BACKEND.md](CORS_BACKEND.md). Esta entrega no modifica el backend ni ejecuta sus scripts.

1. Definir CORS_ORIGINS con el origen exacto HTTPS de Amplify, sin rutas ni barra final.
2. Instalar y registrar el middleware en el backend, antes de autenticacion y rutas.
3. Pasar la variable desde el workflow hasta el environment del contenedor Lightsail; una variable del runner por si sola no llega a la API.
4. Desplegar el backend actualizado y comprobar /health y OPTIONS.
5. En Firebase Console > Authentication > Settings > Authorized domains, registrar el hostname de Amplify sin protocolo ni ruta, especialmente para flujos con redireccion. Esto no sustituye CORS del backend.
6. Mantener Email/Password habilitado. Las cuentas se crean en Firebase Console, no existe registro en esta app.

La app puede publicarse primero para obtener su dominio; el login contra la API puede fallar hasta completar CORS. No relajar la API con * para evitar ese paso.

## 6. Probar extremo a extremo

Usar una cuenta de prueba; sync y evaluate escriben en Firestore.

1. Abrir el dominio HTTPS y comprobar que no solicita localhost, example.invalid ni una URL antigua en Network.
2. Iniciar sesion y comprobar OPTIONS, POST /api/v1/users/sync y GET /api/v1/users/me.
3. Cambiar el nombre y recargar para verificar persistencia.
4. Consultar roles, responder las 12 preguntas, evaluar y consultar el perfil para confirmar rol/nivel persistidos.
5. Recargar /perfil y /roles y comprobar que React carga. /test o /resultado sin borrador pueden volver a /roles por diseno.
6. Cerrar sesion y verificar que no se puede acceder al perfil sin autenticacion.
7. Comprobar errores y que ningun ID token o secreto aparece en logs o capturas compartidas.
8. Revisar Billing tras el uso; guardar un ZIP anterior configurado para poder redeplegarlo si falla una version nueva.

Esta integracion real queda pendiente hasta que el propietario despliegue el cambio CORS del backend. Las comprobaciones locales de esta entrega no certifican la cuenta AWS ni las reglas Firebase.

## CI y artefactos de GitHub

El workflow .github/workflows/ci.yml comprueba push y pull_request sobre main/develop y permite workflow_dispatch. Ejecuta npm ci, lint, typecheck, Vitest y build con Node 20, y luego un job de Docker build y nginx -t. No publica imagenes ni despliega AWS.

En el repositorio del frontend, Settings > Secrets and variables > Actions > Variables, definir las mismas cinco VITE_* de produccion. Son configuracion web publica, no credenciales administrativas. El job quality usa esas variables al compilar. Sin ellas, los checks pueden pasar, pero no se sube un sitio listo para publicar.

En push o ejecucion manual, si las cinco variables estan presentes, el job genera el artefacto frontend-dist con retencion de siete dias. Descargar ese ZIP, verificar que index.html esta en la raiz y subirlo a Amplify. Las PR no generan ese artefacto de publicacion. No se ha ejecutado GitHub Actions desde este entorno.

El job Docker utiliza siempre fixtures publicos y no desplegables para validar la imagen sin depender de Firebase o AWS. No publicar allyu-frontend:ci; para una imagen real usar Compose y la configuracion de produccion. Los minutos y el almacenamiento de Actions pueden consumir cuotas de GitHub, independientes de AWS.

Node 20 se conserva por el requisito actual, pero ya figura como EOL en la pagina oficial de Node.js a la fecha de esta guia. Antes de produccion duradera, planificar con autorizacion la migracion a una LTS mantenida y volver a validar dependencias, CI e imagenes. Este cambio de version no se ha realizado aqui.

## Alternativas y limpieza

S3 privado + CloudFront con HTTPS y Origin Access Control es otra opcion estatica economica, pero exige configurar bucket privado, distribucion, rutas SPA, cache y limpieza. No usar el website endpoint HTTP de S3 para una app que transporta tokens. Amplify reduce esos pasos para esta demo, no garantiza ser la opcion de menor coste en todas las cuentas.

Para dejar de pagar, eliminar la app de Amplify y verificar recursos asociados y facturacion. Detener visitas o cerrar la pestana no elimina almacenamiento ni servicios. Lightsail, ECR, logs y otros recursos del backend se limpian por separado mediante su procedimiento existente, solo cuando ya no se necesiten; no destruirlos por publicar el frontend.

En local, docker compose down detiene el desarrollo y conserva el volumen de dependencias. docker compose --profile production down detiene tambien el servicio de prueba de produccion. No hay que borrar Firebase ni desactivar cuentas para limpiar el hosting estatico.

## Fuentes oficiales

- [Precios Amplify](https://aws.amazon.com/amplify/pricing/).
- [Catalogo publico AWSAmplify us-east-1 utilizado](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSAmplify/current/us-east-1/index.json), publicado el 2026-09-11; comprobar la version vigente al desplegar.
- [Planes y creditos AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).
- [Ofertas AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html).
- [Despliegue manual sin Git](https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html).
- [Regla SPA de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html#redirects-for-single-page-web-apps-spa).
- [Estado de soporte Node.js](https://nodejs.org/en/about/previous-releases).