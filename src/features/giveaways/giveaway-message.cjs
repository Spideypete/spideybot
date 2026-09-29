const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function setMessageId(guildId, giveawayId, messageId) {
  const config = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : { guilds: {} };
  const giveaway = config.guilds?.[guildId]?.giveaways?.[giveawayId];
  if (!giveaway) return null;
  giveaway.messageId = String(messageId);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return giveaway;
}

module.exports = { setMessageId };
