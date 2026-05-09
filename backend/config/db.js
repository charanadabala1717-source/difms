const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB connection failed: MONGO_URI is not defined");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        family: 4,
      });
      console.log("MongoDB connected");
      return;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.warn(
          `MongoDB connection attempt ${retries} failed: ${error.message}. Retrying in 2s...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error("MongoDB connection failed after 3 attempts:", error.message);
        console.error(
          "\nTroubleshooting tips:"
        );
        console.error("1. Check your internet connection");
        console.error("2. Verify MONGO_URI in .env file is correct");
        console.error("3. Check MongoDB Atlas firewall rules for your IP");
        console.error("4. Try pinging the hostname: nslookup difms.o6grmnf.mongodb.net");
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
