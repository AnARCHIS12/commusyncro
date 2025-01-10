# Guide des Commandes

## Commandes d'Administration

### `/sync`
Synchronise un salon avec le réseau CommuSyncro.

```
Utilisation : /sync group:[groupe]
Permissions requises : ADMINISTRATEUR
Options :
  - group : Identifiant du groupe (obligatoire)
```

**Exemple :**
```
/sync group:revolution
→ Le salon actuel est maintenant synchronisé avec le groupe "revolution"
```

### `/unsync`
Retire le salon du réseau CommuSyncro.

```
Utilisation : /unsync
Permissions requises : ADMINISTRATEUR
```

### `/createtunnel`
Crée un portail permanent entre le salon actuel et un salon dans un autre serveur.

```
Utilisation : /createtunnel serverid:[id] channelid:[id]
Permissions requises : ADMINISTRATEUR
Options :
  - serverid : ID du serveur cible (obligatoire)
  - channelid : ID du salon cible (obligatoire)
```

**Exemple :**
```
/createtunnel serverid:123456789 channelid:987654321
→ Crée un portail vers #general dans le serveur "La Révolution"
```

**Utilisation :**
1. Allez dans le salon source
2. Utilisez la commande `/createtunnel` avec l'ID du serveur et du salon cible
3. Un message avec un bouton "Voyager vers #salon" apparaît
4. Les utilisateurs peuvent cliquer sur le bouton pour rejoindre le serveur cible

**Notes :**
- Le bot doit être présent dans les deux serveurs
- Le bot doit avoir les permissions nécessaires dans les deux salons
- Les invitations sont uniques pour chaque utilisation
- Le portail reste actif jusqu'à ce qu'il soit supprimé

### `/linkchannel`
Connecte le salon actuel à un salon déjà synchronisé.

```
Utilisation : /linkchannel [id_salon]
Permissions requises : ADMINISTRATEUR
Options :
  - id_salon : ID du salon à lier (obligatoire)
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
- Les salons NSFW ne peuvent pas être synchronisés
- Le bot doit avoir les permissions suivantes :
  - Voir les salons
  - Gérer les salons
  - Gérer les messages
  - Créer des invitations
