# ☭ CommuSyncro - L'Unificateur de Serveurs Discord ☭

<div align="center">

<img src="assets/logo.svg" alt="Logo CommuSyncro" width="200" height="200"/>

[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?color=7289DA&logo=discord&logoColor=white)](https://discord.gg/your-invite)
[![GitHub license](https://img.shields.io/github/license/AnARCHIS12/commusyncro)](https://github.com/AnARCHIS12/commusyncro/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/AnARCHIS12/commusyncro)](https://github.com/AnARCHIS12/commusyncro/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/AnARCHIS12/commusyncro)](https://github.com/AnARCHIS12/commusyncro/issues)
[![Node.js Version](https://img.shields.io/node/v/discord.js)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org)

> *"De chaque serveur selon ses moyens, à chaque serveur selon ses besoins !"*

[Documentation](#-documentation) •
[Installation](#-installation) •
[Fonctionnalités](#-fonctionnalités) •
[Contribution](#-contribution) •
[Support](#-support)

</div>

## 📖 Documentation

La documentation complète est disponible dans le dossier [docs/](docs/) :

- 📥 [Guide d'Installation](docs/installation.md)
- 🛠️ [Guide des Commandes](docs/commandes.md)
- ⚙️ [Guide de Configuration](docs/configuration.md)
- 🔌 [Documentation API](docs/api.md)

## ⚡ Installation Rapide

```bash
# Clonez le dépôt
git clone https://github.com/AnARCHIS12/commusyncro.git
cd commusyncro

# Installez les dépendances
npm install

# Configurez le bot
cp .env.example .env
# Éditez .env avec votre token Discord

# Lancez le bot
npm start
```

Pour une installation détaillée, consultez le [Guide d'Installation](docs/installation.md).

## 🚀 Fonctionnalités

### Commandes Principales

| Commande | Description | Documentation |
|----------|-------------|---------------|
| `/sync` | Synchronise un salon | [En savoir plus](docs/commandes.md#sync) |
| `/linkchannel` | Connecte deux salons | [En savoir plus](docs/commandes.md#linkchannel) |
| `/createtunnel` | Crée un tunnel permanent | [En savoir plus](docs/commandes.md#createtunnel) |
| `/tunnels` | Liste les tunnels actifs | [En savoir plus](docs/commandes.md#tunnels) |

Pour la liste complète des commandes, consultez le [Guide des Commandes](docs/commandes.md).

## 🛠️ Configuration

La configuration se fait via le fichier `.env` et les fichiers de configuration dans `config/`.
Pour plus de détails, consultez le [Guide de Configuration](docs/configuration.md).

## 🔌 API

CommuSyncro propose une API REST et WebSocket pour les intégrations externes.
Consultez la [Documentation API](docs/api.md) pour plus d'informations.

## 🤝 Contribution

Nous accueillons chaleureusement toutes les contributions ! Voici comment participer :

1. 🍴 Forkez le projet
2. 🌿 Créez votre branche (`git checkout -b feature/AmeliorationIncroyable`)
3. 💾 Committez vos changements (`git commit -m 'Ajout: Fonctionnalité incroyable'`)
4. 📤 Pushez vers la branche (`git push origin feature/AmeliorationIncroyable`)
5. 🔄 Ouvrez une Pull Request

Consultez notre [Guide de Contribution](docs/contribution.md) pour plus de détails.

## 💬 Support

- [Documentation Complète](docs/)
- [Serveur Discord](https://discord.gg/your-invite)
- [FAQ](https://github.com/AnARCHIS12/commusyncro/wiki/FAQ)

### Signalement de bugs

Utilisez le [système d'issues](https://github.com/AnARCHIS12/commusyncro/issues) de GitHub en suivant le template fourni.

## 📜 Licence

CommuSyncro est distribué sous la licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus d'informations.

---

<div align="center">

**[⭐ Star le projet](https://github.com/AnARCHIS12/commusyncro)** •
**[🐛 Signaler un bug](https://github.com/AnARCHIS12/commusyncro/issues)** •
**[💡 Suggérer une fonctionnalité](https://github.com/AnARCHIS12/commusyncro/issues)**

Fait avec ❤️ par la communauté CommuSyncro

</div>
