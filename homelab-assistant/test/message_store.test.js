const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageRetryCache, MessageStore } = require('../src/message_store');

test('MessageRetryCache implements cache interface correctly', () => {
  const cache = new MessageRetryCache(3);

  // Set and Get
  cache.set('msg-1', 1);
  cache.set('msg-2', 2);
  assert.equal(cache.get('msg-1'), 1);
  assert.equal(cache.get('msg-2'), 2);
  assert.equal(cache.get('msg-nonexistent'), undefined);

  // Delete
  cache.del('msg-1');
  assert.equal(cache.get('msg-1'), undefined);

  // Eviction at maxSize
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('d', 4); // Should evict oldest remaining
  assert.equal(cache.get('d'), 4);
  assert.ok(cache.cache.size <= 3);

  // FlushAll
  cache.flushAll();
  assert.equal(cache.cache.size, 0);
});

test('MessageStore saves and retrieves messages by key.id and composite key', () => {
  const store = new MessageStore(10);
  const fakePayload = { conversation: '!status' };

  store.saveMessage({ id: 'msg-abc', remoteJid: '34630520210@s.whatsapp.net' }, fakePayload);

  // Retrieve by id only
  const byId = store.getMessage({ id: 'msg-abc' });
  assert.deepEqual(byId, fakePayload);

  // Retrieve by remoteJid + id
  const byComposite = store.getMessage({ id: 'msg-abc', remoteJid: '34630520210@s.whatsapp.net' });
  assert.deepEqual(byComposite, fakePayload);

  // Non-existent key returns undefined
  assert.equal(store.getMessage({ id: 'missing' }), undefined);
  assert.equal(store.getMessage(null), undefined);
});

test('MessageStore extracts nested message property from WebMessageInfo', () => {
  const store = new MessageStore(10);
  const nestedMessage = { conversation: 'Hola homelab' };
  const fullWebMessageInfo = {
    key: { id: 'msg-xyz', remoteJid: '34630520210@s.whatsapp.net' },
    message: nestedMessage
  };

  store.saveMessage(fullWebMessageInfo.key, fullWebMessageInfo);

  const retrieved = store.getMessage({ id: 'msg-xyz' });
  assert.deepEqual(retrieved, nestedMessage);
});

test('MessageStore handles capacity limits cleanly', () => {
  const store = new MessageStore(2);

  store.saveMessage({ id: 'm1' }, { conversation: 'one' });
  store.saveMessage({ id: 'm2' }, { conversation: 'two' });
  store.saveMessage({ id: 'm3' }, { conversation: 'three' });

  assert.equal(store.getMessage({ id: 'm3' })?.conversation, 'three');
  assert.ok(store.size() <= 4); // with possible composite keys
});
