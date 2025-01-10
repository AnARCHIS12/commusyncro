# Guide de Configuration

## Configuration du Bot

### Variables d'Environnement

Le fichier `.env` contient les configurations sensibles :

```env
# Configuration Discord
TOKEN=votre_token_bot
CLIENT_ID=id_application
GUILD_ID=id_serveur_test

# Configuration Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=commusyncro
DB_USER=user
DB_PASSWORD=password

# Configuration Webhook
WEBHOOK_SECRET=votre_secret
```

### Configuration des Messages

Fichier : `config/messages.js`
```javascript
module.exports = {
  // Couleurs des embeds
  colors: {
    success: '#00FF00',
    error: '#FF0000',
    info: '#0099FF'
  },
  
  // Messages système
  system: {
    ready: 'Bot opérationnel !',
    error: 'Une erreur est survenue',
    maintenance: 'Maintenance en cours'
  },
  
  // Messages de synchronisation
  sync: {
    success: 'Salon synchronisé avec succès',
    error: 'Erreur lors de la synchronisation',
    already: 'Ce salon est déjà synchronisé'
  }
}
```

## Personnalisation

### Style des Messages

Fichier : `config/embeds.js`
```javascript
module.exports = {
  // Template de base
  default: {
    footer: {
      text: 'Powered by CommuSyncro',
      icon_url: 'assets/logo.png'
    },
    timestamp: true
  },
  
  // Template pour les messages synchronisés
  sync: {
    author: {
      name: '{username}',
      icon_url: '{avatar}'
    },
    color: '#FF0000'
  }
}
```

### Permissions

Fichier : `config/permissions.js`
```javascript
module.exports = {
  // Rôles requis
  roles: {
    admin: ['ADMINISTRATEUR'],
    mod: ['GÉRER_LES_MESSAGES', 'GÉRER_LE_SALON'],
    user: []
  },
  
  // Commandes par rôle
  commands: {
    sync: 'admin',
    mute: 'mod',
    status: 'user'
  }
}
```

## Sécurité

### Rate Limiting

Fichier : `config/limits.js`
```javascript
module.exports = {
  commands: {
    sync: {
      timeout: 5000,  // 5 secondes
      max: 3         // 3 utilisations max
    },
    message: {
      timeout: 1000,  // 1 seconde
      max: 5         // 5 messages max
    }
  }
}
```

### Filtres

Fichier : `config/filters.js`
```javascript
module.exports = {
  // Mots interdits
  blacklist: [
    'spam',
    'publicité'
  ],
  
  // Patterns regex
  patterns: {
    invite: /discord\.gg\/[a-zA-Z0-9]+/,
    url: /(https?:\/\/[^\s]+)/g
  }
}
```

## Maintenance

### Logs

Configuration de Winston dans `config/logging.js` :
```javascript
module.exports = {
  level: 'info',
  format: 'json',
  files: {
    error: 'logs/error.log',
    combined: 'logs/combined.log'
  }
}
```

### Backup

Configuration des sauvegardes dans `config/backup.js` :
```javascript
module.exports = {
  enabled: true,
  interval: '0 0 * * *',  // Tous les jours à minuit
  path: 'backups/',
  retention: 7            // Garde 7 jours de backup
}
```
