const sql = require("mssql");
require("dotenv").config();
const config = require("./configs/dbs.info").name_database_01.config;
const pool = new sql.ConnectionPool(config);

module.exports = pool;
