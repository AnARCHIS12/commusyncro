const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { initDatabase, addSyncedChannel, getSyncedChannels, addServerTunnel, getServerTunnels, removeSyncedChannel } = require('./database');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel]
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
        .setName('sync')
        .setDescription(`${MARTEAU_FAUCILLE} Unifie ce salon avec la cause commune`)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('linkchannel')
        .setDescription(`${POING} Établit une alliance avec un salon déjà unifié`)
        .addStringOption(option =>
            option.setName('groupid')
            .setDescription('ID du groupe à rejoindre')
            .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('createtunnel')
        .setDescription(`${MONDE} Crée un passage pour nos camarades`)
        .addStringOption(option =>
            option.setName('description')
            .setDescription('Nom du passage révolutionnaire')
            .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('tunnels')
        .setDescription(`${DRAPEAU} Affiche les passages de l'Union`)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('unsync')
        .setDescription(`${POING} Retire ce salon de l'Union`)
        .toJSON()
];

// Configuration des commandes slash
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`${MARTEAU_FAUCILLE} Le Parti est prêt à servir en tant que ${client.user.tag}`);
    
    try {
        // Initialisation de la base de données
        await initDatabase();
        
        // Chargement des données depuis la base de données
        syncedChannels = await getSyncedChannels();
        
        console.log('Préparation de la révolution...');
        // Enregistrement global des commandes pour tous les serveurs
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`${POING} Les commandes de la révolution sont prêtes !`);
    } catch (error) {
        console.error('Erreur lors de la révolution:', error);
    }
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'sync') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Seuls les commissaires du peuple peuvent utiliser cette commande, camarade.`,
                ephemeral: true 
            });
        }

        const channelId = interaction.channelId;
        const groupId = Date.now().toString(); // Identifiant unique pour le groupe

        try {
            await addSyncedChannel(channelId, groupId);
            
            if (!syncedChannels.has(groupId)) {
                syncedChannels.set(groupId, new Set([channelId]));
            } else {
                syncedChannels.get(groupId).add(channelId);
            }

            const embed = new EmbedBuilder()
                .setColor(ROUGE_COMMUNISTE)
                .setTitle(`${MARTEAU_FAUCILLE} Unification Réussie !`)
                .setDescription(`Ce salon rejoint la grande union des serveurs !\nID du groupe: ${groupId}`)
                .setFooter({ 
                    text: 'Pour le peuple, par le peuple !',
                    iconURL: interaction.user.displayAvatarURL()
                });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            await interaction.reply({ 
                content: `${POING} Une erreur est survenue lors de l'unification.`,
                ephemeral: true 
            });
        }
    }

    else if (commandName === 'linkchannel') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Seuls les commissaires du peuple peuvent utiliser cette commande, camarade.`,
                ephemeral: true 
            });
        }

        const channelId = interaction.channelId;
        const groupId = interaction.options.getString('groupid');

        try {
            await addSyncedChannel(channelId, groupId);
            
            if (!syncedChannels.has(groupId)) {
                syncedChannels.set(groupId, new Set([channelId]));
            } else {
                syncedChannels.get(groupId).add(channelId);
            }

            await interaction.reply(`${POING} Salon lié avec succès au groupe ${groupId} !`);
        } catch (error) {
            console.error('Erreur lors de la liaison:', error);
            await interaction.reply({ 
                content: `${POING} Une erreur est survenue lors de la liaison.`,
                ephemeral: true 
            });
        }
    }

    else if (commandName === 'unsync') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Seuls les commissaires du peuple peuvent utiliser cette commande, camarade.`,
                ephemeral: true 
            });
        }

        const channelId = interaction.channelId;
        try {
            await removeSyncedChannel(channelId);
            
            // Retirer le salon de la Map en mémoire
            for (const [groupId, channels] of syncedChannels.entries()) {
                if (channels.has(channelId)) {
                    channels.delete(channelId);
                    if (channels.size === 0) {
                        syncedChannels.delete(groupId);
                    }
                    break;
                }
            }

            await interaction.reply(`${DRAPEAU} Ce salon a quitté l'Union.`);
        } catch (error) {
            console.error('Erreur lors de la désynchronisation:', error);
            await interaction.reply({ 
                content: `${POING} Une erreur est survenue lors de la désynchronisation.`,
                ephemeral: true 
            });
        }
    }

    else if (commandName === 'createtunnel') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: `${POING} Seuls les commissaires du peuple peuvent créer des passages, camarade.`,
                ephemeral: true 
            });
        }

        try {
            const description = interaction.options.getString('description');
            const invite = await interaction.channel.createInvite({
                maxAge: 0,
                maxUses: 0,
                unique: true,
                reason: `Passage révolutionnaire créé par le camarade ${interaction.user.tag}`
            });

            await addServerTunnel(interaction.guildId, description, invite.url);
            
            if (!serverTunnels.has(interaction.guildId)) {
                serverTunnels.set(interaction.guildId, new Map());
            }
            const serverTunnelMap = serverTunnels.get(interaction.guildId);
            serverTunnelMap.set(description, invite.url);

            const successEmbed = new EmbedBuilder()
                .setColor(ROUGE_COMMUNISTE)
                .setTitle(`${MARTEAU_FAUCILLE} Nouveau Passage Révolutionnaire !`)
                .setDescription('Un nouveau chemin s\'ouvre pour nos camarades !')
                .addFields(
                    { name: `${DRAPEAU} Destination`, value: description },
                    { name: `${MONDE} Passage`, value: `[Pour la gloire de l'Union !](${invite.url})` }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Établi par le camarade ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Erreur lors de la création du passage :', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(ROUGE_COMMUNISTE)
                .setTitle(`${POING} La Révolution a Échoué`)
                .setDescription('Une erreur est survenue lors de la création du passage révolutionnaire.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    else if (commandName === 'tunnels') {
        const serverTunnelMap = await getServerTunnels(interaction.guildId);
        if (!serverTunnelMap || serverTunnelMap.size === 0) {
            return interaction.reply({ 
                content: `${POING} Aucun passage n'a encore été établi pour nos camarades.`,
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(ROUGE_COMMUNISTE)
            .setTitle(`${MARTEAU_FAUCILLE} Passages de l'Union des Serveurs`)
            .setDescription('Les chemins de la révolution sont ouverts à tous les camarades !')
            .setTimestamp()
            .setFooter({ 
                text: 'L\'union fait la force !',
                iconURL: interaction.user.displayAvatarURL()
            });

        for (const [description, url] of serverTunnelMap.entries()) {
            embed.addFields({
                name: `${MONDE} ${description}`,
                value: `[Rejoignez vos camarades !](${url})`,
                inline: true
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// Synchronisation des messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    let found = false;

    for (const [groupId, channels] of syncedChannels.entries()) {
        if (channels.has(channelId)) {
            found = true;
            for (const targetChannelId of channels) {
                if (targetChannelId !== channelId) {
                    const targetChannel = client.channels.cache.get(targetChannelId);
                    if (targetChannel) {
                        try {
                            const embed = new EmbedBuilder()
                                .setColor(ROUGE_COMMUNISTE)
                                .setAuthor({
                                    name: message.author.tag,
                                    iconURL: message.author.displayAvatarURL()
                                })
                                .setDescription(message.content)
                                .setTimestamp();

                            if (message.attachments.size > 0) {
                                embed.setImage(message.attachments.first().url);
                            }

                            await targetChannel.send({ embeds: [embed] });
                        } catch (error) {
                            console.error('Erreur lors de la diffusion du message :', error);
                        }
                    }
                }
            }
            break;
        }
    }
});

client.login(process.env.TOKEN);
