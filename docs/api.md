# Documentation API

## Points d'Entrée REST

### Authentification

```http
POST /api/auth/token
```

Génère un token d'API pour les intégrations externes.

**Corps de la requête :**
```json
{
  "clientId": "votre_client_id",
  "clientSecret": "votre_client_secret"
}
```

**Réponse :**
```json
{
  "token": "jwt_token",
  "expires": "2024-01-03T14:27:47Z"
}
```

### Gestion des Tunnels

#### Création d'un tunnel

```http
POST /api/tunnels
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "name": "tunnel-name",
  "sourceChannel": "channel_id_1",
  "targetChannel": "channel_id_2",
  "bidirectional": true
}
```

#### Liste des tunnels

```http
GET /api/tunnels
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "tunnels": [
    {
      "id": "tunnel_id",
      "name": "tunnel-name",
      "sourceChannel": "channel_id_1",
      "targetChannel": "channel_id_2",
      "status": "active"
    }
  ]
}
```

### Webhooks

#### Configuration d'un webhook

```http
POST /api/webhooks
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "channelId": "target_channel_id",
  "events": ["message", "edit", "delete"],
  "url": "https://your-webhook-url.com"
}
```

## WebSocket API

### Connexion

```javascript
const ws = new WebSocket('wss://api.commusyncro.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'votre_token'
  }));
};
```

### Événements

#### Message synchronisé

```javascript
// Réception
{
  "type": "sync_message",
  "data": {
    "id": "message_id",
    "content": "contenu",
    "author": {
      "id": "user_id",
      "username": "username"
    },
    "channel": "channel_id",
    "timestamp": "2024-01-03T14:27:47Z"
  }
}

// Envoi
{
  "type": "send_message",
  "data": {
    "content": "contenu",
    "channelId": "channel_id"
  }
}
```

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 1001 | Token invalide |
| 1002 | Permission refusée |
| 1003 | Canal introuvable |
| 1004 | Limite de requêtes dépassée |
| 1005 | Maintenance en cours |

## Limites de l'API

- Rate limit : 100 requêtes par minute
- Taille maximale des messages : 2000 caractères
- Connexions WebSocket simultanées : 10 par token
- Durée de validité du token : 24 heures

## Exemples d'Intégration

### Node.js

```javascript
const axios = require('axios');

async function createTunnel() {
  try {
    const response = await axios.post('https://api.commusyncro.com/api/tunnels', {
      name: 'mon-tunnel',
      sourceChannel: 'channel_id_1',
      targetChannel: 'channel_id_2'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Tunnel créé:', response.data);
  } catch (error) {
    console.error('Erreur:', error.response.data);
  }
}
```

### Python

```python
import requests

def create_tunnel():
    url = 'https://api.commusyncro.com/api/tunnels'
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'name': 'mon-tunnel',
        'sourceChannel': 'channel_id_1',
        'targetChannel': 'channel_id_2'
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        print('Tunnel créé:', response.json())
    else:
        print('Erreur:', response.json())
```
