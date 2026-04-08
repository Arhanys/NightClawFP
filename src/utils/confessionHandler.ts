import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ButtonInteraction,
    ModalSubmitInteraction,
    MessageFlags
} from "discord.js";
import sql from '../db.js';
import { getServerSettings } from './serverSettings.js';
import { t } from './i18n.js';

export async function handleConfessionButton(interaction: ButtonInteraction): Promise<void> {
    const { customId, guild } = interaction;

    if (customId === "confession_anonymous" || customId === "confession_public") {
        const isAnonymous = customId === "confession_anonymous";

        const settings = await getServerSettings(guild!.id);
        const lang = settings.language || 'en';

        const modal = new ModalBuilder()
            .setCustomId(`confession_modal_${isAnonymous ? 'anon' : 'public'}`)
            .setTitle(isAnonymous ? t('confession_modal_title_anon', lang) : t('confession_modal_title_public', lang));

        const confessionInput = new TextInputBuilder()
            .setCustomId('confession_text')
            .setLabel(t('confession_input_label', lang))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(t('confession_input_placeholder', lang))
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1000);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(confessionInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
}

export async function handleConfessionModal(interaction: ModalSubmitInteraction): Promise<void> {
    const { customId, fields, user, guild } = interaction;

    if (customId.startsWith('confession_modal_')) {
        const isAnonymous = customId.includes('anon');
        const confessionText = fields.getTextInputValue('confession_text');

        const settings = await getServerSettings(guild!.id);
        const lang = settings.language || 'en';

        const embed = new EmbedBuilder()
            .setTitle(isAnonymous ? t('confession_embed_title_anon', lang) : t('confession_embed_title_public', lang))
            .setDescription(confessionText)
            .setColor(isAnonymous ? 0x36393F : 0x7289DA)
            .setTimestamp();

        if (!isAnonymous) {
            embed.setAuthor({
                name: user.displayName,
                iconURL: user.displayAvatarURL()
            });
        }

        embed.setFooter({
            text: isAnonymous
                ? t('confession_footer_anon', lang, { id: Date.now() })
                : t('confession_footer_public', lang, { tag: user.tag })
        });

        const channel = interaction.channel!;
        if (!channel.isTextBased() || channel.isDMBased()) return void interaction.reply({ content: t('confession_failed', lang), flags: MessageFlags.Ephemeral });
        const confessionMessage = await channel.send({ embeds: [embed] });

        const threadName = isAnonymous
            ? t('confession_thread_anon', lang)
            : t('confession_thread_public', lang, { name: user.displayName });
        await confessionMessage.startThread({ name: threadName });

        const panelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('confession_anonymous')
                .setLabel(t('confession_panel_btn_anon', lang))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('confession_public')
                .setLabel(t('confession_panel_btn_public', lang))
                .setStyle(ButtonStyle.Primary)
        );

        const panelEmbed = new EmbedBuilder()
            .setTitle(t('confession_panel_title', lang))
            .setDescription(t('confession_panel_description', lang))
            .setColor(0x7289DA)
            .setFooter({ text: t('confession_panel_footer', lang) })
            .setTimestamp();

        await channel.send({ embeds: [panelEmbed], components: [panelRow] });

        await interaction.reply({
            content: isAnonymous ? t('confession_published_anon', lang) : t('confession_published_public', lang),
            flags: MessageFlags.Ephemeral
        });

        await sql`
            INSERT INTO confessions (text, is_anonymous, author_id, guild_id, created_at)
            VALUES (${confessionText}, ${isAnonymous}, ${user.id}, ${guild!.id}, NOW())
        `;
    }
}
