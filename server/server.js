require('dotenv').config()

const connectDB = require('./src/config/db')
const app = require('./src/app')

const PORT = process.env.PORT || 5001

const startServer = async () => {
  try {
    await connectDB()

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the existing process or change PORT in server/.env before restarting.`
        )
        process.exit(1)
      }

      throw error
    })
  } catch (error) {
    console.error(`Startup failed: ${error.message}`)
    process.exit(1)
  }
}

startServer()
