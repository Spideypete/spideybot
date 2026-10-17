const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const A = PermissionFlagsBits.Administrator;
const M = PermissionFlagsBits.ManageMessages;
const S = (name, description, build) => {
  const command = new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false);
  if (build) build(command);
  return command;
};
const sub = (name, description, build) => item => {
  item.setName(name).setDescription(description);
  if (build) build(item);
  return item;
};
const user = (o, required=false) => o.addUserOption(x=>x.setName('user').setDescription('Target member').setRequired(required));
const reason = o => o.addStringOption(x=>x.setName('reason').setDescription('Reason').setMaxLength(500).setRequired(false));
const channel = (o, name='channel', required=true) => o.addChannelOption(x=>x.setName(name).setDescription('Target text channel').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(required));
const role = (o, name='role', required=true) => o.addRoleOption(x=>x.setName(name).setDescription('Target role').setRequired(required));
const str = (o,name,description,required=true,max=1000) => o.addStringOption(x=>x.setName(name).setDescription(description).setRequired(required).setMaxLength(max));
const int = (o,name,description,required=true,min=1,max=1000000) => o.addIntegerOption(x=>x.setName(name).setDescription(description).setRequired(required).setMinValue(min).setMaxValue(max));

const spideyCommands = [
  S('ask','Ask SPIDEY BOT',b=>str(b,'question','Question for the existing /ask assistant',true,1500)),
  S('premium','Premium subscription status and activation',b=>b
    .addSubcommand(sub('status','View this server’s Premium status'))
    .addSubcommand(sub('activate','Redeem a Premium activation key',s=>str(s,'key','Activation key',true,200)))),
  S('welcome','Welcome message testing',b=>b.addSubcommand(sub('test','Preview the configured welcome message'))),
  S('goodbye','Goodbye message testing',b=>b.addSubcommand(sub('test','Preview the configured goodbye message'))),
  S('reactionrole','Manage reaction-role mappings',b=>b
    .addSubcommand(sub('create','Map a message reaction to a role',s=>str(s,'message_id','Message ID',true,30).addStringOption(x=>x.setName('emoji').setDescription('Emoji to react with').setRequired(true).setMaxLength(100)).addRoleOption(x=>x.setName('role').setDescription('Role to grant').setRequired(true))))
    .addSubcommand(sub('delete','Delete a reaction-role mapping',s=>str(s,'message_id','Message ID',true,30).addStringOption(x=>x.setName('emoji').setDescription('Mapped emoji').setRequired(true).setMaxLength(100))))),
  S('ban','Ban a member',b=>user(b,true).addStringOption(x=>x.setName('reason').setDescription('Reason').setMaxLength(500).setRequired(false)).addIntegerOption(x=>x.setName('delete_messages_duration').setDescription('Days of messages to delete (0–7)').setMinValue(0).setMaxValue(7).setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)),
  S('kick','Kick a member',b=>user(b,true).addStringOption(x=>x.setName('reason').setDescription('Reason').setMaxLength(500).setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)),
  S('timeout','Timeout a member',b=>user(b,true).addIntegerOption(x=>x.setName('duration').setDescription('Timeout duration in minutes').setMinValue(1).setMaxValue(40320).setRequired(true)).addStringOption(x=>x.setName('reason').setDescription('Reason').setMaxLength(500).setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)),
  S('warn','Warn a member',b=>user(b,true).addStringOption(x=>x.setName('reason').setDescription('Reason').setMaxLength(500).setRequired(true)).setDefaultMemberPermissions(M)),
  S('cases','View a member’s moderation cases',b=>user(b,true).setDefaultMemberPermissions(M)),
  S('purge','Delete recent messages',b=>int(b,'amount','Number of messages to delete',true,1,100).addUserOption(x=>x.setName('user').setDescription('Only delete messages by this member').setRequired(false)).setDefaultMemberPermissions(M)),
  S('automod','AutoMod rules and status',b=>b
    .addSubcommandGroup(g=>g.setName('rule').setDescription('Manage AutoMod rules').addSubcommand(sub('add','Add an AutoMod rule',s=>s.addStringOption(x=>x.setName('type').setDescription('Rule type').setRequired(true).addChoices({name:'Links',value:'links'},{name:'Swears',value:'swears'},{name:'Invites',value:'invites'},{name:'Spam',value:'spam'})))))
    .addSubcommand(sub('whitelist','Whitelist a role, channel, or user',s=>s.addStringOption(x=>x.setName('target_type').setDescription('Target type').setRequired(true).addChoices({name:'Role',value:'role'},{name:'Channel',value:'channel'},{name:'User',value:'user'})).addStringOption(x=>x.setName('target_id').setDescription('Role/channel/user ID').setRequired(true))))
    .addSubcommand(sub('status','View AutoMod status'))),
  S('auditlog','Audit log controls',b=>b
    .addSubcommand(sub('view','View recent audit events',s=>s.addStringOption(x=>x.setName('user_action').setDescription('User ID, user mention, or action filter').setRequired(false)).addIntegerOption(x=>x.setName('limit').setDescription('Number of entries').setMinValue(1).setMaxValue(25).setRequired(false))))
    .addSubcommand(sub('channel','Set the audit-log channel',s=>channel(s)))),
  S('rank','View a member’s rank',b=>user(b,false)),
  S('levels','Levels and leaderboard',b=>b
    .addSubcommand(sub('leaderboard','Show the server XP leaderboard'))
    .addSubcommand(sub('xp','Give, take, or set XP',s=>s.addStringOption(x=>x.setName('action').setDescription('XP operation').setRequired(true).addChoices({name:'Give',value:'give'},{name:'Take',value:'take'},{name:'Set',value:'set'})).addUserOption(x=>x.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(x=>x.setName('amount').setDescription('XP amount').setMinValue(0).setMaxValue(100000000).setRequired(true))))),
  S('achievements','Achievement information',b=>b
    .addSubcommand(sub('list','List server achievements'))
    .addSubcommand(sub('user','View a member’s achievements',s=>user(s,false)))),
  S('cc','Custom response commands',b=>b
    .addSubcommand(sub('add','Add a custom response',s=>str(s,'name','Command name (without slash)',true,32).addStringOption(x=>x.setName('response').setDescription('Response text').setRequired(true).setMaxLength(1900))))
    .addSubcommand(sub('delete','Delete a custom response',s=>str(s,'name','Command name',true,32)))
    .addSubcommand(sub('list','List custom responses'))),
  S('invites','Invite statistics',b=>user(b,false)),
  S('invite','Invite leaderboard',b=>b.addSubcommand(sub('leaderboard','Show invite leaderboard'))),
  S('ticket','Ticketing tools',b=>b
    .addSubcommand(sub('panel','Publish a ticket panel',s=>channel(s)))
    .addSubcommand(sub('close','Close the current ticket',s=>str(s,'reason','Closure reason',false,500)))
    .addSubcommand(sub('add','Add a member to the current ticket',s=>user(s,true)))),
  S('emoji','Server emoji management',b=>b
    .addSubcommand(sub('steal','Add an emoji from a URL or emoji',s=>str(s,'url_emoji','Emoji URL or emoji',true,500).addStringOption(x=>x.setName('name').setDescription('New emoji name').setRequired(true).setMaxLength(32))))
    .addSubcommand(sub('delete','Delete a server emoji',s=>str(s,'name','Emoji name',true,32)))),
  S('poll','Polls',b=>b
    .addSubcommand(sub('create','Create a poll',s=>str(s,'question','Poll question',true,250).addStringOption(x=>x.setName('options').setDescription('Options separated by |').setRequired(true).setMaxLength(1000)).addIntegerOption(x=>x.setName('duration').setDescription('Duration in minutes; 0 means no expiry').setMinValue(0).setMaxValue(10080).setRequired(false))))
    .addSubcommand(sub('results','Show poll results',s=>str(s,'message_id','Poll message ID',true,30)))),
  S('embed','Embed message tools',b=>b
    .addSubcommand(sub('builder','Build and send an embed',s=>str(s,'title','Embed title',true,256).addStringOption(x=>x.setName('description').setDescription('Embed description').setRequired(true).setMaxLength(4000)).addChannelOption(x=>x.setName('channel').setDescription('Destination channel').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(false))))
    .addSubcommand(sub('edit','Edit an existing bot embed',s=>str(s,'message_id','Message ID',true,30).addStringOption(x=>x.setName('title').setDescription('New title').setRequired(false).setMaxLength(256)).addStringOption(x=>x.setName('description').setDescription('New description').setRequired(false).setMaxLength(4000))))),
  S('remind','Create a reminder',b=>str(b,'time','Examples: 10m, 2h, 1d',true,30).addStringOption(x=>x.setName('task').setDescription('Reminder text').setRequired(true).setMaxLength(1000))),
  S('reminders','List your reminders'),
  S('birthday','Set your birthday',b=>int(b,'month','Month (1–12)',true,1,12).addIntegerOption(x=>x.setName('day').setDescription('Day of month').setRequired(true).setMinValue(1).setMaxValue(31))),
  S('birthdays','Upcoming server birthdays'),
  S('alerts','Social alerts',b=>b
    .addSubcommand(sub('add','Add a creator/feed alert',s=>s.addStringOption(x=>x.setName('platform').setDescription('Platform').setRequired(true).addChoices(...['twitch','youtube','reddit','instagram','rss','kick','podcast','tiktok','x'].map(v=>({name:v.toUpperCase(),value:v})))).addStringOption(x=>x.setName('handle').setDescription('Creator handle or feed URL').setRequired(true).setMaxLength(500)).addChannelOption(x=>x.setName('channel').setDescription('Notification channel').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(true)).addRoleOption(x=>x.setName('ping_role').setDescription('Role to ping').setRequired(false))))
    .addSubcommand(sub('remove','Remove an alert',s=>s.addStringOption(x=>x.setName('platform').setDescription('Platform').setRequired(true).addChoices(...['twitch','youtube','reddit','instagram','rss','kick','podcast','tiktok','x'].map(v=>({name:v.toUpperCase(),value:v}))).addStringOption(y=>y.setName('handle').setDescription('Creator handle/feed URL').setRequired(true).setMaxLength(500))))
    .addSubcommand(sub('list','List alerts',s=>s.addStringOption(x=>x.setName('platform').setDescription('Optional platform filter').setRequired(false).addChoices(...['twitch','youtube','reddit','instagram','rss','kick','podcast','tiktok','x'].map(v=>({name:v.toUpperCase(),value:v})))))),
  S('giveaway','Giveaways',b=>b
    .addSubcommand(sub('start','Start a giveaway',s=>str(s,'duration','Examples: 10m, 2h, 1d',true,30).addIntegerOption(x=>x.setName('winners').setDescription('Winner count').setMinValue(1).setMaxValue(20).setRequired(true)).addStringOption(x=>x.setName('prize').setDescription('Prize').setRequired(true).setMaxLength(200))))
    .addSubcommand(sub('reroll','Reroll a giveaway winner',s=>str(s,'message_id','Giveaway message ID',true,30)))),
  S('balance','View a member’s balance',b=>user(b,false)),
  S('pay','Pay a member',b=>user(b,true).addIntegerOption(x=>x.setName('amount').setDescription('Amount to pay').setMinValue(1).setMaxValue(100000000).setRequired(true))),
  S('work','Work to earn currency'),
  S('shop','View the server shop'),
  S('play','Play music',b=>str(b,'query','Song name or URL',true,500)),
  S('skip','Skip the current song'),
  S('queue','Show the music queue'),
  S('stop','Stop music playback'),
  S('blackjack','Play blackjack',b=>int(b,'bet','Bet amount',true,1,1000000)),
  S('slots','Play slots',b=>int(b,'bet','Bet amount',true,1,1000000)),
  S('lottery','Lottery',b=>b
    .addSubcommand(sub('buy','Buy lottery tickets',s=>int(s,'tickets_amount','Number of tickets',true,1,100)))
    .addSubcommand(sub('info','View current lottery information'))),
  S('tictactoe','Challenge a member to tic-tac-toe',b=>user(b,true)),
  S('trivia','Play trivia',b=>b.addStringOption(x=>x.setName('category').setDescription('Trivia category').setRequired(false).addChoices({name:'General',value:'general'},{name:'Science',value:'science'},{name:'History',value:'history'},{name:'Games',value:'games'}))),
  S('command','Command controls',b=>b
    .addSubcommand(sub('override','Allow or deny a command for a role or channel',s=>str(s,'command_name','Command name',true,32).addStringOption(x=>x.setName('decision').setDescription('Allow or deny').setRequired(true).addChoices({name:'Allow',value:'allow'},{name:'Deny',value:'deny'})).addStringOption(x=>x.setName('target_type').setDescription('Target type').setRequired(true).addChoices({name:'Role',value:'role'},{name:'Channel',value:'channel'})).addStringOption(x=>x.setName('target_id').setDescription('Role/channel ID').setRequired(true))))
    .addSubcommand(sub('logging','Enable or disable command logging',s=>s.addBooleanOption(x=>x.setName('enabled').setDescription('Enable logging').setRequired(true))))),
  S('system','System administration',b=>b
    .addSubcommand(sub('diagnostic','Run safe system diagnostics'))
    .addSubcommand(sub('maintenance','Set maintenance mode',s=>s.addStringOption(x=>x.setName('mode').setDescription('Maintenance mode').setRequired(true).addChoices({name:'On',value:'on'},{name:'Off',value:'off'})))))
];

module.exports = { spideyCommands };
