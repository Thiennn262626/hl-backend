"use strict";

require("dotenv").config();

module.exports = {
  name_database_01: {
    alias: process.env.AZURE_SQL_SERVER_DATABASE_NAME,
    config: {
      user: process.env.AZURE_SQL_SERVER_USER_NAME,
      password: process.env.AZURE_SQL_SERVER_PASSWORD,
      database: process.env.AZURE_SQL_SERVER_DATABASE_NAME,
      server: process.env.AZURE_SQL_SERVER_HOST_NAME,
      connectionTimeout: 10000,
      stream: false,
      options: {
        enableArithAbort: true,
        encrypt: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    },
  },
  redis_info: {
    alias: process.env.REDIS_ALIAS,
    config: {
      host: process.env.REDIS_HOST_NAME,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_ACCESS_PASSWORD,
      username: process.env.REDIS_USER_NAME,
    },
  },
};
