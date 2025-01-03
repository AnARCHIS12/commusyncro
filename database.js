const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Création de la connexion à la base de données
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// Modèle pour les salons synchronisés
const SyncedChannel = sequelize.define('SyncedChannel', {
    groupId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channelId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guildId: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Modèle pour les portails entre serveurs
const ServerTunnel = sequelize.define('ServerTunnel', {
    sourceGuildId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    sourceChannelId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    targetGuildId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    targetChannelId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    description: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: ''  // Valeur par défaut vide
    },
    inviteCode: {
        type: Sequelize.STRING,
        allowNull: false
    },
    active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});

// Initialisation de la base de données
async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connexion à la base de données établie.');
        
        // Synchroniser les tables sans les recréer
        await sequelize.sync({ force: false });
        console.log('Base de données synchronisée avec succès.');
        
        return true;
    } catch (error) {
        console.error('Erreur de connexion à la base de données:', error);
        return false;
    }
}

// Fonctions pour les salons synchronisés
async function addSyncedChannel(guildId, channelId, groupId) {
    try {
        // Vérifier si le canal existe déjà dans ce groupe
        const existingChannel = await SyncedChannel.findOne({
            where: {
                channelId: channelId,
                groupId: groupId
            }
        });

        if (existingChannel) {
            console.log('Le canal est déjà dans ce groupe:', existingChannel.toJSON());
            return true;
        }

        const channel = await SyncedChannel.create({
            guildId,
            channelId,
            groupId
        });
        console.log('Canal ajouté à la synchronisation:', channel.toJSON());
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du canal:', error);
        return false;
    }
}

async function getSyncedChannels() {
    try {
        const channels = await SyncedChannel.findAll();
        console.log('Canaux trouvés dans la base de données:', channels.map(c => c.toJSON()));
        
        // Organiser les canaux par groupe
        const groupedChannels = new Map();
        channels.forEach(channel => {
            if (!groupedChannels.has(channel.groupId)) {
                groupedChannels.set(channel.groupId, new Set());
            }
            groupedChannels.get(channel.groupId).add(channel.channelId);
        });
        
        console.log('Groupes de canaux:', 
            Array.from(groupedChannels.entries()).map(([groupId, channels]) => ({
                groupe: groupId,
                canaux: Array.from(channels)
            }))
        );
        
        return groupedChannels;
    } catch (error) {
        console.error('Erreur lors de la récupération des canaux synchronisés:', error);
        return new Map();
    }
}

async function getChannelGroup(channelId) {
    try {
        const channel = await SyncedChannel.findOne({
            where: { channelId }
        });
        return channel ? channel.groupId : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du groupe:', error);
        return null;
    }
}

async function removeSyncedChannel(channelId) {
    try {
        await SyncedChannel.destroy({
            where: { channelId }
        });
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du canal:', error);
        return false;
    }
}

// Fonctions pour les portails
async function createPortal(data) {
    try {
        const portal = await ServerTunnel.create({
            sourceGuildId: data.sourceGuildId,
            sourceChannelId: data.sourceChannelId,
            targetGuildId: data.targetGuildId,
            targetChannelId: data.targetChannelId,
            description: data.description || '',  // Utiliser une chaîne vide si pas de description
            inviteCode: data.inviteCode,
            active: data.active
        });
        console.log('Portail créé:', portal.toJSON());
        return portal;
    } catch (error) {
        console.error('Erreur lors de la création du portail:', error);
        return null;
    }
}

async function getPortal(id) {
    try {
        const portal = await ServerTunnel.findByPk(id);
        return portal;
    } catch (error) {
        console.error('Erreur lors de la récupération du portail:', error);
        return null;
    }
}

async function getActivePortals() {
    try {
        const portals = await ServerTunnel.findAll({
            where: {
                active: true
            }
        });
        return portals;
    } catch (error) {
        console.error('Erreur lors de la récupération des portails actifs:', error);
        return [];
    }
}

async function deactivatePortal(inviteCode) {
    try {
        const portal = await ServerTunnel.findOne({
            where: { inviteCode }
        });
        if (portal) {
            await portal.update({ active: false });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur lors de la désactivation du portail:', error);
        return false;
    }
}

async function linkPortal(inviteCode, targetGuildId, targetChannelId) {
    try {
        const portal = await ServerTunnel.findOne({ where: { inviteCode } });
        if (portal) {
            await portal.update({ targetGuildId, targetChannelId });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur lors de la liaison du portail:', error);
        return false;
    }
}

// Nettoyer les canaux invalides
async function cleanInvalidChannels(client) {
    try {
        const channels = await SyncedChannel.findAll();
        
        for (const channel of channels) {
            try {
                const discordChannel = await client.channels.fetch(channel.channelId);
                if (!discordChannel) {
                    await SyncedChannel.destroy({
                        where: { channelId: channel.channelId }
                    });
                    console.log(`Canal supprimé de la base de données: ${channel.channelId}`);
                }
            } catch (error) {
                if (error.code === 10003) { // Unknown Channel
                    await SyncedChannel.destroy({
                        where: { channelId: channel.channelId }
                    });
                    console.log(`Canal invalide supprimé: ${channel.channelId}`);
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du nettoyage des canaux:', error);
    }
}

module.exports = {
    initDatabase,
    addSyncedChannel,
    getSyncedChannels,
    getChannelGroup,
    removeSyncedChannel,
    createPortal,
    getPortal,
    getActivePortals,
    deactivatePortal,
    linkPortal,
    cleanInvalidChannels,
    ServerTunnel,
    SyncedChannel,
    Sequelize
};
