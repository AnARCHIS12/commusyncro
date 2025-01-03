const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialisation de la base de données SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// Modèle pour les salons synchronisés
const SyncedChannel = sequelize.define('SyncedChannel', {
    channelId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    groupId: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Modèle pour les tunnels entre serveurs
const ServerTunnel = sequelize.define('ServerTunnel', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    inviteUrl: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Synchronisation des modèles avec la base de données
async function initDatabase() {
    try {
        await sequelize.sync();
        console.log('✅ Base de données synchronisée');
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation de la base de données:', error);
    }
}

// Fonctions d'aide pour la gestion des salons synchronisés
async function addSyncedChannel(channelId, groupId) {
    try {
        await SyncedChannel.create({ channelId, groupId });
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du salon:', error);
        return false;
    }
}

async function getSyncedChannels() {
    try {
        const channels = await SyncedChannel.findAll();
        const syncMap = new Map();
        
        channels.forEach(channel => {
            if (!syncMap.has(channel.groupId)) {
                syncMap.set(channel.groupId, new Set());
            }
            syncMap.get(channel.groupId).add(channel.channelId);
        });
        
        return syncMap;
    } catch (error) {
        console.error('Erreur lors de la récupération des salons:', error);
        return new Map();
    }
}

// Fonctions d'aide pour la gestion des tunnels
async function addServerTunnel(guildId, description, inviteUrl) {
    try {
        await ServerTunnel.create({ guildId, description, inviteUrl });
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du tunnel:', error);
        return false;
    }
}

async function getServerTunnels(guildId) {
    try {
        const tunnels = await ServerTunnel.findAll({
            where: { guildId }
        });
        const tunnelMap = new Map();
        
        tunnels.forEach(tunnel => {
            tunnelMap.set(tunnel.description, tunnel.inviteUrl);
        });
        
        return tunnelMap;
    } catch (error) {
        console.error('Erreur lors de la récupération des tunnels:', error);
        return new Map();
    }
}

async function removeSyncedChannel(channelId) {
    try {
        await SyncedChannel.destroy({
            where: { channelId }
        });
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du salon:', error);
        return false;
    }
}

async function removeServerTunnel(guildId, description) {
    try {
        await ServerTunnel.destroy({
            where: { guildId, description }
        });
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du tunnel:', error);
        return false;
    }
}

module.exports = {
    initDatabase,
    addSyncedChannel,
    getSyncedChannels,
    addServerTunnel,
    getServerTunnels,
    removeSyncedChannel,
    removeServerTunnel
};
