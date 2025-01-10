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
async function addSyncedChannel(channelId, groupId, guildId) {
    try {
        // Vérifier si le canal existe déjà dans un groupe
        const existingChannel = await SyncedChannel.findOne({
            where: { channelId: channelId }
        });

        if (existingChannel) {
            return {
                success: false,
                message: "Ce canal est déjà synchronisé dans un groupe"
            };
        }

        // Créer le canal synchronisé
        await SyncedChannel.create({
            channelId: channelId,
            groupId: groupId,
            guildId: guildId
        });

        return {
            success: true,
            message: "Canal ajouté avec succès"
        };
    } catch (error) {
        console.error('Erreur lors de l\'ajout du canal:', error);
        return {
            success: false,
            message: `Erreur: ${error.message}`
        };
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
        console.log('Début du nettoyage des canaux...');
        const channels = await SyncedChannel.findAll();
        console.log(`Vérification de ${channels.length} canaux...`);
        
        let valides = 0;
        let supprimés = 0;
        
        for (const channel of channels) {
            try {
                const discordChannel = await client.channels.fetch(channel.channelId);
                if (discordChannel) {
                    valides++;
                }
            } catch (error) {
                // On ne supprime que si on est sûr que le canal n'existe plus
                if (error.code === 10003) {
                    await SyncedChannel.destroy({
                        where: { channelId: channel.channelId }
                    });
                    supprimés++;
                    console.log(`Canal supprimé: ${channel.channelId}`);
                }
            }
        }
        
        console.log(`Nettoyage terminé: ${valides} canaux valides, ${supprimés} canaux supprimés`);
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
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
