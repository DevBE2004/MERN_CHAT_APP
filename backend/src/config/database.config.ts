import mongoose, { ConnectOptions } from 'mongoose'
import { Env } from './env.config'

const dbOptions: ConnectOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,

  // Thời gian chờ kết nối (Tránh treo App nếu DB sập)
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,

  // Đảm bảo dữ liệu được ghi vào đa số các node (An toàn dữ liệu)
  writeConcern: { w: 'majority' },

  // Tự động thử lại nếu mạng chập chờn
  retryWrites: true,
  retryReads: true,
}

const connectDatabase = async () => {
  try {
    //mongodb://user:pass@host1,host2,host3/db?replicaSet=rs0
    mongoose.set('strictQuery', true)

    await mongoose.connect(Env.MONGO_URI, dbOptions)

    console.log('🍃 MongoDB: Connected to Cluster ✅')
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error)
  }
}

// Theo dõi các sự kiện của kết nối (Giống handleEvents của Redis)
mongoose.connection.on('connected', () => console.log('MongoDB: Event - Connected'))
mongoose.connection.on('error', err => console.error('MongoDB: Event - Error', err))
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB: Event - Disconnected. Retrying... 🔄')
  connectDatabase()
})

export default connectDatabase
