const sql = require("mssql");
const config = require("./configs/dbs.info").name_database_01.config;

sql.connect(config);
console.log("Connected to the database in file config.js");

async function connectToDatabase() {
  try {
    await sql.connect(config);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

module.exports = { connectToDatabase, sql };
