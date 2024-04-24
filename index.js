const express = require("express");
var cors = require("cors");
require("dotenv").config();
const path = require("path");
const app = express();
app.use(cors());

const port = 3000;

const initRedis = require("./dbs/init.redis");
initRedis.initRedis();

// const initSql = require("./dbs/init.sqlserver");

//import file
const accountRouter = require("./api/routes/account");
const categoryRouter = require("./api/routes/category");
const userRouter = require("./api/routes/user");
const addressRouter = require("./api/routes/address");
const productRouter = require("./api/routes/product");
const cartRouter = require("./api/routes/cart");
const cityRouter = require("./api/routes/city");
const districtRouter = require("./api/routes/district");
const wardRouter = require("./api/routes/ward");
const orderRouter = require("./api/routes/order");
const feeShipRouter = require("./api/routes/feeship");
const subcribeRouter = require("./api/routes/subcribe");
const ratingRouter = require("./api/routes/rating");

//import file admin
const adminAccountRouter = require("./admin/routes/account");
const adminCategoryRouter = require("./admin/routes/category");
const adminProductRouter = require("./admin/routes/product");
const adminOrderRouter = require("./admin/routes/order");
const adminUserRouter = require("./admin/routes/user");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//use method from file
app.use("/api/hlshop/auth", accountRouter);
app.use("/api/hlshop/users", userRouter);
app.use("/api/hlshop/product-category", categoryRouter);
app.use("/api/hlshop/receiver-address", addressRouter);
app.use("/api/hlshop/product", productRouter);
app.use("/api/hlshop/cart", cartRouter);
app.use("/api/hlshop/cities", cityRouter);
app.use("/api/hlshop/district", districtRouter);
app.use("/api/hlshop/order", orderRouter);
app.use("/api/hlshop/ward", wardRouter);
app.use("/api/hlshop/feeship", feeShipRouter);
app.use("/api/hlshop/subcribe", subcribeRouter);
app.use("/api/hlshop/rating", ratingRouter);

//use method from file admin
app.use("/api/hlshop/admin/auth", adminAccountRouter);
app.use("/api/hlshop/admin/product-category", adminCategoryRouter);
app.use("/api/hlshop/admin/product", adminProductRouter);
app.use("/api/hlshop/admin/order", adminOrderRouter);
app.use("/api/hlshop/admin/users", adminUserRouter);

const { name_database_01 } = require("./configs/dbs.info");

const sql = require("mssql");
const { redis_info } = require("./configs/dbs.info");
const config = {
  user: process.env.AZURE_SQL_SERVER_USER_NAME,
  password: process.env.AZURE_SQL_SERVER_PASSWORD,
  server: process.env.AZURE_SQL_SERVER_HOST_NAME,
  database: process.env.AZURE_SQL_SERVER_DATABASE_NAME,
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};
const pool = new sql.ConnectionPool(config);
var check = "false";

const connection = pool
  .connect()
  .then(() => {
    console.log("Đã kết nối với cơ sở dữ liệu SQL Server trên Azure...0000");
    check = "true000";
  })
  .catch((err) => {
    console.error("Lỗi kết nối: " + err.stack);
    check = "falseeeeeeee000 " + err;
  });
app.get("/", function (request, response) {
  response.send({
    message: "Welcome to HLShop API",
    check: check,
    config: config,
    redis_info: redis_info,
  });
});

// const router = require("express").Router();
// app.use("/", router);
app.listen(port, () =>
  console.log(`Server is running on port http://localhost:${port}`)
);

module.exports = app;
