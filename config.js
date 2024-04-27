const sql = require("mssql");
require("dotenv").config();
// const config = require("./configs/dbs.info").name_database_01.config;

const config = {
  user: "hl-shop-admin",
  password: "12345678QT#",
  server: "hl-shop.database.windows.net",
  database: "hl-shop-database",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
async function connectToDatabase() {
  try {
    await sql.connect(config);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

// const pool = sql.ConnectionPool(config);
// sql.connect(config, (err) => {
//   if (err) {
//     throw err;
//   }
//   console.log("Connection Successful!");
// });

module.exports = { connectToDatabase, sql };
