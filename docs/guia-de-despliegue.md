# Guía de despliegue en el VPS

Pasos y requisitos para publicar la app de Salazar SAC. Complementa [diagrama-de-despliegue.md](diagrama-de-despliegue.md), que describe la arquitectura. Los dominios de ejemplo usan `deyvigo.online`; cámbialos por los definitivos.

## Arquitectura de dominios

| Dominio | Destino |
|---|---|
| `app.deyvigo.online` | Frontend en Cloudflare Pages |
| `api.deyvigo.online` | API Spring Boot en el VPS (Traefik, puerto 8080) |
| `media.deyvigo.online` | Imágenes de platos, endpoint web de Garage (puerto 3902) |

Las cookies de sesión son `Secure` y `SameSite=Strict`, así que el frontend y la API deben estar en el mismo sitio (mismo dominio registrable). Un dominio `*.pages.dev` no funciona porque las cookies no viajarían a la API.

DNS necesario:

- `api` y `media`: registros A hacia la IP del VPS.
- `app`: CNAME hacia el proyecto de Cloudflare Pages (ver [Frontend en Cloudflare Pages](#frontend-en-cloudflare-pages)).

El DNS del dominio está en Namecheap (Advanced DNS). Los tres registros se crean ahí:

| Tipo | Host | Valor |
|---|---|---|
| A | `api` | IP del VPS |
| A | `media` | IP del VPS |
| CNAME | `app` | `<proyecto>.pages.dev` |

No hace falta mover los nameservers a Cloudflare. Solo sería necesario para usar el dominio raíz (`deyvigo.online`) como tienda, porque un CNAME en el apex no funciona bien en Namecheap; con un subdominio no se toca el DNS que ya apunta al VPS.

## Archivos de despliegue del repositorio

- `backend/Dockerfile`: multi-stage (Maven + Java 21) que genera la imagen de la API.
- `docker-compose.prod.yml`: `api`, `postgres` (PostGIS), `redis` y `garage`. Solo `api` y `garage` se unen a la red externa `proxy` de Traefik (etiquetas con `API_DOMAIN`, `MEDIA_DOMAIN` y `TRAEFIK_CERT_RESOLVER`, por defecto `letsencrypt`; el entrypoint debe llamarse `websecure`). Postgres, Redis y la API S3 de Garage no publican puertos.
- `docker/garage/garage.prod.toml`: configuración de Garage para el VPS.
- `scripts/garage-init-prod.sh`: inicialización de Garage (ver [Garage](#garage)).

Los pagos en línea con Mercado Pago (HU-19) necesitan las variables `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `APP_PUBLIC_API_URL` (ver [Mercado Pago](#mercado-pago)). Sin ellas la API arranca igual, pero crear un pedido en línea responde `502`.

## Requisitos previos del VPS

- Docker y Docker Compose instalados.
- Traefik corriendo con Let's Encrypt y una red Docker llamada `proxy`.
- Firewall con solo los puertos 22, 80 y 443 abiertos. Docker salta `ufw` al publicar puertos; por eso Postgres, Redis y Garage S3 no llevan `ports:`.
- Memoria suficiente para compilar con Maven (8 GB bastan). Actualizar: `git pull` y `docker compose -f docker-compose.prod.yml up -d --build`.

## Variables de entorno de la API

Archivo `.env` en la raíz del repositorio clonado en el VPS (junto a `docker-compose.prod.yml`), nunca en git.

```
API_DOMAIN=api.deyvigo.online
MEDIA_DOMAIN=media.deyvigo.online
TRAEFIK_CERT_RESOLVER=letsencrypt

SPRING_PROFILES_ACTIVE=prod
SERVER_FORWARD_HEADERS_STRATEGY=framework

DB_URL=jdbc:postgresql://postgres:5432/salazar
DB_USERNAME=salazar
DB_PASSWORD=<aleatoria>
REDIS_HOST=redis
REDIS_PORT=6379

APP_JWT_SECRET=<mínimo 32 caracteres>
APP_CORS_ALLOWED_ORIGINS=https://app.deyvigo.online
APP_FRONTEND_URL=https://app.deyvigo.online

STORAGE_ENDPOINT=http://garage:3900
STORAGE_REGION=garage
STORAGE_ACCESS_KEY=<clave de Garage>
STORAGE_SECRET_KEY=<secreto de Garage>
STORAGE_BUCKET=platos
STORAGE_PUBLIC_BASE_URL=https://media.deyvigo.online
GARAGE_RPC_SECRET=<64 caracteres hex>

APP_DEFAULT_ADMIN_EMAIL=<correo del administrador>
APP_DEFAULT_ADMIN_PASSWORD=<8+ caracteres, letras y números>

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=<contraseña de aplicación>
SMTP_FROM=

MP_ACCESS_TOKEN=<access token de Mercado Pago>
MP_WEBHOOK_SECRET=<clave secreta del webhook>
APP_PUBLIC_API_URL=https://api.deyvigo.online
```

Notas:

- `SERVER_FORWARD_HEADERS_STRATEGY=framework` es imprescindible: sin él, detrás de Traefik Spring arma el `redirect_uri` de Google con `http://` y Google lo rechaza.
- Generar secretos: `openssl rand -base64 48` para `APP_JWT_SECRET` y `DB_PASSWORD`; `openssl rand -hex 32` para `GARAGE_RPC_SECRET`.
- Clave de Garage: `STORAGE_ACCESS_KEY=GK$(openssl rand -hex 12)` y `STORAGE_SECRET_KEY=$(openssl rand -hex 32)`; el script de inicialización la importa.
- En producción `APP_DEFAULT_ADMIN_EMAIL` y `APP_DEFAULT_ADMIN_PASSWORD` son obligatorias: sin ellas la API no arranca. Cambiar la contraseña tras el primer acceso.
- El perfil `prod` no carga `db/dev`, así que los datos de ejemplo no llegan a producción.

## Google OAuth

1. En Google Cloud Console, crear un proyecto y abrir **APIs y servicios > Pantalla de consentimiento de OAuth**.
2. Tipo de usuario **Externo**, con nombre de la app y correo de soporte.
3. Scopes: `openid`, `email`, `profile`.
4. En modo "Pruebas" solo entran los usuarios de prueba añadidos. Para abrirlo al público, **publicar** la app; con estos scopes básicos no exige verificación.
5. **Credenciales > Crear credenciales > ID de cliente de OAuth**, tipo **Aplicación web**.
6. **URI de redireccionamiento autorizado**: `https://api.deyvigo.online/login/oauth2/code/google` (ruta por defecto de Spring Security, debe coincidir exactamente).
7. Orígenes autorizados de JavaScript (opcional): `https://app.deyvigo.online`.
8. Copiar el ID y el secreto a `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`.

Para probar en local, añadir también `http://localhost:8080/login/oauth2/code/google`.

## SMTP

- Con Gmail: activar la verificación en dos pasos y crear una **contraseña de aplicación**; esa va en `SMTP_PASSWORD`.
- Puerto 587 con STARTTLS. El puerto 25 suele estar bloqueado en los VPS.
- `SMTP_FROM` debe ser la misma cuenta, porque Gmail reescribe otros remitentes.
- Para un negocio real conviene un proveedor transaccional (Resend, Brevo, Amazon SES): los correos de Gmail llegan más a spam y el límite diario es bajo.

## Garage

Después de `docker compose -f docker-compose.prod.yml up -d`, una sola vez:

```
./scripts/garage-init-prod.sh
```

El script asigna el layout del nodo, importa la clave, crea el bucket `platos`, da permisos de lectura y escritura, activa el modo web y añade el alias `MEDIA_DOMAIN` al bucket. Es idempotente.

Traefik enruta `media.deyvigo.online` al puerto 3902 de Garage. La API usa el puerto 3900 por la red interna de Docker.

## Frontend en Cloudflare Pages

1. Crear un proyecto de Pages conectado al repositorio de GitHub.
2. Configuración de compilación:
   - Directorio raíz: `frontend`
   - Comando: `pnpm build`
   - Directorio de salida: `dist`
3. Variable de entorno: `VITE_API_URL=https://api.deyvigo.online/api` (se fija en la compilación, hay que recompilar si cambia).
4. Opcional: `VITE_MAP_TILE_URL` si no se usa OpenStreetMap.
5. Tras el primer despliegue, Pages entrega una URL `<proyecto>.pages.dev`. En el proyecto, ir a **Custom domains > Set up a custom domain** y escribir `app.deyvigo.online`; el dominio queda pendiente de validación.
6. En Namecheap (Advanced DNS) crear el registro CNAME `app` hacia `<proyecto>.pages.dev`.
7. Pages detecta el CNAME, valida el dominio y emite el certificado solo; suele tardar unos minutos.

## Protección con Cloudflare (fase posterior)

Esta sección es un paso posterior al despliegue inicial: no es necesaria para publicar la app y se puede hacer cuando ya funcione todo lo anterior.

Con la configuración inicial (DNS en Namecheap), solo el frontend pasa por la red de Cloudflare y recibe su protección DDoS básica. `api`, `media` y `dash` apuntan directo a la IP del VPS sin ningún filtro, y las funciones de zona (Bot Fight Mode, WAF, rate limiting) no están disponibles porque el DNS no está en Cloudflare.

Para proteger también el VPS:

1. Crear una cuenta gratuita de Cloudflare y añadir `deyvigo.online`.
2. Cambiar los nameservers en Namecheap a los que indique Cloudflare. A diferencia de la configuración inicial, aquí sí hay que moverlos.
3. Recrear los registros DNS en Cloudflare con el proxy activado (nube naranja) en `api`, `media` y `dash`. El CNAME `app` hacia Pages se mantiene.
4. Poner el modo SSL/TLS en **Full (strict)**.
5. Activar Bot Fight Mode y una regla de rate limiting para `/api/auth/*`, que protege el login.
6. En el firewall del VPS, permitir los puertos 80 y 443 solo desde los [rangos IP de Cloudflare](https://www.cloudflare.com/ips/). Si no, quien conozca la IP real del VPS salta la protección.
7. En Traefik, confiar en las cabeceras de Cloudflare (`forwardedHeaders.trustedIPs` en los entrypoints) para ver la IP real del cliente.

Consideraciones:

- Let's Encrypt con desafío HTTP sigue funcionando detrás del proxy mientras el puerto 80 sea accesible.
- El plan gratuito limita las subidas a 100 MB; las imágenes tienen un máximo de 5 MB, así que no afecta.
- El proxy no cambia el comportamiento de `SameSite=Strict`, porque `app` y `api` siguen en el mismo sitio.
- La protección contra fuerza bruta del login (Redis) es una capa propia de la API, independiente de Cloudflare.

## Operación

- Volúmenes persistentes para `postgis_data` y `garage_data`.
- Copia de seguridad diaria con `pg_dump` (cron), guardada fuera del VPS. Las imágenes de Garage también necesitan copia.
- Revisar si `/swagger-ui.html` debe quedar público en producción.

## Orden sugerido

1. DNS de `api`, `media` y `app`.
2. Google Cloud Console y contraseña SMTP.
3. Clonar el repositorio en el VPS (rama `main`).
4. Crear el `.env` en la raíz.
5. `docker compose -f docker-compose.prod.yml up -d --build` y `./scripts/garage-init-prod.sh`.
6. Proyecto de Cloudflare Pages con `VITE_API_URL`.
7. Pruebas: login normal, login con Google, correo de recuperación, subir una imagen.

## Mercado Pago

Los pagos en línea usan Checkout Pro: el cliente paga en la página de Mercado Pago (puede hacerlo como invitado) y Mercado Pago avisa a la API por un webhook.

1. En el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.com.pe/developers/panel) crear una aplicación de tipo Checkout Pro. Las credenciales de **prueba** y las de **producción** son distintas; el `MP_ACCESS_TOKEN` y el `MP_WEBHOOK_SECRET` deben ser del mismo entorno.
2. En la sección Webhooks de la aplicación, dar de alta la URL `https://<API_DOMAIN>/api/pagos/mercadopago/webhook` con el evento de **Pagos**, y copiar la **clave secreta** a `MP_WEBHOOK_SECRET`. La API también envía esta URL en cada preferencia (`notification_url`, a partir de `APP_PUBLIC_API_URL`), por lo que la del panel solo sirve de respaldo.
3. `APP_PUBLIC_API_URL` debe ser la URL pública HTTPS de la API, sin barra final. Traefik ya la expone; el webhook no requiere sesión y se protege solo con la firma.
4. El `MP_ACCESS_TOKEN` es el de la cuenta del negocio; hay que confirmar con Salazar SAC qué medios de pago habilita su cuenta (tarjetas, Yape, etc.). La API excluye los medios diferidos (efectivo en agente, depósito), porque un pedido de comida no puede esperar horas a un pago.
5. **Probar en desarrollo**: Mercado Pago no puede llamar a `localhost`. Para ver llegar los avisos reales, exponer el backend con un túnel (por ejemplo `cloudflared tunnel --url http://localhost:8080`) y poner su URL en `APP_PUBLIC_API_URL`; usar credenciales y usuarios de prueba. Sin túnel el flujo se puede probar con los tests automáticos, que simulan la pasarela.
6. Los pedidos sin pagar vencen a los 30 minutos (más 2 de margen) y liberan su stock. Un pago aprobado que llega con el pedido ya vencido, o por un importe distinto, queda marcado en `payments.needs_review` y no reactiva el pedido: hay que revisarlo y, si corresponde, reembolsarlo desde el panel de Mercado Pago.
