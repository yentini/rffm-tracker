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
 * Supports both standard phone JID (@s.whatsapp.net) and modern WhatsApp LID (@lid).
 * All groups, broadcasts, channels and external contacts are forbidden.
 * 
 * @param {string} senderJid - e.g. "34630520210@s.whatsapp.net" or "144456980381736@lid"
 * @param {string} ownerJidOrPhone - e.g. "34630520210:4@s.whatsapp.net"
 * @param {string} [ownerLid] - e.g. "144456980381736:4@lid"
 * @returns {boolean} True if and only if it is the owner's self-chat.
 */
function isAllowedSelfChatSender(senderJid, ownerJidOrPhone, ownerLid) {
  if (!senderJid || typeof senderJid !== 'string') return false;

  // Never allow groups, broadcasts or newsletters
  if (
    senderJid.endsWith('@g.us') ||
    senderJid.endsWith('@broadcast') ||
    senderJid.endsWith('@newsletter')
  ) {
    return false;
  }

  const senderId = normalizePhoneNumber(senderJid);
  const ownerPhone = normalizePhoneNumber(ownerJidOrPhone);
  const ownerLidId = normalizePhoneNumber(ownerLid);

  if (!senderId) return false;

  // Allow if sender matches owner's phone or owner's LID
  if (ownerPhone && senderId === ownerPhone) return true;
  if (ownerLidId && senderId === ownerLidId) return true;

  return false;
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
    trimmed.startsWith('🤖 *ASISTENTE') ||
    trimmed.startsWith('📋 *INFORME DIARIO')
  );
}

module.exports = {
  normalizePhoneNumber,
  isAllowedSelfChatSender,
  isBotSelfEchoText
};
