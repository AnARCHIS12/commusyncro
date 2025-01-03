const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ActivityType, AttachmentBuilder } = require('discord.js');
const { initDatabase, addSyncedChannel, getSyncedChannels, addServerTunnel, getServerTunnels, removeSyncedChannel, createPortal, getPortal, linkPortal, ServerTunnel, Sequelize, getActivePortals, getChannelGroup, SyncedChannel, deactivatePortal } = require('./database');
require('dotenv').config();
const axios = require('axios');
const { Buffer } = require('buffer');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel],
    // Ajout des options de reconnexion
    failIfNotExists: false,
    retryLimit: 3,
    presence: {
        status: 'online',
        activities: [{
            name: 'la révolution',
            type: 'WATCHING'
        }]
    }
});

// Constantes thématiques
const ROUGE_COMMUNISTE = '#FF0000';
const MARTEAU_FAUCILLE = '☭';
const POING = '✊';
const DRAPEAU = '🚩';
const MONDE = '🌍';

// Map pour stocker les salons synchronisés (chargée depuis la base de données)
let syncedChannels = new Map();
// Map pour stocker les tunnels entre serveurs (chargée depuis la base de données)
let serverTunnels = new Map();

// Définition des commandes slash
const commands = [
    new SlashCommandBuilder()
        .setName('createtunnel')
        .setDescription(`${MONDE} Crée un passage pour nos camarades`)
        .addStringOption(option =>
            option.setName('serverid')
            .setDescription(`${DRAPEAU} ID du serveur cible`)
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('channelid')
            .setDescription(`${MARTEAU_FAUCILLE} ID du salon cible`)
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('sync')
        .setDescription(`${MARTEAU_FAUCILLE} Unifie ce salon avec la cause commune`)
        .addStringOption(option =>
            option.setName('group')
            .setDescription('Identifiant du groupe')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('unsync')
        .setDescription(`${POING} Retire ce salon de la cause commune`),
];

// Configuration des commandes slash
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`${MARTEAU_FAUCILLE} Le bot est prêt ! Connecté en tant que ${client.user.tag}`);
    
    try {
        // Initialiser la base de données
        const dbInitialized = await initDatabase();
        if (!dbInitialized) {
            console.error('Erreur lors de l\'initialisation de la base de données. Le bot ne peut pas démarrer.');
            process.exit(1);
        }

        // Nettoyer les canaux invalides au démarrage
        await cleanInvalidChannels(client);

        // Enregistrer les commandes globalement
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Commandes slash enregistrées globalement');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    }
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('portal_')) {
            try {
                const portalId = interaction.customId.replace('portal_', '');
                const portal = await getPortal(portalId);

                if (!portal) {
                    return interaction.reply({
                        content: `${POING} Ce portail n'existe plus, camarade !`,
                        flags: ['Ephemeral']
                    });
                }

                const targetGuild = client.guilds.cache.get(portal.targetGuildId);
                const targetChannel = targetGuild?.channels.cache.get(portal.targetChannelId);

                if (!targetGuild || !targetChannel) {
                    return interaction.reply({
                        content: `${POING} Le serveur ou le salon de destination n'existe plus !`,
                        flags: ['Ephemeral']
                    });
                }

                // Créer une invitation pour le salon cible
                const invite = await targetChannel.createInvite({
                    maxAge: 0,
                    maxUses: 1,
                    unique: true,
                    reason: `Portail utilisé par ${interaction.user.tag}`
                });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel(`Rejoindre ${targetGuild.name}`)
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.gg/${invite.code}`)
                    );

                await interaction.reply({
                    content: `${MONDE} Voici votre passage vers ${targetGuild.name} (#${targetChannel.name}) ! ${MARTEAU_FAUCILLE}`,
                    components: [row],
                    flags: ['Ephemeral']
                });
            } catch (error) {
                console.error('Erreur lors de l\'utilisation du portail:', error);
                await interaction.reply({
                    content: `${POING} Une erreur est survenue lors de l'utilisation du portail.`,
                    flags: ['Ephemeral']
                });
            }
        }
    }

    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'sync') {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                flags: ['Ephemeral']
            });
        }

        const groupId = interaction.options.getString('group');
        const channel = interaction.channel;

        try {
            const success = await addSyncedChannel(interaction.guild.id, channel.id, groupId);
            
            if (success) {
                await interaction.reply({
                    content: `${MARTEAU_FAUCILLE} Le canal a été synchronisé avec succès dans le groupe "${groupId}".`,
                    flags: ['Ephemeral']
                });
            } else {
                await interaction.reply({
                    content: `${POING} Une erreur est survenue lors de la synchronisation du canal.`,
                    flags: ['Ephemeral']
                });
            }
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors de la synchronisation du canal.`,
                flags: ['Ephemeral']
            });
        }
    }

    else if (commandName === 'unsync') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                flags: ['Ephemeral']
            });
        }

        try {
            await removeSyncedChannel(interaction.channel.id);
            await interaction.reply({
                content: `${MONDE} Ce salon a été retiré de la cause commune ! ${MARTEAU_FAUCILLE}`,
                flags: ['Ephemeral']
            });
        } catch (error) {
            console.error('Erreur lors du retrait du salon:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors du retrait du salon.`,
                flags: ['Ephemeral']
            });
        }
    }

    else if (commandName === 'createtunnel') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                flags: ['Ephemeral']
            });
        }

        const targetGuildId = interaction.options.getString('serverid');
        const targetChannelId = interaction.options.getString('channelid');

        try {
            // Vérifier le serveur cible
            const targetGuild = client.guilds.cache.get(targetGuildId);
            if (!targetGuild) {
                return interaction.reply({
                    content: `${POING} Camarade, je ne suis pas présent dans le serveur cible !`,
                    flags: ['Ephemeral']
                });
            }

            // Vérifier le salon cible
            const targetChannel = targetGuild.channels.cache.get(targetChannelId);
            if (!targetChannel || !targetChannel.isTextBased()) {
                return interaction.reply({
                    content: `${POING} Camarade, le salon cible n'existe pas ou n'est pas un salon textuel !`,
                    flags: ['Ephemeral']
                });
            }

            // Vérifier les permissions dans le salon cible
            const permissions = targetChannel.permissionsFor(targetGuild.members.me);
            if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
                return interaction.reply({
                    content: `${POING} Camarade, je n'ai pas les autorisations nécessaires dans le salon cible !`,
                    flags: ['Ephemeral']
                });
            }

            // Créer une invitation pour le salon source
            const sourceInvite = await interaction.channel.createInvite({
                maxAge: 0,
                maxUses: 0,
                unique: true,
                reason: `Portail créé par ${interaction.user.tag}`
            });

            // Créer le portail
            const portal = await createPortal({
                sourceGuildId: interaction.guild.id,
                sourceChannelId: interaction.channel.id,
                targetGuildId: targetGuild.id,
                targetChannelId: targetChannel.id,
                description: `Passage vers ${targetGuild.name}`,
                inviteCode: sourceInvite.code,
                active: true
            });

            if (!portal) {
                return interaction.reply({
                    content: `${POING} Une erreur est survenue lors de la création du portail.`,
                    flags: ['Ephemeral']
                });
            }

            // Créer et envoyer le message
            const message = await createPortalMessage(portal, targetGuild, targetChannel);
            await interaction.channel.send(message);

            await interaction.reply({
                content: `${MONDE} Le passage révolutionnaire a été créé avec succès vers ${targetGuild.name} (#${targetChannel.name}) ! ${MARTEAU_FAUCILLE}`,
                flags: ['Ephemeral']
            });
        } catch (error) {
            console.error('Erreur lors de la création du portail:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors de la création du portail.`,
                flags: ['Ephemeral']
            });
        }
    }
});

async function createPortalMessage(portal, guild, channel) {
    const embed = new EmbedBuilder()
        .setColor(ROUGE_COMMUNISTE)
        .setTitle(`${MONDE} Portail vers ${guild.name}`)
        .setDescription(portal.description)
        .addFields(
            { name: 'Canal', value: `#${channel.name}`, inline: true },
            { name: 'Serveur', value: guild.name, inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`portal_${portal.id}`)
                .setLabel(`Voyager vers #${channel.name}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🌟')
        );

    return { embeds: [embed], components: [row] };
}

// Extraire l'ID du GIF Tenor
function getTenorId(url) {
    // Format: https://tenor.com/view/something-something-number
    const matches = url.match(/\/view\/[^-]+-(\d+)/);
    return matches ? matches[1] : null;
}

// Obtenir l'URL directe du GIF
async function getTenorGifUrl(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const match = html.match(/"contentUrl":\s*"([^"]+)"/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du GIF:', error);
        return null;
    }
}

// Cache pour les webhooks
const webhookCache = new Map();

// Obtenir ou créer un webhook pour un canal
async function getWebhookForChannel(channel) {
    // Vérifier le cache
    if (webhookCache.has(channel.id)) {
        return webhookCache.get(channel.id);
    }

    try {
        // Chercher un webhook existant
        let webhook = await channel.fetchWebhooks()
            .then(hooks => hooks.find(hook => hook.owner.id === client.user.id));
        
        // Créer un nouveau webhook si nécessaire
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'CommuSyncro',
                avatar: client.user.displayAvatarURL()
            });
        }

        // Mettre en cache
        webhookCache.set(channel.id, webhook);
        return webhook;
    } catch (error) {
        console.error(`Erreur lors de la création du webhook pour ${channel.id}:`, error);
        return null;
    }
}

// Fonction pour envoyer un message avec retry
async function sendWebhookMessage(webhook, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await webhook.send(options);
            return true;
        } catch (error) {
            console.error(`Tentative ${i + 1}/${maxRetries} échouée:`, error);
            if (i === maxRetries - 1) {
                throw error;
            }
            // Attendre avant de réessayer (1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
    return false;
}

// Synchronisation des messages
client.on('messageCreate', async (message) => {
    try {
        // Ignorer les messages du bot
        if (message.author.bot) return;

        // Récupérer le groupe du canal
        const groupId = await getChannelGroup(message.channel.id);
        if (!groupId) return; // Le canal n'est pas synchronisé

        // Récupérer tous les canaux du groupe
        const syncedChannels = await getSyncedChannels();
        const channelsInGroup = syncedChannels.get(groupId);
        
        if (!channelsInGroup) return;

        // Supprimer le message original
        try {
            await message.delete();
        } catch (error) {
            console.error('Erreur lors de la suppression du message:', error);
        }

        // Préparer les options de base du webhook
        const webhookOptions = {
            username: message.member.displayName,
            avatarURL: message.author.displayAvatarURL()
        };

        // Envoyer à tous les canaux
        for (const channelId of channelsInGroup) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (!channel) continue;

                const webhook = await getWebhookForChannel(channel);
                if (!webhook) continue;

                // 1. Message avec image
                if (message.attachments.size > 0) {
                    const attachment = message.attachments.first();
                    let retries = 3;
                    
                    while (retries > 0) {
                        try {
                            // Télécharger l'image avec axios
                            const response = await axios({
                                method: 'get',
                                url: attachment.url,
                                responseType: 'arraybuffer',
                                timeout: 5000,
                                headers: {
                                    'User-Agent': 'Discord Bot'
                                }
                            });
                            
                            // Envoyer l'image comme fichier
                            await webhook.send({
                                ...webhookOptions,
                                content: message.content || '',
                                files: [{
                                    attachment: response.data,
                                    name: attachment.name
                                }]
                            });

                            // Si on arrive ici, tout s'est bien passé
                            break;
                        } catch (error) {
                            console.error(`Tentative ${4-retries}/3 échouée:`, error.message);
                            retries--;
                            if (retries > 0) {
                                // Attendre avant de réessayer (1s, puis 2s, puis 3s)
                                await new Promise(resolve => setTimeout(resolve, (4-retries) * 1000));
                            }
                        }
                    }

                    // Attendre entre chaque message
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                // 2. GIF Tenor
                else if (message.content && message.content.includes('tenor.com')) {
                    await webhook.send({
                        ...webhookOptions,
                        content: message.content
                    });
                }
                // 3. Message texte normal
                else if (message.content) {
                    await webhook.send({
                        ...webhookOptions,
                        embeds: [{
                            color: 0xFF0000,
                            description: message.content,
                            footer: {
                                text: `☭ Camarade du serveur ${message.guild.name} ☭`,
                                icon_url: message.guild.iconURL({ size: 16 })
                            }
                        }]
                    });
                }

            } catch (error) {
                console.error(`Erreur pour le canal ${channelId}:`, error);
            }
        }

    } catch (error) {
        console.error('Erreur lors de la synchronisation du message:', error);
    }
});

// Événement quand quelqu'un rejoint via une invitation
client.on('guildMemberAdd', async member => {
    try {
        // Récupérer l'invitation utilisée
        const invites = await member.guild.invites.fetch();
        const usedInvite = invites.find(invite => invite.uses > 0);
        
        if (!usedInvite) return;

        // Vérifier si c'est un portail
        const portal = await getPortal(usedInvite.channelId);
        if (!portal) return;

        // Si c'est la première utilisation, configurer le portail de destination
        if (!portal.targetGuildId) {
            await linkPortal(usedInvite.code, member.guild.id, member.guild.systemChannel?.id || member.guild.channels.cache.first()?.id);
        }

        // Trouver le salon de destination
        const targetChannel = client.channels.cache.get(portal.targetChannelId);
        if (!targetChannel) return;

        // Créer une invitation vers le salon de destination
        const returnInvite = await targetChannel.createInvite({
            maxAge: 300, // 5 minutes
            maxUses: 1,
            unique: true
        });

        // Envoyer le message avec le portail retour
        const portalMessage = new EmbedBuilder()
            .setColor(ROUGE_COMMUNISTE)
            .setTitle(`${MARTEAU_FAUCILLE} Portail Interdimensionnel !`)
            .setDescription(`Bienvenue camarade ${member.user.tag} !\n\nVoici votre portail de retour : https://discord.gg/${returnInvite.code}\n⚠️ Ce portail expire dans 5 minutes !`)
            .setTimestamp();

        await member.send({ embeds: [portalMessage] });
    } catch (error) {
        console.error('Erreur lors de la gestion du portail:', error);
    }
});

// Gestion des erreurs de connexion
client.on('error', error => {
    console.error('Erreur Discord:', error);
    // Tentative de reconnexion
    setTimeout(() => {
        console.log('Tentative de reconnexion...');
        client.login(process.env.TOKEN);
    }, 5000);
});

client.on('disconnect', () => {
    console.log('Déconnecté de Discord. Tentative de reconnexion...');
    setTimeout(() => {
        client.login(process.env.TOKEN);
    }, 5000);
});

// Nettoyage des canaux invalides
async function cleanInvalidChannels(client) {
    const syncedChannels = await getSyncedChannels();
    for (const groupId in syncedChannels) {
        const channelsInGroup = syncedChannels[groupId];
        for (const channelId of channelsInGroup) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (!channel) {
                    console.log(`Canal introuvable, nettoyage: ${channelId}`);
                    await removeSyncedChannel(channelId);
                    webhookCache.delete(channelId);
                }
            } catch (error) {
                if (error.code === 10003) { // Unknown Channel
                    console.log(`Canal invalide, nettoyage: ${channelId}`);
                    await removeSyncedChannel(channelId);
                    webhookCache.delete(channelId);
                } else {
                    console.error(`Erreur lors du nettoyage du canal ${channelId}:`, error);
                }
            }
        }
    }
}

client.login(process.env.TOKEN);
