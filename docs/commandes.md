# Guide des Commandes

## Commandes d'Administration

### `/sync`
Synchronise un salon avec le réseau CommuSyncro.

```
Utilisation : /sync
Permissions requises : ADMINISTRATEUR
```

**Exemple :**
```
/sync
→ Le salon actuel est maintenant synchronisé avec le réseau
```

### `/linkchannel`
Connecte le salon actuel à un salon déjà synchronisé.

```
Utilisation : /linkchannel [id_salon]
Permissions requises : ADMINISTRATEUR
Options :
  - id_salon : ID du salon à lier (obligatoire)
```

### `/createtunnel`
Crée un tunnel permanent entre deux salons.

```
Utilisation : /createtunnel [nom] [salon1] [salon2]
Permissions requises : ADMINISTRATEUR
Options :
  - nom : Nom du tunnel (obligatoire)
  - salon1 : Premier salon (obligatoire)
  - salon2 : Deuxième salon (obligatoire)
```

### `/tunnels`
Affiche la liste des tunnels actifs.

```
Utilisation : /tunnels
Permissions requises : ADMINISTRATEUR
```

## Commandes de Modération

### `/mute`
Désactive temporairement la synchronisation pour un utilisateur.

```
Utilisation : /mute [utilisateur] [durée]
Permissions requises : MODÉRATEUR
Options :
  - utilisateur : Membre à muter (obligatoire)
  - durée : Durée en minutes (optionnel, défaut: 60)
```

### `/unmute`
Réactive la synchronisation pour un utilisateur.

```
Utilisation : /unmute [utilisateur]
Permissions requises : MODÉRATEUR
Options :
  - utilisateur : Membre à démuter (obligatoire)
```

## Commandes Utilisateur

### `/status`
Affiche l'état de la synchronisation du salon actuel.

```
Utilisation : /status
Permissions requises : Aucune
```

### `/help`
Affiche la liste des commandes disponibles.

```
Utilisation : /help [commande]
Permissions requises : Aucune
Options :
  - commande : Nom de la commande (optionnel)
```

## Notes importantes

- Les commandes d'administration ne peuvent être utilisées que par les membres ayant la permission ADMINISTRATEUR
- Les commandes de modération nécessitent la permission GÉRER_LES_MESSAGES
- Toutes les commandes sont sensibles à la casse
- Les salons NSFW ne peuvent pas être synchronisés
