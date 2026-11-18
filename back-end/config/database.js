
const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err.message);
        return;
    }

    console.log("Banco de dados conectado com sucesso!");

    connection.release();
});

module.exports = pool;
