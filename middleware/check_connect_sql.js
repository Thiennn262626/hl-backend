const { sql } = require("../config");

async function checkConnectedSQL(request, response, next) {
  try {
    console.log(
      "Checking the connection to the database...",
      new Date().toISOString()
    );
    await new sql.Request().query("");
    console.log("Connected", new Date().toISOString());
    next();
  } catch (error) {
    console.log("error connecting to the database:", error);
    console.log("Reconnecting to the database...", new Date().toISOString());
    console.log("Reconnected", new Date().toISOString());
    next();
  }
}

module.exports = checkConnectedSQL;
