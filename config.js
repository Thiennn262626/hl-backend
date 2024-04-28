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

async function connectToDatabaseWithRetry() {
  let connected = false;
  while (!connected) {
    try {
      await sql.connect(config);
      console.log("Connected to the database");
      connected = true;
    } catch (error) {
      console.error("Error connecting to the database:", error);
      console.log("Retrying in 1 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Thử lại sau 10 giây
    }
  }
}

module.exports = { connectToDatabaseWithRetry, connectToDatabase, sql };
