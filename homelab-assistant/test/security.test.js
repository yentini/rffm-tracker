const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePhoneNumber,
  isAllowedSelfChatSender,
  isBotSelfEchoText
} = require('../src/security');

test('normalizePhoneNumber extracts digits correctly', () => {
  assert.equal(normalizePhoneNumber('34630520210@s.whatsapp.net'), '34630520210');
  assert.equal(normalizePhoneNumber('34630520210:4@s.whatsapp.net'), '34630520210');
  assert.equal(normalizePhoneNumber('144456980381736:4@lid'), '144456980381736');
  assert.equal(normalizePhoneNumber('+34 630 52 02 10'), '34630520210');
  assert.equal(normalizePhoneNumber(''), '');
  assert.equal(normalizePhoneNumber(null), '');
});

test('isAllowedSelfChatSender blocks groups, broadcasts and external contacts', () => {
  const owner = '34630520210:4@s.whatsapp.net';
  const ownerLid = '144456980381736:4@lid';

  // 1. WhatsApp Groups must ALWAYS be blocked
  assert.equal(isAllowedSelfChatSender('34630520210-1579770778@g.us', owner, ownerLid), false);
  assert.equal(isAllowedSelfChatSender('1203630234567890@g.us', owner, ownerLid), false);

  // 2. Broadcasts and newsletters must ALWAYS be blocked
  assert.equal(isAllowedSelfChatSender('status@broadcast', owner, ownerLid), false);
  assert.equal(isAllowedSelfChatSender('1203630234567890@newsletter', owner, ownerLid), false);

  // 3. Other contacts (phone or foreign LID) must ALWAYS be blocked
  assert.equal(isAllowedSelfChatSender('34600112233@s.whatsapp.net', owner, ownerLid), false);
  assert.equal(isAllowedSelfChatSender('999999999999999@lid', owner, ownerLid), false);

  // 4. Owner self-chat via phone JID MUST be allowed
  assert.equal(isAllowedSelfChatSender('34630520210@s.whatsapp.net', owner, ownerLid), true);
  assert.equal(isAllowedSelfChatSender('34630520210:0@s.whatsapp.net', owner, ownerLid), true);

  // 5. Owner self-chat via modern WhatsApp LID MUST be allowed
  assert.equal(isAllowedSelfChatSender('144456980381736@lid', owner, ownerLid), true);
  assert.equal(isAllowedSelfChatSender('144456980381736:0@lid', owner, ownerLid), true);
});

test('isBotSelfEchoText detects bot messages to prevent loops', () => {
  assert.equal(isBotSelfEchoText('🍓 *[Homelab AI]*\n\nTodo funcionando.'), true);
  assert.equal(isBotSelfEchoText('📊 *ESTADO HOMELAB RASPBERRY PI 5*'), true);
  assert.equal(isBotSelfEchoText('✅ *AUDITORÍA DE LOGS*'), true);
  assert.equal(isBotSelfEchoText('⚠️ *ERRORES RECIENTES EN LOGS*'), true);
  assert.equal(isBotSelfEchoText('🤖 *ASISTENTE INTELIGENTE HOMELAB*'), true);

  // User queries must not be blocked
  assert.equal(isBotSelfEchoText('!status'), false);
  assert.equal(isBotSelfEchoText('!logs'), false);
  assert.equal(isBotSelfEchoText('¿Cómo va el servidor?'), false);
  assert.equal(isBotSelfEchoText('Hola bot'), false);
});
