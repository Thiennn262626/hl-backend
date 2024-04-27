const sql = require("mssql");
require("dotenv").config();
// const config = require("./configs/dbs.info").name_database_01.config;

// const config = {
//   user: "kltn-server@jobhub-kltn-server",
//   password: "28072002Thanh@",
//   server: "jobhub-kltn-server.database.windows.net",
//   database: "ktln-dbs",
//   options: {
//     encrypt: true,
//     enableArithAbort: true,
//   },
// };
const config = {
  user: "hl-shop-admin",
  password: "12345678QT#",
  server: "hl-shop.database.windows.net",
  database: "hl-shop-database",
  port: 1433,
  options: {
    encrypt: true,
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
