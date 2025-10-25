const mysql = require('mysql2')
// const pool = mysql.createPool({
//     host: '127.0.0.1',
//     user: 'root',
//     password: 'rseditz@222',
//     database: 'cly'


// })
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'adminuser',
    password: 'Vishal@13241',
    database: 'clydb'
})


module.exports = pool.promise();