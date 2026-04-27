const mongoose = require("mongoose");

const env = require("./env");

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  isConnected = true;

  console.log("MongoDB connected successfully.");
  return mongoose.connection;
}

module.exports = connectDatabase;
