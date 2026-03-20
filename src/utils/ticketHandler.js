// src/utils/ticketHandler.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} from "discord.js";
import { getServerSettings } from './serverSettings.js';
import { t } from './i18n.js';

export async function handleTicketButton(interaction) {
    const { customId, guild, user } = interaction;

    const settings = await getServerSettings(guild.id);
    const lang = settings.language || 'en';

    if (customId === "ticket_open") {
        const existing = guild.channels.cache.find(c => c.name === `ticket-${user.id}`);
        if (existing) {
            return interaction.reply({ content: t('ticket_already_open', lang), ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('ticket_reason_modal')
            .setTitle(t('ticket_modal_title', lang));

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel(t('ticket_reason_label', lang))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(t('ticket_reason_placeholder', lang))
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    else if (customId === "ticket_close") {
        if (!interaction.member.permissions.has('ManageChannels')) {
            return interaction.reply({ content: t('ticket_no_close_perm', lang), ephemeral: true });
        }

        await interaction.reply({ content: t('ticket_closing', lang), ephemeral: true });
        await interaction.channel.delete();
    }
}

export async function handleTicketModal(interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'ticket_reason_modal') return;

    const reason = interaction.fields.getTextInputValue('ticket_reason');
    const user = interaction.user;
    const guild = interaction.guild;
    const guildId = guild.id;

    const settings = await getServerSettings(guildId);
    const lang = settings.language || 'en';

    const category = guild.channels.cache.find(c => c.name === "Support 🤝" && c.type === 4);
    if (!category) return interaction.reply({ content: t('ticket_category_not_found', lang), ephemeral: true });

    const permissionOverwrites = [
        { id: guild.id, deny: ['ViewChannel', 'SendMessages'] },
        { id: user.id, allow: ['ViewChannel', 'SendMessages'], deny: ['ManageChannels'] }
    ];

    if (settings.mod_role_id) {
        const modRole = guild.roles.cache.get(settings.mod_role_id);
        if (modRole) {
            permissionOverwrites.push({
                id: settings.mod_role_id,
                allow: ['ViewChannel', 'SendMessages', 'ManageChannels']
            });
        }
    }

    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`.toLowerCase(),
        type: 0,
        parent: category.id,
        permissionOverwrites
    });

    const embed = new EmbedBuilder()
        .setTitle(t('ticket_embed_title', lang, { username: user.username }))
        .setDescription(t('ticket_embed_desc', lang))
        .addFields(
            { name: t('ticket_field_user', lang), value: `${user}`, inline: true },
            { name: t('ticket_field_reason', lang), value: reason, inline: false }
        )
        .setColor("Purple")
        .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel(t('ticket_btn_close', lang))
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [closeRow] });

    if (settings.mod_role_id) {
        const modRole = guild.roles.cache.get(settings.mod_role_id);
        if (modRole) {
            await ticketChannel.send(`<@&${settings.mod_role_id}>`);
        }
    }

    await interaction.reply({ content: t('ticket_created', lang, { channel: ticketChannel.toString() }), ephemeral: true });
}
