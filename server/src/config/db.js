const dns = require('dns');
const mongoose = require('mongoose');

const DEFAULT_SRV_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];
const SRV_DNS_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEOUT', 'ENOTFOUND', 'ESERVFAIL']);

const parseDnsServers = (value = '') => value
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

const applyDnsServers = (servers, reason) => {
  if (!servers.length) {
    return;
  }

  dns.setServers(servers);
  console.warn(`Using ${reason} DNS servers for MongoDB SRV lookup: ${servers.join(', ')}`);
};

const connectWithMongoose = async (mongoUri) => {
  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000
  });

  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const configuredDnsServers = parseDnsServers(process.env.MONGODB_DNS_SERVERS || process.env.DNS_SERVERS);

  try {
    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI in server/.env');
    }

    applyDnsServers(configuredDnsServers, 'configured');
    return await connectWithMongoose(mongoUri);
  } catch (error) {
    const shouldRetryWithFallbackDns = mongoUri?.startsWith('mongodb+srv://') &&
      !configuredDnsServers.length &&
      SRV_DNS_ERROR_CODES.has(error.code);

    if (shouldRetryWithFallbackDns) {
      try {
        applyDnsServers(DEFAULT_SRV_DNS_SERVERS, 'fallback');
        return await connectWithMongoose(mongoUri);
      } catch (retryError) {
        console.error(`MongoDB connection error: ${retryError.message}`);
        throw retryError;
      }
    }

    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;

