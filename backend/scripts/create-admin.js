require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// عدل المسار حسب مكان الموديل عندك
const User = require("../models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const email = "admin@test.com";
    const plainPassword = "123456";

    const exists = await User.findOne({ email });
    if (exists) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const admin = await User.create({
      name: "System Admin",
      email,
      password: hashedPassword,
      role: "Admin",
    });

    console.log("Admin created successfully");
    console.log("Email:", email);
    console.log("Password:", plainPassword);
    console.log("ID:", admin._id.toString());

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exit(1);
  }
}

createAdmin();