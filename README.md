# 🏢 ARMA Digital Portal v3.0

**Système professionnel de gestion des rapports de nettoyage**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)]()

---

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Fonctionnalités](#fonctionnalités)
3. [Prérequis](#prérequis)
4. [Installation Rapide](#installation-rapide)
5. [Configuration](#configuration)
6. [Déploiement Production](#déploiement-production)
7. [Rôles et Permissions](#rôles-et-permissions)
8. [API Reference](#api-reference)
9. [Mobile App](#mobile-app)
10. [Maintenance](#maintenance)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      mydomain.com                           │
│              (Nginx Reverse Proxy + SSL)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │   React 19          │      │   FastAPI           │       │
│  │   Dashboard         │◄────►│   Backend           │       │
│  │   (Port 80/443)     │      │   (Port 8000)       │       │
│  └─────────────────────┘      └──────────┬──────────┘       │
│                                           │                 │
│                              ┌────────────▼────────────┐    │
│                              │    PostgreSQL 16         │   │
│                              │    (Port 5432)           │   │
│                              └─────────────────────────┘    │
│                                           │                 │
│                              ┌────────────▼────────────┐    │
│                              │    Redis 7              │    │
│                              │    (Port 6379)          │    │
│                              └─────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technologies

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React + Vite + Tailwind CSS | 19.x / 4.x |
| **Backend** | FastAPI + SQLAlchemy | 0.109+ |
| **Database** | PostgreSQL + asyncpg | 16 / 0.29 |
| **Cache** | Redis | 7.x |
| **Auth** | JWT + bcrypt | - |
| **PDF** | ReportLab | 4.x |
| **Container** | Docker + Docker Compose | - |

---

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité
- JWT tokens avec expiration configurable
- Mots de passe hashés avec bcrypt
- Role-based access control (RBAC)
- Protection CSRF et XSS

### 👥 Gestion des Utilisateurs (3 Rôles)
| Rôle | Description |
|------|-------------|
| **Admin** | Contrôle total, gestion des utilisateurs et stations |
| **Employer** | Création de rapports pour stations assignées |
| **Client** | Visualisation des rapports de sa station uniquement |

### 📊 Dashboard
- KPIs en temps réel
- Graphiques interactifs (Recharts)
- Classement des agents
- Tendances mensuelles

### 📝 Rapports
- Création avec photos AVANT/APRÈS
- Upload d'images direct
- Filtres avancés (ville, zone, date, agent)
- Pagination

### 📄 Génération PDF
- Rapport professionnel par station
- Groupage par zones de nettoyage
- Photos intégrées (optionnel)
- En-tête/pied de page ARMA 
- Téléchargement direct

### 📱 Mobile App (React Native)
- Upload photos depuis caméra
- GPS automatique
- Mode offline
- Sync quand connecté

---

## 📦 Prérequis

### Minimum
- Docker 24.0+
- Docker Compose 2.20+
- 2GB RAM
- 10GB disque

### Recommandé (Production)
- 4GB RAM
- 2 vCPU
- 20GB SSD
- Domaine avec SSL

---

## 🚀 Installation Rapide

### Étape 1 : Télécharger le projet

```bash
# Extraire le ZIP
cd ARMA-portal-v3-complete
```

### Étape 2 : Configurer l'environnement

```bash
# Backend environment
cp backend/.env backend/.env.local
nano backend/.env.local
```

**Variables importantes à modifier :**
```env
# SECURITY - CHANGE THIS!
SECRET_KEY=votre-cle-super-secrete-et-longue-minimum-32-caracteres

# Database (déjà configuré pour Docker)
DATABASE_URL=postgresql+asyncpg://arma_user:arma_password@db:5432/arma_db

# Company info
COMPANY_NAME=ARMA Environnement
COMPANY_LOGO_URL=https://votre-domaine.com/logo.png

# Environment
ENVIRONMENT=production
DEBUG=False
```

### Étape 3 : Lancer les services

```bash
docker-compose up -d
```

Cela démarre :
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend (port 3000)
- Nginx (port 80)

### Étape 4 : Initialiser la base de données

```bash
# Attendre que PostgreSQL soit prêt (30 secondes)
sleep 30

# Créer les tables
docker-compose exec backend python -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
"
```

### Étape 5 : Créer le premier administrateur

```bash
docker-compose exec backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin = User(
            email='admin@ARMA.ma',
            hashed_password=get_password_hash('VotreMotDePasseFort!'),
            full_name='Administrateur ARMA',
            role='admin',
            assigned_stations=['ALL'],
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print('✅ Admin créé: admin@ARMA.ma')

asyncio.run(create_admin())
"
```

### Étape 6 : Accéder à l'application

| URL | Description |
|-----|-------------|
| `http://localhost` | Application Web |
| `http://localhost/api/health` | Health Check |
| `http://localhost/api/docs` | API Documentation (dev mode) |

---

## ⚙️ Configuration Avancée

### Domaine Personnalisé

1. **Pointer votre domaine** vers le serveur (A record → IP du serveur)

2. **Modifier Nginx** (`nginx/nginx.conf`) :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    # ... reste de la configuration
}
```

3. **Redémarrer** :
```bash
docker-compose restart nginx
```

### SSL / HTTPS (Let's Encrypt)

```bash
# Installer certbot
sudo apt install certbot

# Obtenir le certificat
sudo certbot certonly --standalone -d votre-domaine.com

# Copier dans le projet
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem nginx/ssl/

# Mettre à jour nginx.conf pour HTTPS
```

Configuration HTTPS dans `nginx/nginx.conf` :
```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... reste de la config
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 👥 Rôles et Permissions

### Matrice des Permissions

| Fonctionnalité | Admin | Employer | Client |
|----------------|-------|----------|--------|
| **Dashboard** | ✅ Global | ✅ Ses villes | ✅ Sa station |
| **Rapports** | ✅ Tout | ✅ Ses villes | ✅ Sa station |
| **Nouveau Rapport** | ✅ | ✅ | ❌ |
| **Générer PDF** | ✅ | ❌ | ✅ Sa station |
| **Utilisateurs** | ✅ CRUD | ❌ | ❌ |
| **Stations** | ✅ CRUD | ❌ | ❌ |

### Création d'utilisateurs

**Employer** (travaille sur plusieurs villes) :
```json
{
  "email": "employe@ARMA.ma",
  "password": "motdepasse",
  "role": "employer",
  "assigned_stations": ["Casablanca", "Rabat"]
}
```

**Client** (propriétaire d'une station) :
```json
{
  "email": "client@station.ma",
  "password": "motdepasse",
  "role": "client",
  "client_code": "AK1234",
  "client_city": "Casablanca"
}
```

---

## 📡 API Reference

### Authentication
```bash
# Login
curl -X POST http://localhost/api/v1/auth/login   -H "Content-Type: application/x-www-form-urlencoded"   -d "username=admin@ARMA.ma&password=motdepasse"

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { ... }
}
```

### Headers requis
```bash
Authorization: Bearer <token>
Content-Type: application/json
```

### Endpoints principaux

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/login` | Login | ❌ |
| GET | `/auth/me` | Profil | ✅ |
| GET | `/users` | Liste users | ✅ Admin |
| POST | `/users` | Créer user | ✅ Admin |
| GET | `/stations` | Liste stations | ✅ |
| POST | `/stations` | Créer station | ✅ Admin |
| GET | `/reports` | Liste rapports | ✅ |
| POST | `/reports` | Créer rapport | ✅ Employer |
| POST | `/reports/upload-photo` | Upload photo | ✅ Employer |
| POST | `/pdf/generate` | Générer PDF | ✅ |
| GET | `/dashboard/stats` | Statistiques | ✅ Admin/Employer |

---

## 📱 Mobile App

### Prérequis Mobile
- Node.js 20+
- Expo CLI
- Android Studio (pour Android)
- Xcode (pour iOS - Mac uniquement)

### Installation
```bash
cd mobile
npm install
npx expo start
```

### Build Production
```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

---

## 🔧 Maintenance

### Logs
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f nginx
```

### Backup Base de Données
```bash
# Backup
docker-compose exec db pg_dump -U ARMA_user ARMA_db > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U ARMA_user ARMA_db < backup_20250508.sql
```

### Mise à jour
```bash
# Pull latest images
docker-compose pull

# Rebuild et redémarrer
docker-compose down
docker-compose up -d --build
```

### Monitoring
```bash
# Stats containers
docker stats

# Espace disque
docker system df

# Nettoyer
docker system prune -a
```

---

## 🐛 Dépannage

### Problème : "Connection refused" à la base de données
```bash
# Vérifier si PostgreSQL est prêt
docker-compose exec db pg_isready -U ARMA_user

# Si non, attendre et redémarrer
docker-compose restart backend
```

### Problème : "Permission denied" sur uploads
```bash
# Fix permissions
docker-compose exec backend chmod 777 /app/uploads
```

### Problème : Frontend ne charge pas
```bash
# Vérifier les logs
docker-compose logs frontend

# Rebuild
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## 📞 Support

Pour toute question technique :
- 📧 Email : Nasrallahjidou9@gmail.com
- 🌐 Site : https://ARMA.ma

---

## 📄 Licence

**© 2025 ARMA Environnement** — Tous droits réservés.

Ce logiciel est propriétaire et confidentiel. Toute reproduction ou distribution non autorisée est interdite.

---

<div align="center">
  <h3>🏢 ARMA Environnement</h3>
  <p>Solutions professionnelles de nettoyage et maintenance</p>
</div>
