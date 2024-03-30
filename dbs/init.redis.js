"use strict";

const redis = require("ioredis");
const { RedisErrorResponse } = require("../core/error.response");
require("dotenv").config();
const { redis_info } = require("../configs/dbs.info");
let client = {},
  statusConnectRedis = {
    CONNECT: "connect",
    END: "end",
    RECONNECTING: "reconnecting",
    ERROR: "error",
  },
  connectiontimeout;

const REDIS_CONNECT_TIMEOUT = 50000,
  REDIS_CONNECT_MASSAGE = {
    code: -99,
    message: {
      vn: "Kết nối với redis thất bại",
      en: "Connect to redis failed",
    },
  };
const handleConnectTimeout = () => {
  connectiontimeout = setTimeout(() => {
    throw RedisErrorResponse(
      REDIS_CONNECT_MASSAGE.message.vn,
      REDIS_CONNECT_MASSAGE.code
    );
  }, REDIS_CONNECT_TIMEOUT);
};

const handleEventConnection = ({ connectionRedis }) => {
  connectionRedis.on(statusConnectRedis.CONNECT, () => {
    console.log("connection redis - connectionStatus: CONNECTED");
    clearTimeout(connectiontimeout);
  });

  connectionRedis.on(statusConnectRedis.END, () => {
    console.log("connection redis - connectionStatus: END");
    handleConnectTimeout();
  });

  connectionRedis.on(statusConnectRedis.RECONNECTING, () => {
    console.log("connection redis - connectionStatus: RECONNECTING");
    clearTimeout(connectiontimeout);
  });

  connectionRedis.on(statusConnectRedis.ERROR, (err) => {
    console.log("connection redis - connectionStatus: ERROR", err);
    handleConnectTimeout();
  });
};

const initRedis = () => {
  const instanceRedis = redis.createClient(redis_info.config);
  client.instanceConnect = instanceRedis;
  handleEventConnection({ connectionRedis: instanceRedis });
};

const getRedis = () => client;
const closeRedis = () => {
  client.instanceConnect.quit();
};

module.exports = { initRedis, getRedis, closeRedis };
