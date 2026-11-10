/**
 * Security and message filtering rules for Homelab WhatsApp Assistant.
 * Enforces Zero-Leakage policy: Only ever process messages in self-chat.
 */

/**
 * Normalizes a WhatsApp JID or phone number string to purely numeric digits.
 * @param {string} jidOrPhone 
 * @returns {string}
 */
function normalizePhoneNumber(jidOrPhone) {
  if (!jidOrPhone) return '';
  return jidOrPhone.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

/**
 * Checks whether an incoming sender JID is strictly allowed.
 * Only the registered owner's 1-on-1 self-chat is allowed.
 * All groups, broadcasts, channels and external contacts are forbidden.
 * 
 * @param {string} senderJid - e.g. "34630520210@s.whatsapp.net" or "xxx@g.us"
 * @param {string} ownerJidOrPhone - e.g. "34630520210:4@s.whatsapp.net"
 * @returns {boolean} True if and only if it is the owner's self-chat.
 */
function isAllowedSelfChatSender(senderJid, ownerJidOrPhone) {
  if (!senderJid || typeof senderJid !== 'string') return false;

  // Never allow groups, broadcasts or newsletters
  if (
    senderJid.endsWith('@g.us') ||
    senderJid.endsWith('@broadcast') ||
    senderJid.endsWith('@newsletter')
  ) {
    return false;
  }

  const senderPhone = normalizePhoneNumber(senderJid);
  const ownerPhone = normalizePhoneNumber(ownerJidOrPhone);

  if (!senderPhone || !ownerPhone) return false;

  return senderPhone === ownerPhone;
}

/**
 * Determines whether a message text is an automated response from the bot itself.
 * Used to prevent infinite message loops.
 * 
 * @param {string} text 
 * @returns {boolean}
 */
function isBotSelfEchoText(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith('🍓') ||
    trimmed.startsWith('📊 *ESTADO') ||
    trimmed.startsWith('✅ *AUDITORÍA') ||
    trimmed.startsWith('⚠️ *ERRORES') ||
    trimmed.startsWith('🤖 *ASISTENTE')
  );
}

module.exports = {
  normalizePhoneNumber,
  isAllowedSelfChatSender,
  isBotSelfEchoText
};
