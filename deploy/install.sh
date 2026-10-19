#!/bin/bash
# POM 첫 설치 — 서버에서 1회: sudo bash /tmp/pom-upload/install.sh
# /tmp/pom-upload 에 jar·dist·pom.env·db-password.txt·pom_module.sql·nginx·systemd 파일이 있어야 한다(로컬에서 scp).
# 다시 돌려도 안전하게: DB 가 이미 차 있으면 복원을 건너뛰고, 스왑·사용자·DB 계정은 있으면 그대로 둔다.
set -euo pipefail
U=/tmp/pom-upload
DOMAIN=pom.taratps.com
[ "$(id -u)" = 0 ] || { echo "sudo 로 실행하세요"; exit 1; }
for f in pom-module-api.jar pom.env db-password.txt pom.taratps.com.conf pom-api.service; do
  [ -f "$U/$f" ] || { echo "없음: $U/$f"; exit 1; }
done
[ -d "$U/dist" ] || { echo "없음: $U/dist"; exit 1; }

echo "== 1. 패키지 (Java 17, MariaDB, rsync)"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-17-jre-headless mariadb-server rsync >/dev/null
java -version 2>&1 | head -1
mariadb --version

echo "== 2. 스왑 2GB (메모리 2GB 서버)"
if ! swapon --show | grep -q /swapfile; then
  [ -f /swapfile ] || fallocate -l 2G /swapfile
  chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
free -h | sed -n 2,3p

echo "== 3. 실행 계정·폴더"
id pom >/dev/null 2>&1 || useradd --system --home /opt/pom --shell /usr/sbin/nologin pom
mkdir -p /opt/pom /var/www/pom /etc/pom
chown pom:pom /opt/pom

echo "== 4. DB"
DBPW=$(tr -d '\r\n' < "$U/db-password.txt")
systemctl enable --now mariadb >/dev/null
mysql -e "CREATE DATABASE IF NOT EXISTS pom_module CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'pom'@'localhost' IDENTIFIED BY '${DBPW}'; ALTER USER 'pom'@'localhost' IDENTIFIED BY '${DBPW}'; GRANT ALL PRIVILEGES ON pom_module.* TO 'pom'@'localhost'; FLUSH PRIVILEGES;"
HAS=$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='pom_module' AND table_name='flyway_schema_history'")
if [ "$HAS" = 0 ] && [ -f "$U/pom_module.sql" ]; then
  echo "   로컬 데이터 복원..."
  mysql pom_module < "$U/pom_module.sql"
  echo "   복원 후 마이그레이션 버전: $(mysql -N -e 'SELECT MAX(CAST(version AS UNSIGNED)) FROM pom_module.flyway_schema_history')"
else
  echo "   DB 가 이미 있어 복원 건너뜀"
fi

echo "== 5. 환경변수·백엔드"
install -o root -g root -m 600 "$U/pom.env" /etc/pom/pom.env
install -o pom -g pom -m 644 "$U/pom-module-api.jar" /opt/pom/pom-module-api.jar
install -o root -g root -m 644 "$U/pom-api.service" /etc/systemd/system/pom-api.service
systemctl daemon-reload
systemctl enable pom-api >/dev/null

echo "== 6. 화면"
rsync -a --delete "$U/dist/" /var/www/pom/
chown -R www-data:www-data /var/www/pom

echo "== 7. nginx"
LE=/etc/letsencrypt/live/$DOMAIN
[ -f "$LE/fullchain.pem" ] || { echo "인증서가 없습니다: $LE — certbot 으로 먼저 발급하세요"; exit 1; }
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || { echo "/etc/letsencrypt/options-ssl-nginx.conf 없음 (certbot --nginx 로 발급했는지 확인)"; exit 1; }
install -m 644 "$U/pom.taratps.com.conf" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
# certbot 이 default 사이트에 넣은 같은 도메인 블록과 겹치므로 default 는 끈다(파일은 sites-available 에 남는다)
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== 8. 백엔드 시작 (첫 기동은 Flyway 마이그레이션으로 1~2분)"
systemctl restart pom-api
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q UP; then echo "   UP (${i}0초 이내)"; break; fi
  sleep 10
  [ "$i" = 60 ] && { echo "   10분 안에 안 떴습니다 — journalctl -u pom-api -n 200 확인"; exit 1; }
done
echo "   마이그레이션 버전: $(mysql -N -e 'SELECT MAX(CAST(version AS UNSIGNED)) FROM pom_module.flyway_schema_history')"

echo "== 9. 비밀 파일 정리"
shred -u "$U/pom.env" "$U/db-password.txt" 2>/dev/null || rm -f "$U/pom.env" "$U/db-password.txt"
shred -u "$U/pom_module.sql" 2>/dev/null || rm -f "$U/pom_module.sql"

echo
echo "완료 — https://$DOMAIN/actuator/health , https://$DOMAIN/ , https://$DOMAIN/m"
echo "로그: journalctl -u pom-api -f"
