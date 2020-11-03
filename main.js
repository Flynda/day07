const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

const SQL_LIST_BY_NAME = 'select tvid, name from tv_shows order by name desc limit ? offset ?'
const SQL_GET_TV_SHOWS_BY_TVID = 'select * from tv_shows where tvid = ?'
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'leisure',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 4,
    timezone: '+08:00'
})

const startApp = async (app, pool) => {
    try {
        const conn = await pool.getConnection()

        console.info('Pinging database')
        await conn.ping()

        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    } catch(e) {
        console.error('Cannot ping database: ', e)
    }
}


const app = express()

app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

// configure the application
app.get('/', async (req, resp) => {
    const conn = await pool.getConnection()

    try {
        const results = await conn.query(SQL_LIST_BY_NAME, [20, 0])

        resp.status(200)
        resp.type('text/html')
        resp.render('landing', {tv_show: results[0]})
    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
    
})

app.get('/tv_show/:tvid', async (req, resp) => {
    const tvid = req.params['tvid']
    const conn = await pool.getConnection()

    try {
        const results = await conn.query(SQL_GET_TV_SHOWS_BY_TVID, [tvid])
        const recs = results[0]

        if (recs.length <= 0) {
            resp.status(404)
            resp.type('text/html')
            resp.send(`Not found: ${tvid}`)
        }

        resp.status(200)
        resp.format({
            'text/html': () => {
                resp.type('text/html')
                resp.render('detail', {tv_shows: recs[0]})

            },
            'application/json': () => {
                resp.type('application/json')
                resp.json(rec[0])
            },
            'default': () => {
                resp.type('text/plain')
                resp.send(JSON.stringify(recs[0]))
            }
        })
    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
})

startApp(app, pool)