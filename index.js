const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { initDatabase, addSyncedChannel, getSyncedChannels, addServerTunnel, getServerTunnels, removeSyncedChannel, createPortal, getPortal, linkPortal, ServerTunnel, Sequelize, getActivePortals, getChannelGroup, SyncedChannel, deactivatePortal } = require('./database');
require('dotenv').config();

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
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: `${POING} Camarade, vous n'avez pas les autorisations nécessaires pour cette action !`,
                flags: ['Ephemeral']
            });
        }

        try {
            const success = await removeSyncedChannel(interaction.channel.id);
            
            if (success) {
                await interaction.reply({
                    content: `${POING} Le canal a été retiré de la synchronisation.`,
                    flags: ['Ephemeral']
                });
            } else {
                await interaction.reply({
                    content: `${POING} Une erreur est survenue lors du retrait de la synchronisation.`,
                    flags: ['Ephemeral']
                });
            }
        } catch (error) {
            console.error('Erreur lors du retrait de la synchronisation:', error);
            await interaction.reply({
                content: `${POING} Une erreur est survenue lors du retrait de la synchronisation.`,
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

// Synchronisation des messages
client.on('messageCreate', async (message) => {
    try {
        // Ignorer les messages du bot
        if (message.author.bot) return;

        // Trouver le groupe du canal actuel
        const sourceChannel = await SyncedChannel.findOne({
            where: { channelId: message.channel.id }
        });

        if (!sourceChannel) {
            return; // Canal non synchronisé
        }

        console.log('Message reçu dans le canal:', message.channel.id, 'groupe:', sourceChannel.groupId);

        // Trouver tous les autres canaux du même groupe
        const targetChannels = await SyncedChannel.findAll({
            where: {
                groupId: sourceChannel.groupId,
                channelId: {
                    [Sequelize.Op.ne]: message.channel.id // Exclure le canal source
                }
            }
        });

        if (targetChannels.length === 0) {
            console.log('Aucun autre canal dans le groupe:', sourceChannel.groupId);
            return;
        }

        console.log('Canaux cibles:', targetChannels.map(c => c.channelId));

        // Créer l'embed pour le message
        const messageEmbed = new EmbedBuilder()
            .setColor(ROUGE_COMMUNISTE)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content)
            .setFooter({
                text: `Depuis ${message.guild.name}`,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();

        // Ajouter les images si présentes
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                messageEmbed.setImage(attachment.url);
            }
        }

        // Envoyer le message à tous les canaux cibles
        for (const targetChannel of targetChannels) {
            const channel = client.channels.cache.get(targetChannel.channelId);
            if (channel && channel.permissionsFor(client.user).has('SendMessages')) {
                try {
                    await channel.send({ embeds: [messageEmbed] });
                    console.log('Message synchronisé vers:', targetChannel.channelId);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi vers le canal:', targetChannel.channelId, error);
                }
            } else {
                console.log('Canal non accessible:', targetChannel.channelId);
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

client.login(process.env.TOKEN);
