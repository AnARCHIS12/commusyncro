const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

// Map pour stocker les salons synchronisés
const syncedChannels = new Map();
// Map pour stocker les tunnels entre serveurs
const serverTunnels = new Map();

// Définition des commandes slash
const commands = [
    new SlashCommandBuilder()
        .setName('sync')
        .setDescription(`${MARTEAU_FAUCILLE} Unifie ce salon avec la cause commune`)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('linkchannel')
        .setDescription(`${POING} Établit une alliance avec un salon déjà unifié`)
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
        .setName('createlink')
        .setDescription('Crée un lien d\'invitation unique vers le serveur')
        .toJSON()
];

// Configuration des commandes slash
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`${MARTEAU_FAUCILLE} Le Parti est prêt à servir en tant que ${client.user.tag}`);
    
    try {
        console.log('Préparation de la révolution...');
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
        if (!syncedChannels.has(channelId)) {
            syncedChannels.set(channelId, new Set([channelId]));
            const embed = new EmbedBuilder()
                .setColor(ROUGE_COMMUNISTE)
                .setTitle(`${MARTEAU_FAUCILLE} Unification Réussie !`)
                .setDescription('Ce salon rejoint la grande union des serveurs !')
                .setFooter({ 
                    text: 'Pour le peuple, par le peuple !',
                    iconURL: interaction.user.displayAvatarURL()
                });
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ 
                content: `${DRAPEAU} Ce salon fait déjà partie de l'Union, camarade !`,
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

        const targetChannelId = interaction.channelId;
        let found = false;
        
        for (const [sourceId, channels] of syncedChannels.entries()) {
            if (channels.has(targetChannelId)) {
                await interaction.reply({ 
                    content: `${DRAPEAU} Ce salon est déjà synchronisé.`,
                    ephemeral: true 
                });
                found = true;
                break;
            }
        }

        if (!found) {
            const firstGroup = syncedChannels.values().next().value;
            if (firstGroup) {
                firstGroup.add(targetChannelId);
                await interaction.reply(`${POING} Salon lié avec succès !`);
            } else {
                await interaction.reply({ 
                    content: `${MARTEAU_FAUCILLE} Aucun salon source n'a été configuré. Utilisez d'abord /sync dans le salon source.`,
                    ephemeral: true 
                });
            }
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
        const serverTunnelMap = serverTunnels.get(interaction.guildId);
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

    else if (commandName === 'createlink') {
        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 86400,
                maxUses: 1,
                unique: true
            });
            await interaction.user.send(`Voici votre lien d'invitation unique : ${invite.url}`);
            await interaction.reply({ 
                content: `${POING} Je vous ai envoyé le lien en message privé !`,
                ephemeral: true 
            });
        } catch (error) {
            console.error('Erreur lors de la création du lien :', error);
            await interaction.reply({ 
                content: `${POING} Une erreur est survenue lors de la création du lien.`,
                ephemeral: true 
            });
        }
    }
});

// Synchronisation des messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    for (const [sourceId, channels] of syncedChannels.entries()) {
        if (channels.has(channelId)) {
            for (const targetChannelId of channels) {
                if (targetChannelId !== channelId) {
                    const targetChannel = client.channels.cache.get(targetChannelId);
                    if (targetChannel) {
                        try {
                            await targetChannel.send(`${MARTEAU_FAUCILLE} **Camarade ${message.author.tag}**: ${message.content}`);
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
