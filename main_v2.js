const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

// configurables
const LIMIT = 30

const SQL_LIST_BY_NAME = 'select tvid, name from tv_shows order by name desc limit ?'
const SQL_GET_TV_SHOWS_BY_TVID = 'select * from tv_shows where tvid = ?'

const mkQuery = (sqlStmt, pool) => {
    const f = async (params) => {
        // get a connection from the pool
        const conn = await pool.getConnection()

        try {
            const results = await pool.query(sqlStmt, params)
            return results[0]
        } catch(e) {
            return Promise.reject(e)
        } finally {
            conn.release()
        }
    }
    return f
}

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

// create queries 
const getTVList = mkQuery(SQL_LIST_BY_NAME, pool)
const getTVShowById = mkQuery(SQL_GET_TV_SHOWS_BY_TVID, pool)



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

    try {
        const result = await getTVList([LIMIT])
        console.info(`main: `, result)

        resp.status(200)
        resp.type('text/html')
        resp.render('landing', {tv_show: result})
    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    }
    
})

app.get('/tv_show/:tvid', async (req, resp) => {
    const tvid = req.params['tvid']

    try {
        const result = await getTVShowById([tvid])
        console.info(`result: `, result)
        if (result.length <= 0) {
            resp.status(404)
            resp.type('text/html')
            resp.send(`Not found: ${tvid}`)
        }

        resp.status(200)
        resp.format({
            'text/html': () => {
                resp.type('text/html')
                resp.render('detail', {
                    tv_shows: result[0],
                    hasOfficialSite: !!results[0].official_site
                })

            },
            'application/json': () => {
                resp.type('application/json')
                resp.json(result[0])
            },
            'default': () => {
                resp.type('text/plain')
                resp.send(JSON.stringify(result[0]))
            }
        })
    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    }
})

startApp(app, pool)