const sql = require("mssql");
require("dotenv").config();
const config = require("./configs/dbs.info").name_database_01.config;
// const pool = sql.ConnectionPool(config);
sql.connect(config, (err) => {
  if (err) {
    throw err;
  }
  console.log("Connection Successful!");
});

module.exports = sql;
