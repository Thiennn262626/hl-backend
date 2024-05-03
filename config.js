const sql = require("mssql");
const config = require("./configs/dbs.info").name_database_01.config;

async function connectToDatabase() {
  try {
    console.log("Connecting to the database...", new Date().toISOString());
    await sql.connect(config);
    console.log("Connected to the database", new Date().toISOString());
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

module.exports = { connectToDatabase, sql };
