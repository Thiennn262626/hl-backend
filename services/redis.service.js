"use strict";

const { getRedis } = require("../dbs/init.redis");
const { instanceConnect: redisClient } = getRedis();

class RedisService {
  constructor() {
    this.client = redisClient;
  }

  async set(key, value) {
    console.log("set", key);
    return this.client.set(key, value);
  }

  async setJson(key, value) {
    return this.client.set(key, JSON.stringify(value));
  }

  async get(key) {
    return this.client.get(key);
  }
  async getJson(key) {
    return JSON.parse(await this.client.get(key));
  }

  async del(key) {
    return this.client.del(key);
  }

  async expire(key, seconds) {
    return this.client.expire(key, seconds);
  }

  async keys(pattern) {
    return this.client.keys(pattern);
  }
}

module.exports = new RedisService();
