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
        .setName('nettoyercanaux')
        .setDescription('☭ Nettoie la base de données des canaux invalides pour maintenir l\'ordre communiste !')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
        .setName('createtunnel')
        .setDescription('🌍 Crée un tunnel de communication entre les serveurs camarades')
        .addStringOption(option =>
            option.setName('serverid')
            .setDescription('🏰 ID du serveur camarade à connecter')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('channelid')
            .setDescription('📢 ID du canal camarade à connecter')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
        .setName('sync')
        .setDescription('☭ Synchronise ce canal avec un groupe communiste')
        .addStringOption(option =>
            option.setName('groupe')
            .setDescription('Le groupe à rejoindre')
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
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

        console.log('Nettoyage des canaux invalides...');
        await cleanInvalidChannels(client);
        console.log('Nettoyage terminé');

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

    if (commandName === 'nettoyercanaux') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF0000,
                    description: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                    footer: {
                        text: interaction.guild.name,
                        icon_url: interaction.guild.iconURL()
                    }
                }],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });
        
        try {
            console.log('Début du nettoyage forcé des canaux...');
            const channels = await SyncedChannel.findAll();
            let deletedCount = 0;
            let validCount = 0;
            let invalidChannels = [];

            for (const channel of channels) {
                try {
                    const discordChannel = await client.channels.fetch(channel.channelId);
                    if (discordChannel) {
                        validCount++;
                    }
                } catch (error) {
                    if (error.code === 10003 || error.code === 404) {
                        await SyncedChannel.destroy({
                            where: { channelId: channel.channelId }
                        });
                        deletedCount++;
                        invalidChannels.push(channel.channelId);
                        console.log(`Canal invalide supprimé: ${channel.channelId}`);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`${MARTEAU_FAUCILLE} Rapport de Nettoyage des Canaux`)
                .setDescription('Le nettoyage des canaux est terminé !')
                .addFields(
                    {
                        name: '✅ Canaux Valides',
                        value: `${validCount} canaux`,
                        inline: true
                    },
                    {
                        name: '🗑️ Canaux Supprimés',
                        value: `${deletedCount} canaux`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: interaction.guild.name,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            if (deletedCount > 0) {
                embed.addFields({
                    name: '📋 Détails des canaux supprimés',
                    value: invalidChannels.map(id => `\`${id}\``).join('\n')
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
            await interaction.editReply({
                embeds: [{
                    color: 0xFF0000,
                    description: `${POING} Une erreur est survenue lors du nettoyage: ${error.message}`,
                    footer: {
                        text: interaction.guild.name,
                        icon_url: interaction.guild.iconURL()
                    }
                }]
            });
        }
    }

    if (commandName === 'sync') {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                ephemeral: true 
            });
        }

        const groupId = interaction.options.getString('groupe');

        try {
            const result = await addSyncedChannel(
                interaction.channel.id,
                groupId,
                interaction.guild.id
            );

            if (result.success) {
                await interaction.reply({
                    content: `${MARTEAU_FAUCILLE} ${result.message} ! Le canal ${interaction.channel} est maintenant synchronisé dans le groupe "${groupId}".`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `${POING} ${result.message}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors de la synchronisation.`,
                ephemeral: true
            });
        }
    }

    else if (commandName === 'unsync') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                ephemeral: true
            });
        }

        try {
            await removeSyncedChannel(interaction.channel.id);
            await interaction.reply({
                content: `${MONDE} Ce salon a été retiré de la cause commune ! ${MARTEAU_FAUCILLE}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Erreur lors du retrait du salon:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors du retrait du salon.`,
                ephemeral: true
            });
        }
    }

    else if (commandName === 'createtunnel') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                ephemeral: true
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
                    ephemeral: true
                });
            }

            // Vérifier le salon cible
            const targetChannel = targetGuild.channels.cache.get(targetChannelId);
            if (!targetChannel || !targetChannel.isTextBased()) {
                return interaction.reply({
                    content: `${POING} Camarade, le salon cible n'existe pas ou n'est pas un salon textuel !`,
                    ephemeral: true
                });
            }

            // Vérifier les permissions dans le salon cible
            const permissions = targetChannel.permissionsFor(targetGuild.members.me);
            if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
                return interaction.reply({
                    content: `${POING} Camarade, je n'ai pas les autorisations nécessaires dans le salon cible !`,
                    ephemeral: true
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
                    ephemeral: true
                });
            }

            // Créer et envoyer le message
            const message = await createPortalMessage(portal, targetGuild, targetChannel);
            await interaction.channel.send(message);

            await interaction.reply({
                content: `${MONDE} Le passage révolutionnaire a été créé avec succès vers ${targetGuild.name} (#${targetChannel.name}) ! ${MARTEAU_FAUCILLE}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Erreur lors de la création du portail:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors de la création du portail.`,
                ephemeral: true
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

// Fonction pour créer un nouveau webhook pour chaque message
async function createWebhookForMessage(channel) {
    try {
        const webhook = await channel.createWebhook({
            name: 'CommuSyncro-' + Date.now(),
            avatar: client.user.displayAvatarURL()
        });
        return webhook;
    } catch (error) {
        console.error(`Erreur lors de la création du webhook pour ${channel.id}:`, error);
        return null;
    }
}

// Fonction pour découper un message long
function splitLongMessage(content, maxLength = 1900) {
    const parts = [];
    let currentPart = '';
    
    const lines = content.split('\n');
    for (const line of lines) {
        if (currentPart.length + line.length + 1 > maxLength) {
            if (currentPart) {
                parts.push(currentPart);
                currentPart = '';
            }
            // Si une seule ligne est trop longue, la découper
            if (line.length > maxLength) {
                let remainingLine = line;
                while (remainingLine.length > 0) {
                    parts.push(remainingLine.slice(0, maxLength));
                    remainingLine = remainingLine.slice(maxLength);
                }
            } else {
                currentPart = line;
            }
        } else {
            if (currentPart) currentPart += '\n';
            currentPart += line;
        }
    }
    if (currentPart) {
        parts.push(currentPart);
    }
    return parts;
}

// Fonction pour décider si on utilise un embed
function shouldUseEmbed(content, hasGif) {
    // Si c'est un GIF, pas d'embed et pas de signature
    if (hasGif) return false;
    return content.length > 500 || content.includes('\n');
}

// Fonction pour créer un embed
function createMessageEmbed(content, guild, serverLink, isLastPart = true) {
    const embed = {
        author: {
            name: isLastPart ? `☭ ${guild.name} ☭` : '(Suite...)',
            url: serverLink,
            icon_url: guild.iconURL()
        },
        description: content,
        color: parseInt(ROUGE_COMMUNISTE.replace('#', ''), 16),
        footer: {
            text: isLastPart ? 'Message synchronisé' : '(Suite...)',
            icon_url: guild.iconURL()
        }
    };

    return embed;
}

// Synchronisation des messages
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        const groupId = await getChannelGroup(message.channel.id);
        if (!groupId) return;

        const syncedChannels = await getSyncedChannels();
        const channelsInGroup = syncedChannels.get(groupId);
        
        if (!channelsInGroup) {
            console.log('Aucun canal dans le groupe');
            return;
        }

        // Nettoyer le message de toutes les signatures de serveur existantes
        let cleanContent = message.content;
        const serverSignaturePattern = /☭ [^☭]+ ☭/g;
        cleanContent = cleanContent.replace(serverSignaturePattern, '').trim();

        // Vérifier si le message contient un GIF
        const hasGif = cleanContent.includes('tenor.com') || cleanContent.includes('giphy.com');

        // Récupérer et sauvegarder les pièces jointes avant la suppression
        const attachments = [];
        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = await response.arrayBuffer();
                attachments.push({
                    name: attachment.name,
                    attachment: Buffer.from(buffer),
                    description: attachment.description
                });
            } catch (error) {
                console.error('Erreur lors de la récupération de la pièce jointe:', error);
            }
        }

        // Créer le lien vers le serveur
        const serverLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}`;
        const useEmbed = shouldUseEmbed(cleanContent, hasGif);
        const signatureWithLink = `☭ [${message.guild.name}](${serverLink}) ☭`;

        // Découper le message si nécessaire
        const messageParts = useEmbed ? splitLongMessage(cleanContent, 4000) : [cleanContent];

        // Envoyer le message dans le canal d'origine
        const sourceWebhook = await createWebhookForMessage(message.channel);
        if (sourceWebhook) {
            try {
                // Premier message avec pièces jointes
                const firstMessageOptions = {
                    username: message.member.displayName,
                    avatarURL: message.author.displayAvatarURL(),
                    allowedMentions: { parse: ['users', 'roles'] }
                };

                if (attachments.length > 0) {
                    firstMessageOptions.files = attachments;
                }

                if (useEmbed) {
                    firstMessageOptions.embeds = [createMessageEmbed(messageParts[0], message.guild, serverLink, messageParts.length === 1)];
                } else {
                    firstMessageOptions.content = messageParts[0];
                }

                await sourceWebhook.send(firstMessageOptions);

                // Envoyer le reste des parties s'il y en a
                for (let i = 1; i < messageParts.length; i++) {
                    const isLastPart = i === messageParts.length - 1;
                    const messageOptions = {
                        username: message.member.displayName,
                        avatarURL: message.author.displayAvatarURL(),
                        allowedMentions: { parse: ['users', 'roles'] }
                    };

                    if (useEmbed) {
                        messageOptions.embeds = [createMessageEmbed(messageParts[i], message.guild, serverLink, isLastPart)];
                    } else {
                        messageOptions.content = messageParts[i];
                    }

                    await sourceWebhook.send(messageOptions);
                }

                // Envoyer aux autres canaux
                for (const channelId of channelsInGroup) {
                    try {
                        if (channelId === message.channel.id) continue;

                        const channel = await client.channels.fetch(channelId);
                        if (!channel) continue;

                        const webhook = await createWebhookForMessage(channel);
                        if (webhook) {
                            try {
                                // Premier message avec pièces jointes
                                const firstMessageOptions = {
                                    username: message.member.displayName,
                                    avatarURL: message.author.displayAvatarURL(),
                                    allowedMentions: { parse: ['users', 'roles'] }
                                };

                                if (attachments.length > 0) {
                                    firstMessageOptions.files = attachments;
                                }

                                if (useEmbed) {
                                    firstMessageOptions.embeds = [createMessageEmbed(messageParts[0], message.guild, serverLink, messageParts.length === 1)];
                                } else {
                                    // Pour les GIFs, pas de signature
                                    firstMessageOptions.content = hasGif ? messageParts[0] : `${messageParts[0]} ${signatureWithLink}`;
                                }

                                await webhook.send(firstMessageOptions);

                                // Reste des parties
                                for (let i = 1; i < messageParts.length; i++) {
                                    const isLastPart = i === messageParts.length - 1;
                                    const messageOptions = {
                                        username: message.member.displayName,
                                        avatarURL: message.author.displayAvatarURL(),
                                        allowedMentions: { parse: ['users', 'roles'] }
                                    };

                                    if (useEmbed) {
                                        messageOptions.embeds = [createMessageEmbed(messageParts[i], message.guild, serverLink, isLastPart)];
                                    } else {
                                        // Pour les GIFs, pas de signature même à la fin
                                        messageOptions.content = hasGif ? messageParts[i] : (isLastPart ? `${messageParts[i]} ${signatureWithLink}` : messageParts[i]);
                                    }

                                    await webhook.send(messageOptions);
                                }
                            } finally {
                                await webhook.delete().catch(console.error);
                            }
                        }
                    } catch (error) {
                        console.error(`Erreur lors de l'envoi vers ${channelId}:`, error);
                    }
                }
            } finally {
                await sourceWebhook.delete().catch(console.error);
            }
        }

        // Supprimer le message original seulement après avoir envoyé tous les nouveaux messages
        try {
            await message.delete();
        } catch (error) {
            console.error('Erreur lors de la suppression du message:', error);
        }
    } catch (error) {
        console.error('Erreur générale lors de la synchronisation:', error);
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
                }
            } catch (error) {
                if (error.code === 10003) { // Unknown Channel
                    console.log(`Canal invalide, nettoyage: ${channelId}`);
                    await removeSyncedChannel(channelId);
                } else {
                    console.error(`Erreur lors du nettoyage du canal ${channelId}:`, error);
                }
            }
        }
    }
}

client.login(process.env.TOKEN);
