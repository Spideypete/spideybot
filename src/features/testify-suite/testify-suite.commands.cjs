const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const A=PermissionFlagsBits.Administrator, M=PermissionFlagsBits.ManageMessages, C=PermissionFlagsBits.ManageChannels, R=PermissionFlagsBits.ManageRoles;
const S=(name,description,build)=>{const b=new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false);build(b);return b;};
const sub=(name,description,build)=>s=>{s.setName(name).setDescription(description);if(build)build(s);return s;};
const commands=[
S('info','Information and profile tools',b=>b
 .addSubcommand(sub('avatar','Show an avatar',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(false))))
 .addSubcommand(sub('userinfo','Show member information',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(false))))
 .addSubcommand(sub('serverinfo','Show server information'))
 .addSubcommand(sub('roleinfo','Show role information',s=>s.addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true))))
 .addSubcommand(sub('botinfo','Show bot runtime information'))
 .addSubcommand(sub('membercount','Show member counts'))
 .addSubcommand(sub('permissions','Show your permissions'))
 .addSubcommand(sub('profile','Show a profile',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(false))))
 .addSubcommand(sub('rank','Show XP rank',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(false))))),
S('economy','Economy and progression tools',b=>b
 .addSubcommand(sub('daily','Claim daily reward')).addSubcommand(sub('beg','Beg for coins'))
 .addSubcommand(sub('deposit','Deposit coins',s=>s.addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))))
 .addSubcommand(sub('withdraw','Withdraw coins',s=>s.addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))))
 .addSubcommand(sub('inventory','Show inventory',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(false))))
 .addSubcommand(sub('shop','Show the shop')).addSubcommand(sub('buy','Buy an item',s=>s.addStringOption(o=>o.setName('item').setDescription('Item').setRequired(true))))
 .addSubcommand(sub('give','Give coins',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))))
 .addSubcommand(sub('rob','Attempt a robbery',s=>s.addUserOption(o=>o.setName('user').setDescription('Target').setRequired(true))))
 .addSubcommand(sub('crime','Commit a risky crime')).addSubcommand(sub('pet','View or adopt a pet',s=>s.addStringOption(o=>o.setName('name').setDescription('Pet name').setRequired(false))))),
S('fun','Community fun and utility',b=>b
 .addSubcommand(sub('poll','Create a poll',s=>s.addStringOption(o=>o.setName('question').setDescription('Question').setRequired(true))))
 .addSubcommand(sub('calculator','Calculate arithmetic',s=>s.addStringOption(o=>o.setName('expression').setDescription('Expression').setRequired(true))))
 .addSubcommand(sub('ascii','Render ASCII text',s=>s.addStringOption(o=>o.setName('text').setDescription('Text').setRequired(true))))
 .addSubcommand(sub('advice','Get advice')).addSubcommand(sub('dadjoke','Tell a dad joke')).addSubcommand(sub('wouldyourrather','Would You Rather'))
 .addSubcommand(sub('hack','Fake hack simulation',s=>s.addUserOption(o=>o.setName('user').setDescription('Target').setRequired(false))))
 .addSubcommand(sub('relationship','Playful compatibility',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))))),
S('mod','Moderation and channel management',b=>b
 .addSubcommand(sub('purge','Delete recent messages',s=>s.addIntegerOption(o=>o.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100))))
 .addSubcommand(sub('softban','Ban then unban',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))))
 .addSubcommand(sub('unban','Unban by user ID',s=>s.addStringOption(o=>o.setName('user_id').setDescription('User ID').setRequired(true))))
 .addSubcommand(sub('clearwarnings','Clear warning history',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))))
 .addSubcommand(sub('slowmode','Set channel slowmode',s=>s.addIntegerOption(o=>o.setName('seconds').setDescription('0-21600').setRequired(true).setMinValue(0).setMaxValue(21600))))
 .addSubcommand(sub('lock','Lock current channel')).addSubcommand(sub('unlock','Unlock current channel'))
 .addSubcommand(sub('nickname','Set nickname',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('nickname').setDescription('Nickname').setRequired(true))))
 .addSubcommand(sub('role','Add/remove role',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)).addStringOption(o=>o.setName('action').setDescription('Action').setRequired(true).addChoices({name:'add',value:'add'},{name:'remove',value:'remove'}))))
 .addSubcommand(sub('announce','Send announcement',s=>s.addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true))))
 .addSubcommand(sub('say','Send a message',s=>s.addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true))))
 .addSubcommand(sub('thread','Create a thread',s=>s.addStringOption(o=>o.setName('name').setDescription('Name').setRequired(true))))).setDefaultMemberPermissions(M),
S('automod','Auto-moderation controls',b=>b
 .addSubcommand(sub('toggle','Enable or disable AutoMod',s=>s.addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(false))))
 .addSubcommand(sub('words','Set blocked words',s=>s.addStringOption(o=>o.setName('words').setDescription('Comma separated').setRequired(true))))
 .addSubcommand(sub('links','Toggle link filtering',s=>s.addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(true))))
 .addSubcommand(sub('spam','Set spam threshold',s=>s.addIntegerOption(o=>o.setName('messages').setDescription('Messages').setRequired(true).setMinValue(2).setMaxValue(30)))).setDefaultMemberPermissions(A)),
S('config','Server configuration',b=>b
 .addSubcommand(sub('auditlog','Set audit log channel',s=>s.addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText))))
 .addSubcommand(sub('prefix','Set command prefix',s=>s.addStringOption(o=>o.setName('prefix').setDescription('Prefix').setRequired(true).setMinLength(1).setMaxLength(5))))
 .addSubcommand(sub('sticky','Set sticky message',s=>s.addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true))))
 .addSubcommand(sub('unsticky','Remove sticky message')).addSubcommand(sub('counting','Configure counting',s=>s.addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(true))))
 .addSubcommand(sub('welcome','Configure welcome',s=>s.addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(false).addChannelTypes(ChannelType.GuildText)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(false))))
 .addSubcommand(sub('autorole','Configure autorole',s=>s.addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(true)).addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(false))))
 .addSubcommand(sub('verify','Set verification role',s=>s.addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true))))
 .addSubcommand(sub('toggle','Toggle a command',s=>s.addStringOption(o=>o.setName('command').setDescription('Command').setRequired(true)).addBooleanOption(o=>o.setName('enabled').setDescription('Enabled').setRequired(true)))).setDefaultMemberPermissions(A)),
S('levels','XP and leveling controls',b=>b
 .addSubcommand(sub('rewards','Show level rewards')).addSubcommand(sub('setreward','Set a level role reward',s=>s.addIntegerOption(o=>o.setName('level').setDescription('Level').setRequired(true).setMinValue(1).setMaxValue(100)).addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true))))
 .addSubcommand(sub('reset','Reset member XP',s=>s.addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)))).setDefaultMemberPermissions(A)),
S('system','Internal administration and safe diagnostics',b=>b
 .addSubcommand(sub('stats','Show bot statistics')).addSubcommand(sub('guilds','List bot guilds'))
 .addSubcommand(sub('blacklist','Blacklist a user',s=>s.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))))
 .addSubcommand(sub('unblacklist','Remove blacklist',s=>s.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))))
 .addSubcommand(sub('reload','Normalize guild configuration')).addSubcommand(sub('debug','Show safe diagnostics')).setDefaultMemberPermissions(A))
];
module.exports={testifyCommands:commands};
