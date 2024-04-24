"use strict";

require("dotenv").config();
module.exports = {
  name_database_01: {
    config: {
      user: process.env.AZURE_SQL_SERVER_USER_NAME,
      password: process.env.AZURE_SQL_SERVER_PASSWORD,
      server: process.env.AZURE_SQL_SERVER_HOST_NAME,
      database: process.env.AZURE_SQL_SERVER_DATABASE_NAME,
      options: {
        encrypt: true,
        enableArithAbort: true,
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
