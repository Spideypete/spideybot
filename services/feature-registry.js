// Feature Registry - Maps features to sidebar sections and tiers
// Used by both backend (checkAccess) and frontend (locked overlays)

const FEATURE_REGISTRY = {
    // Category to section mapping (sidebar sections)
    categories: {
        'settings': { features: [], requiredEntitlement: null },
        'logging': { features: [], requiredEntitlement: 'hasLogging' },
        'server-guard': { 
            features: ['fullServerGuard', 'antiRaid', 'antiSpam'],
            requiredEntitlement: 'hasServerGuard'
        },
        'react-roles': { 
            features: ['reactRoles'],
            requiredEntitlement: 'hasReactRoles'
        },
        'xp-levels': { 
            features: ['xpLeaderboards'],
            requiredEntitlement: 'hasXP'
        },
        'leaderboards': { 
            features: ['xpLeaderboards'],
            requiredEntitlement: 'hasXP'
        },
        'giveaways': { 
            features: ['giveaways'],
            requiredEntitlement: 'hasGiveaways'
        },
        'custom-commands': { 
            features: ['customCommands'],
            requiredEntitlement: 'hasCustomCommands'
        },
        'invite-tracking': { 
            features: ['inviteTracking'],
            requiredEntitlement: 'hasInvites'
        },
        'statistics-channels': { 
            features: ['analytics'],
            requiredEntitlement: 'hasAnalytics'
        },
        'server-messages': { features: [], requiredEntitlement: null },
        'components': { features: [], requiredEntitlement: null },
        'reminders': { features: [], requiredEntitlement: null },
        'recordings': { features: [], requiredEntitlement: null },
        'social-notifs': { features: [], requiredEntitlement: null },
        'message-counting': { features: [], requiredEntitlement: null }
    },

    // Feature definitions with default tier requirements
    features: {
        // React Roles
        reactRoles: {
            name: 'Reaction Roles',
            free: { max: 3 }, // Free: max 3 reaction role sets
            premium: { max: 10 },
            pro: { max: Infinity }
        },

        // Server Guard
        fullServerGuard: {
            name: 'Full Server Guard',
            free: false,
            premium: true,
            pro: true
        },
        antiRaid: {
            name: 'Anti-Raid / Panic Mode',
            free: false,
            premium: false,
            pro: true
        },
        antiSpam: {
            name: 'Anti-Spam',
            free: false,
            premium: true,
            pro: true
        },

        // Engagement
        giveaways: {
            name: 'Giveaways',
            free: { max: 1 }, // Free: max 1 active giveaway
            premium: { max: 5 },
            pro: { max: Infinity }
        },
        xpLeaderboards: {
            name: 'XP & Leaderboards',
            free: false,
            premium: true,
            pro: true
        },
        customCommands: {
            name: 'Custom Commands',
            free: { max: 5 }, // Free: max 5 commands
            premium: { max: 50 },
            pro: { max: Infinity }
        },

        // Analytics & Automation
        analytics: {
            name: 'Member Analytics',
            free: false,
            premium: true,
            pro: true
        },
        inviteTracking: {
            name: 'Invite Tracking',
            free: false,
            premium: true,
            pro: true
        },
        automation: {
            name: 'Automation Tools',
            free: false,
            premium: false,
            pro: true
        },

        // Music (Pro only)
        music: {
            name: 'Music Bot',
            free: false,
            premium: false,
            pro: true
        }
    },

    // Tier hierarchy
    tiers: {
        free: 0,
        premium: 1,
        pro: 2
    }
};

// Check if server has access to a feature
function checkAccess(guildId, featureKey, config, guildConfig) {
    const feature = FEATURE_REGISTRY.features[featureKey];
    if (!feature) return { access: true, tier: null };

    // Get server's tier from config (from PayPal purchase or owner assignment)
    const serverTier = guildConfig?.tier || 'free';

    // Get feature tier requirement from feature toggles (owner-set)
    const featureToggles = config?.featureToggles || {};
    const toggle = featureToggles[featureKey] || {};

    // Determine required tier (owner override takes precedence)
    let requiredTier = 'free';
    if (toggle.pro === true || toggle.pro === Infinity) {
        requiredTier = 'pro';
    } else if (toggle.premium === true || toggle.premium === Infinity) {
        requiredTier = 'premium';
    }

    // Compare tiers
    const serverTierLevel = FEATURE_REGISTRY.tiers[serverTier] || 0;
    const requiredTierLevel = FEATURE_REGISTRY.tiers[requiredTier] || 0;

    if (serverTierLevel < requiredTierLevel) {
        return {
            access: false,
            required: requiredTier,
            current: serverTier,
            upgradeUrl: '/premium'
        };
    }

    // Check numeric limits for features with max values
    if (feature[serverTier] && typeof feature[serverTier].max === 'number') {
        // Would need to check current usage count from database
        return { access: true, tier: serverTier, limit: feature[serverTier].max };
    }

    return { access: true, tier: serverTier };
}

// Check if a category should be locked based on its features
function checkCategoryAccess(categoryName, config, guildConfig) {
    const category = FEATURE_REGISTRY.categories[categoryName];
    if (!category || category.features.length === 0) {
        return { access: true, locked: false };
    }

    const featureToggles = config?.featureToggles || {};
    const serverTier = guildConfig?.tier || 'free';
    const serverTierLevel = FEATURE_REGISTRY.tiers[serverTier] || 0;

    // If ANY feature in category requires higher tier, lock the category
    for (const featureKey of category.features) {
        const toggle = featureToggles[featureKey] || {};
        let requiredTier = 'free';

        if (toggle.pro === true || toggle.pro === Infinity) {
            requiredTier = 'pro';
        } else if (toggle.premium === true || toggle.premium === Infinity) {
            requiredTier = 'premium';
        }

        const requiredTierLevel = FEATURE_REGISTRY.tiers[requiredTier] || 0;
        if (serverTierLevel < requiredTierLevel) {
            return {
                access: false,
                locked: true,
                required: requiredTier,
                icon: requiredTier === 'pro' ? '🔥' : '💎'
            };
        }
    }

    return { access: true, locked: false };
}

module.exports = { FEATURE_REGISTRY, checkAccess, checkCategoryAccess };