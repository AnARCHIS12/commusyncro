# Guide d'Installation

## Prérequis

- Node.js 16.9.0 ou supérieur
- npm ou yarn
- Un compte Discord développeur
- Les permissions d'administrateur sur les serveurs cibles

## Installation pas à pas

### 1. Création du bot Discord

1. Rendez-vous sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur "New Application"
3. Nommez votre application "CommuSyncro"
4. Allez dans l'onglet "Bot"
5. Cliquez sur "Add Bot"
6. Activez les options suivantes :
   - PRESENCE INTENT
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

### 2. Installation du bot

```bash
# Clonez le dépôt
git clone https://github.com/AnARCHIS12/commusyncro.git
cd commusyncro

# Installez les dépendances
npm install

# Copiez le fichier d'environnement
cp .env.example .env
```

### 3. Configuration

Éditez le fichier `.env` avec vos informations :

```env
TOKEN=votre_token_bot_discord
CLIENT_ID=id_de_votre_application
GUILD_ID=id_de_votre_serveur_test
```

### 4. Démarrage

```bash
# Démarrez le bot
npm start
```

## Vérification de l'installation

1. Invitez le bot sur votre serveur avec le lien généré
2. Vérifiez que le bot est en ligne
3. Testez la commande `/sync` dans un salon

## Résolution des problèmes courants

### Le bot ne se connecte pas
- Vérifiez que le token dans `.env` est correct
- Assurez-vous que les intents sont activés

### Les commandes ne fonctionnent pas
- Réenregistrez les commandes : `npm run deploy-commands`
- Vérifiez les permissions du bot

### Erreurs de connexion
- Vérifiez votre connexion internet
- Assurez-vous que le pare-feu n'empêche pas la connexion
