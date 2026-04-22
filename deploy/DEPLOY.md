# Deploy notes

## Build

```bash
npm install
npm run db:generate
npm run build
```

## Frontend

Copy `apps/web/dist/*` to `/var/www/mindspark/web`.

## Backend

- Copy repository to `/var/www/mindspark`
- Put production env into `apps/api/.env`
- Run database migration/push
- Enable systemd unit:

```bash
sudo cp deploy/mindspark-api.service /etc/systemd/system/mindspark-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now mindspark-api
```

## Reverse proxy

Use `deploy/nginx.conf` as a base. Add TLS with Certbot or Caddy.

## Important

If you stay on NVIDIA API trial/catalog access, verify that your account/license allows production traffic. Their public trial terms explicitly limit the service to testing/evaluation unless you have the right subscription.
