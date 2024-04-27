const { sql } = require("../config");

async function checkRoleAdmin(request, response, next) {
  try {
    const queryAccount = "SELECT * FROM Account WHERE id = @id";
    const accountResult = await new sql.Request()
      .input("id", request.userData.uuid)
      .query(queryAccount);

    if (
      accountResult.recordset.length === 1 &&
      accountResult.recordset[0].role === 1
    ) {
      next();
    } else {
      response.status(401).json({
        message: "Ban khong co quyen",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
}

module.exports = checkRoleAdmin;
