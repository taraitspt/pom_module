# POM 운영 배포 (pom.taratps.com · 52.78.211.240 · Ubuntu + nginx 1.24)

서버 준비 상태(2026-10-07 확인): AWS **Lightsail** Ubuntu 24.04, 메모리 2GB·디스크 58GB, 접속 `ssh -i C:\Users\HP\al_sm.pem ubuntu@52.78.211.240`. DNS `pom.taratps.com → 52.78.211.240`, 포트 22·80·443 열림, Let's Encrypt 인증서(자동 갱신), nginx 기본 페이지만 떠 있음. Java·MariaDB 미설치. Lightsail 은 **고정 IP(Static IP)를 붙여야** 재시작해도 주소가 안 바뀐다.
루트의 `deploy.sh` 는 옛 SM 운영용이라 쓰지 않는다.

구성: nginx(443) → 정적 화면 `/var/www/pom` + `/api/` 를 `127.0.0.1:8080` Spring Boot(prod) 로. DB 는 같은 서버 MariaDB.

## 0. 로컬에서 빌드

```powershell
cd pom-module-api; .\gradlew.bat build -x test        # build/libs/pom-module-api-0.0.1-SNAPSHOT.jar
cd ..\pom-module-web; npm run build                    # dist/
```

## 1. 서버 1회 설치

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless mariadb-server

# 메모리 2GB 서버라 스왑 2GB 를 둔다(ERP 큰 조회 때 메모리 부족으로 죽지 않게)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo useradd --system --home /opt/pom --shell /usr/sbin/nologin pom
sudo mkdir -p /opt/pom /var/www/pom /etc/pom
sudo chown pom:pom /opt/pom

# DB — 비밀번호는 pom.env 의 DB_PASSWORD 와 같게
sudo mysql -e "CREATE DATABASE pom_module CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pom'@'localhost' IDENTIFIED BY '여기에_비밀번호';
GRANT ALL PRIVILEGES ON pom_module.* TO 'pom'@'localhost'; FLUSH PRIVILEGES;"

# 환경변수 — deploy/pom.env.example 를 채워서
sudo cp pom.env /etc/pom/pom.env && sudo chmod 600 /etc/pom/pom.env && sudo chown root:root /etc/pom/pom.env

# 서비스·사이트
sudo cp pom-api.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable pom-api
sudo cp pom.taratps.com.conf /etc/nginx/sites-available/pom.taratps.com
sudo ln -sf /etc/nginx/sites-available/pom.taratps.com /etc/nginx/sites-enabled/pom.taratps.com
# certbot 이 default 사이트에 넣은 pom.taratps.com 블록이 있으면 지운다(또는 default 링크 제거)
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 1-1. 로컬 데이터 옮기기 (첫 배포 1회, 백엔드를 처음 켜기 **전에**)

`deploy/secret/`(커밋 안 됨)에 준비돼 있다(2026-10-07):
- `pom.env` — 위 `/etc/pom/pom.env` 로 그대로 쓴다. DB 비밀번호·JWT·웹 푸시 키는 운영용으로 새로 만들었고 ERP·Teams 값은 로컬에서 옮겼다.
- `db-password.txt` — `pom.env` 의 `DB_PASSWORD` 와 같은 값. 위 `CREATE USER ... IDENTIFIED BY` 에 넣는다.
- `pom_module.sql` — 로컬 DB 전체 덤프(V144 시점). MariaDB 11.5+ 전용 정렬 `utf8mb4_uca1400_ai_ci` 는 `utf8mb4_unicode_ci` 로 바꿔 두었다(서버 10.11 호환).

```bash
scp deploy/secret/pom_module.sql ubuntu@52.78.211.240:/tmp/
# 서버 — DB·사용자 만든 직후, pom-api 를 켜기 전에
sudo mysql pom_module < /tmp/pom_module.sql && rm /tmp/pom_module.sql
sudo mysql -e "SELECT MAX(version) FROM pom_module.flyway_schema_history"   # 144
```

그 다음 `pom-api` 를 켜면 Flyway 가 V145~ 를 이어서 적용한다(시드 admin 은 이미 있는 계정이라 새로 안 생긴다).
덤프에는 사용자 비밀번호 해시·거래처 정보가 들어 있다 — 옮긴 뒤 서버 `/tmp` 와 로컬 사본을 지운다.

## 2. 매 배포

한 번에 하려면(2026-10-13): 저장소 루트에서 `powershell -ExecutionPolicy Bypass -File .deployelease.ps1` — 빌드 → scp → 서버 교체 → 재시작 → health 확인까지. `-Web`(화면만, 무중단) / `-Api`(백엔드만) / `-Key <pem>`(기본 `POM_SSH_KEY` 환경변수 또는 홈의 `al_sm.pem`). 아래는 손으로 할 때의 순서다.

```bash
# 로컬 → 서버 복사 (예: scp)
scp pom-module-api/build/libs/pom-module-api-0.0.1-SNAPSHOT.jar ubuntu@52.78.211.240:/tmp/pom-module-api.jar
scp -r pom-module-web/dist/* ubuntu@52.78.211.240:/tmp/pom-dist/

# 서버
sudo install -o pom -g pom -m 644 /tmp/pom-module-api.jar /opt/pom/pom-module-api.jar
sudo systemctl restart pom-api && journalctl -u pom-api -f      # "Started PomModuleApplication" 확인
sudo rsync -a --delete --exclude downloads/ /tmp/pom-dist/ /var/www/pom/   # downloads/ 의 운영 APK 를 지우지 않게
```

첫 기동 때 Flyway 가 빈 `pom_module` 에 마이그레이션 전체를 적용한다.

## 3. 확인

- `https://pom.taratps.com/actuator/health` → `{"status":"UP"}`
- `https://pom.taratps.com/` 로그인 화면, `https://pom.taratps.com/m` 모바일 화면
- 관리자 > ERP 동기화가 성공하는지(= 이 서버에서 ERP 로 접속되는지)

## 꼭 챙길 것

1. **ERP 방화벽** — ERP(39.125.168.136:15253)가 이 서버 IP 52.78.211.240 의 접속을 받아야 한다. 막혀 있으면 앱은 뜨지만 매출·생산·채권 화면이 전부 비고 사용자 동기화도 안 된다.
2. **시드 관리자 비밀번호** — 빈 DB 로 시작하면 `admin / admin123` 이 생긴다. 첫 로그인 직후 바꾼다.
3. **첫 로그인 경로** — ERP 동기화로 생기는 계정은 1회용 비밀번호(Teams DM)로만 첫 로그인할 수 있다. `TARA_NOTIFY_API_KEY`(IT지원팀 공용 알림 API 키, 이 서버 IP 등록 필요)를 비우면 아무도 첫 로그인을 못 한다.
4. **로컬 데이터** — 1-1 절차로 옮긴다. 안 옮기고 빈 DB 로 시작하면 월매출계획·영업활동·권한 설정이 없다.
5. **웹 푸시 키** — 로컬엔 키가 없어 운영용으로 새로 만들었다(`deploy/secret/pom.env`). 구독은 도메인에 묶이므로 어차피 폰마다 알림을 한 번 다시 허용한다. **한 번 넣은 키는 바꾸지 않는다.**
6. **메일(SMTP_PASSWORD)** — 로컬에도 비어 있어 비워 뒀다. 2차인증(MFA)을 켠 사용자는 코드 메일을 못 받아 로그인이 막힌다(2026-10-07 로컬 기준 MFA 사용자 0명). 켜게 되면 Gmail 앱 비밀번호를 넣는다.
7. **APK** — 서버가 뜬 뒤 `npm run app:android`(기본 주소가 이미 `https://pom.taratps.com`)로 한 번 빌드해 `/var/www/pom/downloads/tara-pom.apk` 에 둔다. 이후 화면 변경은 서버 배포만으로 반영된다.
