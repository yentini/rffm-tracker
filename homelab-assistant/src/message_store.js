/**
 * In-memory message store and retry counter cache for Baileys.
 * Solves WhatsApp "Waiting for this message. This may take a while" issue
 * by fulfilling Signal protocol message retry requests.
 */

class MessageRetryCache {
  constructor(maxSize = 2000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  del(key) {
    this.cache.delete(key);
  }

  flushAll() {
    this.cache.clear();
  }
}

class MessageStore {
  constructor(maxSize = 1000) {
    this.messages = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Saves a message payload for subsequent retry / getMessage requests.
   * @param {{ id: string, remoteJid?: string }} key
   * @param {object} messageContent - proto.IMessage or full message object
   */
  saveMessage(key, messageContent) {
    if (!key || !key.id || !messageContent) return;

    // Extract bare IMessage if wrapped in WebMessageInfo
    const payload = messageContent.message ? messageContent.message : messageContent;

    // Evict oldest if reaching capacity
    if (this.messages.size >= this.maxSize) {
      const oldestKey = this.messages.keys().next().value;
      this.messages.delete(oldestKey);
    }

    this.messages.set(key.id, payload);
    if (key.remoteJid) {
      this.messages.set(`${key.remoteJid}:${key.id}`, payload);
    }
  }

  /**
   * Retrieves a message payload by WAMessageKey for retry fulfillment.
   * @param {{ id?: string, remoteJid?: string }} key
   * @returns {object | undefined}
   */
  getMessage(key) {
    if (!key || !key.id) return undefined;

    if (key.remoteJid) {
      const composite = `${key.remoteJid}:${key.id}`;
      if (this.messages.has(composite)) {
        return this.messages.get(composite);
      }
    }

    return this.messages.get(key.id);
  }

  clear() {
    this.messages.clear();
  }

  size() {
    return this.messages.size;
  }
}

const messageStore = new MessageStore();

module.exports = {
  MessageRetryCache,
  MessageStore,
  messageStore
};

