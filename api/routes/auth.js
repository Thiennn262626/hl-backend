const express = require("express");
const router = express.Router();

const mail_util = require("../../utils/mail");
const { sql } = require("../../config");
const jwt = require("jsonwebtoken");
require("dotenv").config();

router.post("/signup-email", async (request, response) => {
  try {
    const email = request.body.userLogin;
    const password = request.body.password;
    const query =
      "SELECT id, isVerify FROM Account WHERE userLogin = @userLogin";
    const result = await new sql.Request()
      .input("userLogin", email)
      .query(query);

    if (result.recordset.length !== 0) {
      if (result.recordset[0].isVerify === 0) {
        response.status(400).json({
          errorCode: "MSG0046",
          message: "Account is not verified",
          userLogin: email,
          userID: result.recordset[0].id,
        });
        return;
      } else {
        response.status(400).json({
          errorCode: "MSG0044",
          message: "Account is existing",
          userLogin: email,
          userID: result.recordset[0].id,
        });
        return;
      }
    } else {
      const role = 0;
      const createdDate = new Date();
      const expired = new Date(createdDate.getTime() + 32000);
      const isVerify = 0; //Lúc đăng ký chưa xác nhận thì có giá trị 0, sau khi xác nhận thì có giá trị 1

      const queryAccount =
        "INSERT INTO Account(userLogin, password, role, isVerify , createdDate) OUTPUT inserted.id VALUES (@email, @password, @role, @isVerify, @createdDate)";
      const accountResult = await new sql.Request()
        .input("email", email)
        .input("password", password)
        .input("role", role)
        .input("isVerify", isVerify)
        .input("createdDate", createdDate)
        .query(queryAccount);

      var otp = mail_util.getRandomInt();
      mail_util.sendOTP(email, otp);

      const insertedAccountId = accountResult.recordset[0].id;

      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", insertedAccountId)
        .query(queryOtp);

      response.status(201).json({
        userID: insertedAccountId,
        uuid: otpResult.recordset[0].id,
        userLogin: email,
        today: createdDate.toISOString(),
        expired: expired.toISOString(),
        otp: otp.toString(),
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/signup-phone", async (request, response) => {
  try {
    const phone = request.body.userLogin;
    const password = request.body.password;
    const query =
      "SELECT id, isVerify FROM Account WHERE userLogin = @userLogin";
    const result = await new sql.Request()
      .input("userLogin", phone)
      .query(query);

    if (result.recordset.length !== 0) {
      if (result.recordset[0].isVerify === 0) {
        response.status(400).json({
          errorCode: "MSG0046",
          message: "Account is not verified",
          userLogin: phone,
          userID: result.recordset[0].id,
        });
        return;
      } else {
        response.status(400).json({
          errorCode: "MSG0044",
          message: "Account is existing",
          userLogin: phone,
          userID: result.recordset[0].id,
        });
        return;
      }
    } else {
      const role = 0;
      const createdDate = new Date();
      const expired = new Date(createdDate.getTime() + 32000);
      const isVerify = 0; //Lúc đăng ký chưa xác nhận thì có giá trị 0, sau khi xác nhận thì có giá trị 1

      const queryAccount =
        "INSERT INTO Account(userLogin, password, role, isVerify , createdDate) OUTPUT inserted.id VALUES (@phone, @password, @role, @isVerify, @createdDate)";
      const accountResult = await new sql.Request()
        .input("phone", phone)
        .input("password", password)
        .input("role", role)
        .input("isVerify", isVerify)
        .input("createdDate", createdDate)
        .query(queryAccount);

      var otp = mail_util.getRandomInt();

      const insertedAccountId = accountResult.recordset[0].id;

      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", insertedAccountId)
        .query(queryOtp);

      response.status(201).json({
        userID: insertedAccountId,
        uuid: otpResult.recordset[0].id,
        userLogin: phone,
        today: createdDate.toISOString(),
        expired: expired.toISOString(),
        otp: otp.toString(),
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/verify-otp", async (request, response) => {
  let transaction = new sql.Transaction();
  try {
    const idAccount = request.body.userID;
    const idOtp = request.body.uuid;
    const otp = request.body.otp;

    const query =
      "SELECT * FROM Otp WHERE id_account = @idAccount AND createdDate = (SELECT MAX(createdDate) FROM OTP ) AND id = @idOtp";
    const result = await new sql.Request()
      .input("idAccount", idAccount)
      .input("idOtp", idOtp)
      .query(query);

    const today = new Date();
    const expired = today.getTime() - result.recordset[0].createdDate.getTime();
    if (expired < 32000) {
      if (result.recordset[0].value === parseInt(otp)) {
        await transaction
          .begin()
          .then(async () => {
            const queryAccount =
              "UPDATE Account SET isVerify  = 1 OUTPUT inserted.userLogin WHERE id = @idAccount";
            const accountResult = await transaction
              .request()
              .input("idAccount", idAccount)
              .query(queryAccount);

            const queryUser = `INSERT INTO [User] (id_account, contactFullName, createdDate) 
                                OUTPUT inserted.id
                                VALUES(@idAccount, @contactFullName, @createDated)`;
            const userResult = await transaction
              .request()
              .input("idAccount", idAccount)
              .input("createDated", result.recordset[0].createdDate)
              .input("contactFullName", accountResult.recordset[0].userLogin)
              .query(queryUser);
            checkIsEmail(accountResult.recordset[0].userLogin) === true
              ? await createEmail(
                  userResult.recordset[0].id,
                  accountResult.recordset[0].userLogin,
                  1,
                  transaction
                )
              : null;

            const token = jwt.sign(
              { uuid: idAccount },
              process.env.privateKey,
              {
                expiresIn: "10h",
              }
            );

            await transaction.commit();
            response.status(201).json({
              token: token,
              userID: idAccount,
              userLogin: accountResult.recordset[0].userLogin,
              accountType: 1,
            });
          })
          .catch(async (err) => {
            await transaction.rollback();
            throw err;
          });
        return {};
      } else {
        response.status(400).json({
          errorCode: "MSG0008",
          message: "Mã otp của bạn bị sai",
        });
      }
    } else {
      response.status(400).json({
        errorCode: "MSG0043",
        message: "Mã otp của bạn  đã quá hạn!",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

function checkIsEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  console.log("re.test(email): ", re.test(email));
  return re.test(email);
}

async function createEmail(user_id, emailAddress, isDefault, transaction) {
  try {
    const query = `
          UPDATE Email
          SET createdDate = @createdDate
          WHERE idUser = @user_id AND emailAddress = @email;

          IF @@ROWCOUNT = 0
          BEGIN
              INSERT INTO Email (idUser, emailAddress, isDefault, isVerify, createdDate)
              VALUES (@user_id, @email, @isDefault, 1, @createdDate);
          END;

          SELECT 'Action' = CASE WHEN @@ROWCOUNT > 0 THEN 'UPDATE' ELSE 'INSERT' END,
                'id' = id,
                'idUser' = idUser
          FROM Email
          WHERE idUser = @user_id AND emailAddress = @email;
        `;
    const result = await transaction
      .request()
      .input("email", emailAddress)
      .input("isDefault", isDefault)
      .input("user_id", user_id)
      .input("createdDate", new Date())

      .query(query);
    console.log(result);
    return result.recordset[0].id;
  } catch (error) {
    console.log(error);
    throw "createEmail";
  }
}

router.post("/resend-otp-email", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const query = "SELECT userLogin FROM Account WHERE id = @idAccount";
    const result = await new sql.Request()
      .input("idAccount", idAccount)
      .query(query);

    if (result.recordset.length !== 0) {
      const mail = result.recordset[0].userLogin;

      var otp = mail_util.getRandomInt();
      mail_util.sendOTP(mail, otp);

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 32000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", idAccount)
        .query(queryOtp);

      response.status(201).json({
        userID: idAccount,
        uuid: otpResult.recordset[0].id,
        userLogin: result.recordset[0].userLogin,
        today: createdDate,
        expired: expiredDate,
        otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/resend-otp-phone", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const phone = request.body.phone;

    const query = "SELECT userLogin FROM Account WHERE id = @idAccount";
    const result = await new sql.Request()
      .input("idAccount", idAccount)
      .query(query);

    if (result.recordset.length !== 0) {
      var otp = mail_util.getRandomInt();

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 32000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id  VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", idAccount)
        .query(queryOtp);

      response.status(201).json({
        userID: idAccount,
        uuid: otpResult.recordset[0].id,
        userLogin: phone,
        today: createdDate,
        expired: expiredDate,
        otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/signin-email", async (request, response) => {
  try {
    const email = request.body.userLogin;
    const password = request.body.password;

    const query = "SELECT * FROM Account WHERE userLogin = @email";
    const result = await new sql.Request()
      .input("email", email)
      .input("password", password)
      .query(query);

    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    } else {
      if (result.recordset[0].password === password) {
        if (result.recordset[0].role === 0) {
          if (result.recordset[0].isVerify === 0) {
            response.status(400).json({
              errorCode: "MSG0046",
              message: "Account is not verified",
            });
          } else {
            const token = jwt.sign(
              { uuid: result.recordset[0].id },
              process.env.privateKey,
              { expiresIn: "10h" }
            );
            response.status(201).json({
              token: token,
              userID: result.recordset[0].id,
              userLogin: email,
              accountType: result.recordset[0].role,
            });
            callPythonService(result.recordset[0].id);
          }
        } else {
          response.status(400).json({
            errorCode: "MSG0047",
            message: "Ban khong co quyen dang nhap",
          });
        }
      } else {
        response.status(400).json({
          errorCode: "MSG0021",
          message: "Password or phone is not correct",
        });
      }
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

const axios = require("axios");
function callPythonService(userId) {
  const url = `http://0.0.0.0:80/get-recommendation-by-user/${userId}`;
  console.log("url: ", url);

  // Gọi request tới URL bằng axios
  axios
    .get(url)
    .then(() => {
      console.log("Request sent to Python service successfully.");
    })
    .catch((error) => {
      console.error("Error sending request to Python service:", error);
    });
}

router.post("/signin-phone", async (request, response) => {
  try {
    const phone = request.body.userLogin;
    const password = request.body.password;

    const query = "SELECT * FROM Account WHERE userLogin = @phone";
    const result = await new sql.Request().input("phone", phone).query(query);
    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    } else {
      if (result.recordset[0].password === password) {
        if (result.recordset[0].role === 0) {
          if (result.recordset[0].isVerify === 0) {
            response.status(400).json({
              errorCode: "MSG0046",
              message: "Account is not verified",
            });
          } else {
            const token = jwt.sign(
              { uuid: result.recordset[0].id },
              process.env.privateKey,
              { expiresIn: "10h" }
            );
            response.status(201).json({
              token: token,
              userID: result.recordset[0].id,
              userLogin: phone,
              accountType: result.recordset[0].role,
            });
          }
        } else {
          response.status(400).json({
            errorCode: "MSG0047",
            message: "Ban khong co quyen dang nhap",
          });
        }
      } else {
        response.status(400).json({
          errorCode: "MSG0021",
          message: "Password or phone is not correct",
        });
      }
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/forgot-password/send-otp-email", async (request, response) => {
  try {
    const email = request.body.userLogin;
    const query = "SELECT id FROM Account WHERE userLogin = @email";
    const result = await new sql.Request().input("email", email).query(query);

    if (result.recordset.length !== 0) {
      var otp = mail_util.getRandomInt();
      mail_util.sendOTP(email, otp);

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 32000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", result.recordset[0].id)
        .query(queryOtp);

      response.status(201).json({
        userID: result.recordset[0].id,
        uuid: otpResult.recordset[0].id,
        userLogin: email,
        today: createdDate,
        expired: expiredDate,
        // otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/forgot-password/send-otp-phone", async (request, response) => {
  try {
    const phone = request.body.userLogin;
    const query = "SELECT id FROM Account WHERE userLogin = @phone";
    const result = await new sql.Request().input("phone", phone).query(query);

    if (result.recordset.length !== 0) {
      var otp = mail_util.getRandomInt();

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 32000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await new sql.Request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", result.recordset[0].id)
        .query(queryOtp);

      response.status(201).json({
        userID: result.recordset[0].id,
        uuid: otpResult.recordset[0].id,
        userLogin: phone,
        today: createdDate,
        expired: expiredDate,
        otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/forgot-password/verify-otp", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const idOtp = request.body.uuid;
    const otp = request.body.otp;

    const query =
      "SELECT * FROM Otp WHERE id_account = @idAccount AND createdDate = (SELECT MAX(createdDate) FROM OTP ) AND id = @idOtp";
    const result = await new sql.Request()
      .input("idAccount", idAccount)
      .input("idOtp", idOtp)
      .query(query);

    const today = new Date();
    const expired = today.getTime() - result.recordset[0].createdDate.getTime();
    if (expired < 32000) {
      if (result.recordset[0].value === parseInt(otp)) {
        const token = jwt.sign({ uuid: idAccount }, process.env.privateKey, {
          expiresIn: "10h",
        });
        response.status(201).json({
          token: token,
          userID: idAccount,
        });
      } else {
        response.status(400).json({
          errorCode: "MSG0008",
          message: "Mã otp của bạn bị sai",
        });
      }
    } else {
      response.status(400).json({
        errorCode: "MSG0043",
        message: "Mã otp của bạn  đã quá hạn!",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post(
  "/forgot-password/create-password",
  async (request, response) => {}
);
module.exports = router;
