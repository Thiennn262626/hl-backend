const { sql } = require("../config");

async function checkRoleAdmin(request, response, next) {
  try {
    const queryAccount = `
    SELECT u.id AS user_id,
    a.role AS role,
    a.isVerify AS isVerify
    FROM Account AS a
    LEFT JOIN [User] AS u on u.id_account = a.id
    WHERE a.id = @id`;
    const accountResult = await new sql.Request()
      .input("id", request.userData.uuid)
      .query(queryAccount);

    if (
      accountResult.recordset.length === 1 &&
      accountResult.recordset[0].role === 1
    ) {
      if (accountResult.recordset[0].isVerify === 0) {
        return response.status(401).json({
          message: "Ban chua xac thuc tai khoan",
        });
      } else {
        request.user_id = accountResult.recordset[0].user_id;
        next();
      }
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
