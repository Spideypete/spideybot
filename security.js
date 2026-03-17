// ============== SPIDEY BOT ADVANCED SECURITY MODULE ==============
// Exceeds Wick Bot capabilities with enterprise-grade protection

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============== RATE LIMITING ==============
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isRateLimited(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return true;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return false;
  }

  middleware() {
    return (req, res, next) => {
      const identifier = req.ip || req.connection.remoteAddress;
      if (this.isRateLimited(identifier)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      next();
    };
  }
}

// ============== INPUT VALIDATION & SANITIZATION ==============
class SecurityValidator {
  // Remove dangerous characters and scripts
  static sanitize(input) {
    if (!input) return '';
    return String(input)
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>\"'`;]/g, '') // Remove dangerous characters
      .trim();
  }

  // Validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate Discord user ID
  static isValidDiscordId(id) {
    return /^\d{17,19}$/.test(id);
  }

  // Validate URL (prevent malicious redirects)
  static isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Check for SQL injection patterns
  static hasSqlInjectionPatterns(input) {
    const dangerousPatterns = [
      /(\bOR\b|\bAND\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bUNION\b)\s*--/gi,
      /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
      /\/\*.*?\*\//g
    ];
    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  // XSS prevention - check for dangerous JavaScript patterns
  static hasXssPatterns(input) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\(/gi,
      /expression\(/gi
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }
}

// ============== SECURITY HEADERS MIDDLEWARE ==============
function securityHeadersMiddleware(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://cdn.discordapp.com data:; connect-src 'self' https:");
  
  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
}

// ============== WEBHOOK SIGNATURE VERIFICATION ==============
class WebhookSignatureVerifier {
  static verifySignature(payload, signature, secret) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  static generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

// ============== AUDIT LOGGING ==============
class SecurityAuditLogger {
  constructor(logFile = 'security-audit.log') {
    this.logFile = path.join(__dirname, logFile);
  }

  log(event, details) {
    const timestamp = new Date().toISOString();
    const severity = details.severity || 'INFO';
    const ip = details.ip || 'UNKNOWN';
    const userId = details.userId || 'SYSTEM';
    const action = details.action || 'UNKNOWN';
    
    const logEntry = {
      timestamp,
      severity,
      userId,
      ip,
      action,
      details: SecurityValidator.sanitize(JSON.stringify(details.metadata || {})),
      status: details.status || 'SUCCESS'
    };

    const logLine = JSON.stringify(logEntry);
    fs.appendFileSync(this.logFile, logLine + '\n');

    if (severity === 'CRITICAL') {
      console.error(`🚨 SECURITY ALERT: ${action} - ${logLine}`);
    } else if (severity === 'WARNING') {
      console.warn(`⚠️ SECURITY WARNING: ${action} - ${logLine}`);
    }
  }

  // Log suspicious activity
  logSuspiciousActivity(userId, action, reason, ip) {
    this.log('SUSPICIOUS_ACTIVITY', {
      severity: 'WARNING',
      userId,
      ip,
      action: `SUSPICIOUS_${action}`,
      metadata: { reason }
    });
  }

  // Log failed authentication
  logFailedAuth(userId, ip) {
    this.log('AUTH_FAILURE', {
      severity: 'WARNING',
      userId: userId || 'UNKNOWN',
      ip,
      action: 'FAILED_AUTHENTICATION',
      metadata: { attemptedLogin: true }
    });
  }

  // Log unauthorized access attempt
  logUnauthorizedAccess(userId, resource, ip) {
    this.log('UNAUTHORIZED_ACCESS', {
      severity: 'CRITICAL',
      userId,
      ip,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      metadata: { resource }
    });
  }

  // Log config changes
  logConfigChange(userId, guildId, changes, ip) {
    this.log('CONFIG_CHANGE', {
      severity: 'INFO',
      userId,
      ip,
      action: 'CONFIGURATION_CHANGED',
      metadata: { guildId, changes }
    });
  }

  // Get recent security events
  getRecentEvents(hours = 24) {
    if (!fs.existsSync(this.logFile)) return [];
    
    const content = fs.readFileSync(this.logFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return lines
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(e => e && e.timestamp > cutoffTime);
  }
}

// ============== ANTI-SPAM ENGINE ==============
class AntiSpamEngine {
  constructor() {
    this.userSpamScores = new Map();
    this.messageHistory = new Map();
  }

  calculateSpamScore(userId, message, messageCount = 1) {
    let score = 0;
    const msg = message.toLowerCase();

    // Repetitive content (similar to recent messages)
    const history = this.messageHistory.get(userId) || [];
    const recentMessages = history.slice(-5);
    const similarities = recentMessages.filter(m => {
      const similarity = this.calculateSimilarity(msg, m);
      return similarity > 0.8;
    }).length;
    score += similarities * 15;

    // All caps
    if (/[A-Z]{10,}/.test(message)) score += 20;

    // Emoji spam
    const emojiCount = (message.match(/[\p{Emoji}]/gu) || []).length;
    if (emojiCount > 10) score += 25;

    // Mention spam
    const mentions = (message.match(/<@!?\d+>/g) || []).length;
    if (mentions > 5) score += 30;

    // Rapid messages
    if (messageCount > 5) score += messageCount * 10;

    // Update history
    if (!this.messageHistory.has(userId)) {
      this.messageHistory.set(userId, []);
    }
    const userHistory = this.messageHistory.get(userId);
    userHistory.push(msg);
    if (userHistory.length > 20) userHistory.shift();

    return Math.min(score, 100);
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  isSpam(score) {
    return score > 60;
  }
}

// ============== JOIN GATE SYSTEM ==============
class JoinGateSystem {
  constructor() {
    this.quarantinedUsers = new Map();
  }

  analyzeNewMember(member) {
    const flags = [];
    const score = this.calculateRiskScore(member);

    // Account age check
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) flags.push('brand_new_account');
    if (accountAgeDays < 7) flags.push('very_new_account');

    // No avatar
    if (!member.user.avatar) flags.push('no_profile_picture');

    // Bot account
    if (member.user.bot) flags.push('bot_account');

    // Suspicious patterns
    if (member.user.username.includes('http') || member.user.username.includes('discord.gg')) {
      flags.push('suspicious_username');
    }

    return { score, flags, shouldQuarantine: score > 70 };
  }

  calculateRiskScore(member) {
    let score = 0;
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

    if (accountAgeDays < 1) score += 40;
    else if (accountAgeDays < 7) score += 25;
    else if (accountAgeDays < 30) score += 10;

    if (!member.user.avatar) score += 20;
    if (member.user.username.length < 3 || member.user.username.length > 32) score += 15;
    if (/\d{8,}/.test(member.user.username)) score += 10; // Numbers in username

    return Math.min(score, 100);
  }

  quarantineUser(userId, guildId) {
    const key = `${guildId}:${userId}`;
    this.quarantinedUsers.set(key, {
      timestamp: Date.now(),
      reviewed: false
    });
  }

  isQuarantined(userId, guildId) {
    const key = `${guildId}:${userId}`;
    return this.quarantinedUsers.has(key);
  }
}

// ============== BACKUP SYSTEM ==============
class BackupSystem {
  constructor(backupDir = 'backups') {
    this.backupDir = path.join(__dirname, backupDir);
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  createBackup(config, guildId) {
    const timestamp = Date.now();
    const filename = `backup_${guildId}_${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    
    return {
      id: timestamp,
      filename,
      filepath,
      timestamp,
      size: fs.statSync(filepath).size
    };
  }

  listBackups(guildId) {
    const files = fs.readdirSync(this.backupDir);
    return files
      .filter(f => f.startsWith(`backup_${guildId}_`))
      .map(f => {
        const filepath = path.join(this.backupDir, f);
        const stat = fs.statSync(filepath);
        return {
          filename: f,
          timestamp: stat.mtime,
          size: stat.size
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  restoreBackup(guildId, timestamp) {
    const filename = `backup_${guildId}_${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }

  autoCleanup(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(this.backupDir);
    
    files.forEach(f => {
      const filepath = path.join(this.backupDir, f);
      const stat = fs.statSync(filepath);
      if (stat.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filepath);
      }
    });
  }
}

// ============== EXPORT ==============
module.exports = {
  RateLimiter,
  SecurityValidator,
  securityHeadersMiddleware,
  WebhookSignatureVerifier,
  SecurityAuditLogger,
  AntiSpamEngine,
  JoinGateSystem,
  BackupSystem
};
