const sql = require("mssql");
require("dotenv").config();
// const config = require("./configs/dbs.info").name_database_01.config;
server = "jobhub-kltn-server.database.windows.net";
database = "ktln-dbs";
username = "kltn-server@jobhub-kltn-server";
password = "28072002Thanh@";
const config = {
  user: "kltn-server@jobhub-kltn-server",
  password: "28072002Thanh@",
  server: "jobhub-kltn-server.database.windows.net",
  database: "ktln-dbs",
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};
// const pool = sql.ConnectionPool(config);
sql.connect(config, (err) => {
  if (err) {
    throw err;
  }
  console.log("Connection Successful!");
});

module.exports = sql;
