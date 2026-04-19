import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images as static files
app.use("/uploads", express.static("uploads"));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ------------------------------------------------------
// MongoDB Connection
// ------------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // now stored as plain text
  address: String,
});
const User = mongoose.model("User", userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  image: String,
  size: String, // S, M, L, etc.
  color: String,
  storeName: String,
  reviews: [
    {
      userEmail: String,
      userName: String,
      rating: Number,
      comment: String,
      date: { type: Date, default: Date.now },
    }
  ],
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  stock: { type: Number, default: 10 },
});
const Product = mongoose.model("Product", productSchema);

// Merchant Schema
const merchantSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  storeName: { type: String, required: true },
  products: [{
    name: String,
    price: Number,
    size: String,
    color: String,
    image: String,
    createdAt: { type: Date, default: Date.now }
  }],
  orders: [{
    orderId: String,
    customerName: String,
    customerEmail: String,
    items: Array,
    totalAmount: Number,
    status: { type: String, default: 'Pending' },
    orderDate: { type: Date, default: Date.now }
  }],
  earnings: { type: Number, default: 0 },
  reviews: [{
    customerName: String,
    productName: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
});
const Merchant = mongoose.model("Merchant", merchantSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});
const Admin = mongoose.model("Admin", adminSchema);

// Merchant2 Schema (Simplified)
const merchant2Schema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  storeName: { type: String, required: true },
  products: [{
    name: String,
    price: Number,
    image: String,
    createdAt: { type: Date, default: Date.now }
  }],
  orders: [{
    orderId: String,
    customerName: String,
    customerEmail: String,
    items: Array,
    totalAmount: Number,
    status: { type: String, default: 'Pending' },
    orderDate: { type: Date, default: Date.now }
  }],
  earnings: { type: Number, default: 0 },
  reviews: [{
    customerName: String,
    productName: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
});
const Merchant2 = mongoose.model("Merchant2", merchant2Schema);

// Bookings Schema (to store user purchases)
const bookingsSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  userName: String,
  items: [
    {
      name: String,
      category: String,
      price: Number,
      image: String,
      quantity: { type: Number, default: 1 },
      storeName: String,
      stock: Number,
    },
  ],
  address: {
    name: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    isActive: Boolean,
  },
  totalPrice: Number,
  paymentMethod: String,
  orderDate: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" }, // Pending, Shipped, Delivered, Canceled
});
const Bookings = mongoose.model("Bookings", bookingsSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  items: [
    {
      name: String,
      category: String,
      price: Number,
      image: String,
      quantity: { type: Number, default: 1 },
      storeName: String,
      stock: Number,
    },
  ],
});
const Cart = mongoose.model("Cart", cartSchema);

// Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  items: [
    {
      name: String,
      category: String,
      price: Number,
      image: String,
      storeName: String,
      stock: Number,
    },
  ],
});
const Wishlist = mongoose.model("Wishlist", wishlistSchema);

// ------------------------------------------------------
// Insert default admin and merchant if not exists
// ------------------------------------------------------
(async () => {
  try {
    // Default Admin
    const existingAdmin = await Admin.findOne({ username: "admin" });
    if (!existingAdmin) {
      const defaultAdmin = new Admin({
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
      });
      await defaultAdmin.save();
      console.log("Default admin created: admin/admin123");
    }

    // Default Merchant2
    const existingMerchant2 = await Merchant2.findOne({ username: "merchant2" });
    if (!existingMerchant2) {
      const defaultMerchant2 = new Merchant2({
        username: "merchant2",
        password: "merchant123",
        storeName: "Fashion Hub",
        products: [],
        orders: [],
        earnings: 0,
        reviews: []
      });
      await defaultMerchant2.save();
      console.log("Default merchant2 created: merchant2/merchant123");
    }

    // Initialize Stock for all products to 10
    await Product.updateMany({ stock: { $exists: false } }, { $set: { stock: 10 } });
    console.log("Stock initialized for all products.");

    // Sample Products with new categories
    const existingProducts = await Product.find();
    if (existingProducts.length === 0) {
      const sampleProducts = [
        // Men's sub-categories
        { name: "Men's Casual Shirt", category: "shirt", price: 1299, image: "/uploads/mens-shirt.jpg", size: "M", color: "Blue" },
        { name: "Men's Formal Shirt", category: "shirt", price: 1599, image: "/uploads/mens-formal-shirt.jpg", size: "L", color: "White" },
        { name: "Men's Denim Jeans", category: "pant", price: 1899, image: "/uploads/mens-jeans.jpg", size: "32", color: "Blue" },
        { name: "Men's Chinos", category: "pant", price: 1499, image: "/uploads/mens-chinos.jpg", size: "34", color: "Beige" },
        { name: "Men's Cotton T-Shirt", category: "t-shirt", price: 599, image: "/uploads/mens-tshirt.jpg", size: "M", color: "Black" },
        { name: "Men's Polo T-Shirt", category: "t-shirt", price: 799, image: "/uploads/mens-polo.jpg", size: "L", color: "Navy" },

        // Women's sub-categories
        { name: "Embroidered Kurti", category: "kurtis", price: 1299, image: "/uploads/women-kurti.jpg", size: "M", color: "Maroon" },
        { name: "Designer Kurti", category: "kurtis", price: 1899, image: "/uploads/women-designer-kurti.jpg", size: "L", color: "Blue" },
        { name: "Banarasi Silk Saree", category: "sarees", price: 3499, image: "/uploads/women-saree.jpg", size: "One Size", color: "Red" },
        { name: "Chiffon Saree", category: "sarees", price: 2499, image: "/uploads/women-chiffon-saree.jpg", size: "One Size", color: "Green" },
        { name: "Western Maxi Dress", category: "western-dress", price: 1999, image: "/uploads/women-maxi-dress.jpg", size: "S", color: "Black" },
        { name: "Casual Western Dress", category: "western-dress", price: 1599, image: "/uploads/women-casual-dress.jpg", size: "M", color: "Pink" },

        // Existing categories
        { name: "Classic White T-Shirt", category: "tshirt", price: 599, image: "/uploads/tshirt-white.jpg", size: "M", color: "White" },
        { name: "Blue Denim Jeans", category: "pant", price: 1499, image: "/uploads/jeans-blue.jpg", size: "L", color: "Blue" },
        { name: "Black Leather Watch", category: "watch", price: 2999, image: "/uploads/watch-black.jpg", size: "One Size", color: "Black" },
        { name: "Running Shoes", category: "shoes", price: 1999, image: "/uploads/shoes-running.jpg", size: "9", color: "White" }
      ];

      await Product.insertMany(sampleProducts);
      console.log("Sample products created with Men and Women categories");
    }
  } catch (error) {
    console.error("Error creating default users:", error);
  }
})();


// ------------------------------------------------------
// USER REGISTER (Plain Text Password)
// ------------------------------------------------------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // store plain text password
    const newUser = new User({ name, email, password, address });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error(" Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// USER EMAIL CHECK
// ------------------------------------------------------
app.get("/api/users/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    console.error("User check email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN EMAIL CHECK
// ------------------------------------------------------
app.get("/api/admin/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email });
    res.json({ exists: !!admin });
  } catch (error) {
    console.error("Admin check email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// USER LOGIN (Plain Text Password Check)
// ------------------------------------------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // plain text comparison
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error(" Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN LOGIN (from MongoDB)
// ------------------------------------------------------
app.post("/api/admin/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/Username and password required" });
    }

    const admin = await Admin.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Plain text comparison
    if (password !== admin.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Admin login successful",
      admin: { username: admin.username, email: admin.email, role: "admin" },
    });
  } catch (error) {
    console.error(" Admin Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN: ADD PRODUCT
// ------------------------------------------------------
app.post("/api/admin/add-product", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !category || !price || !imagePath) {
      return res.status(400).json({ message: "All fields required" });
    }

    const newProduct = new Product({ 
      name, 
      category, 
      price: Number(price), 
      image: imagePath,
      stock: Number(stock) || 10 
    });
    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.error(" Add Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN MANAGEMENT: CREATE NEW ADMIN
// ------------------------------------------------------
app.post("/api/admin/add-admin", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
    });

    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this username/email already exists" });
    }

    const newAdmin = new Admin({ username, email, password });
    await newAdmin.save();

    res.status(201).json({
      message: "Admin added successfully!",
      admin: { username: newAdmin.username, email: newAdmin.email },
    });
  } catch (error) {
    console.error(" Add Admin Error:", error);
    res.status(500).json({ message: `Server error ${error}` });
  }
});

// ------------------------------------------------------
// ADMIN MANAGEMENT: GET ALL ADMINS
// ------------------------------------------------------
app.get("/api/admin/get-admins", async (req, res) => {
  try {
    const admins = await Admin.find({}, { password: 0 }); // Exclude password from response
    res.json(admins);
  } catch (error) {
    console.error(" Get Admins Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN: GET ANALYTICS DASHBOARD DATA
// ------------------------------------------------------
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Bookings.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Aggregating Revenue & Canceled Orders
    const allBookings = await Bookings.find();
    let totalRevenue = 0;
    let canceledOrdersCount = 0;

    // Sum up stock from all products
    const allProducts = await Product.find();
    const totalStock = allProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

    // Monthly/Daily sales map (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const salesDataMap = {};
    last7Days.forEach(date => salesDataMap[date] = 0);

    let statusCount = { Pending: 0, Delivered: 0, Canceled: 0 };

    allBookings.forEach((booking) => {
      const status = booking.status || "Pending";
      if (status === "Canceled" || status === "Cancelled") {
        canceledOrdersCount++;
        statusCount.Canceled = (statusCount.Canceled || 0) + 1;
      } else {
        totalRevenue += booking.totalPrice || 0;
        if (status === "Pending") statusCount.Pending++;
        if (status === "Delivered") statusCount.Delivered++;

        // Add to sales Data for line chart
        if (booking.orderDate) {
          const dateStr = new Date(booking.orderDate).toISOString().split('T')[0];
          if (salesDataMap[dateStr] !== undefined) {
            salesDataMap[dateStr] += booking.totalPrice || 0;
          }
        }
      }
    });

    const salesData = Object.keys(salesDataMap).map(date => ({
      date: date.substring(5), // MD format (MM-DD)
      revenue: salesDataMap[date]
    }));

    const orderStatusData = [
      { name: "Pending", value: statusCount.Pending },
      { name: "Delivered", value: statusCount.Delivered },
      { name: "Canceled", value: statusCount.Canceled },
    ];

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue,
      totalStock,
      canceledOrders: canceledOrdersCount,
      salesData,
      orderStatusData
    });
  } catch (error) {
    console.error(" Analytics Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN: GET REPORTS (Weekly/Monthly)
// ------------------------------------------------------
app.get("/api/admin/reports", async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allBookings = await Bookings.find();

    // Fetch existing product names to filter out deleted ones
    const products = await Product.find({}, "name");
    const existingNames = new Set(products.map(p => p.name));

    const fetchReport = (startDate) => {
      const summary = {};
      allBookings.forEach((booking) => {
        const orderDate = new Date(booking.orderDate);
        const status = booking.status || "Pending";
        
        if (orderDate >= startDate && status !== "Canceled" && status !== "Cancelled") {
          booking.items.forEach((item) => {
            // Check if product still exists in catalog
            if (existingNames.has(item.name)) {
              const compositeKey = `${booking.userEmail}_${item.name}`;
              if (!summary[compositeKey]) {
                summary[compositeKey] = {
                  userName: booking.userName || booking.userEmail,
                  name: item.name,
                  image: item.image,
                  quantity: 0,
                  revenue: 0,
                  orderDate: booking.orderDate
                };
              }
              summary[compositeKey].quantity += item.quantity || 1;
              summary[compositeKey].revenue += (item.price * (item.quantity || 1));
              
              // Keep the most recent order date
              if (new Date(booking.orderDate) > new Date(summary[compositeKey].orderDate)) {
                summary[compositeKey].orderDate = booking.orderDate;
              }
            }
          });
        }
      });
      // Sort by newest order date
      return Object.values(summary).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    };

    const weeklyReport = fetchReport(last7Days);
    const monthlyReport = fetchReport(last30Days);

    res.json({
      weekly: weeklyReport,
      monthly: monthlyReport,
    });
  } catch (error) {
    console.error(" Reports Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN MANAGEMENT: DELETE ADMIN
// ------------------------------------------------------
app.delete("/api/admin/delete-admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin deleted successfully!" });
  } catch (error) {
    console.error(" Delete Admin Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN: DELETE PRODUCT + Image File
// ------------------------------------------------------
app.delete("/api/admin/delete-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image && fs.existsSync("." + product.image)) {
      fs.unlinkSync("." + product.image);
    }

    res.json({ message: "Product deleted successfully!" });
  } catch (error) {
    console.error(" Delete Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADMIN: UPDATE PRODUCT (name, category, price)
// ------------------------------------------------------
app.put("/api/admin/update-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ message: "All fields required" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, category, price: Number(price), stock: Number(stock) || 0 },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(" Update Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// GET ALL PRODUCTS
// ------------------------------------------------------
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error(" Fetch Products Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// GET SINGLE PRODUCT DETAILS
// ------------------------------------------------------
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error(" Fetch Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// ADD PRODUCT REVIEW
// ------------------------------------------------------
app.post("/api/products/:id/reviews", async (req, res) => {
  try {
    const { userEmail, userName, rating, comment } = req.body;
    let nameToUse = userName || "Anonymous";

    if (!userEmail || !rating) {
      return res.status(400).json({ message: "User email and rating are required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.userEmail === userEmail
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed" });
    }

    const review = {
      userEmail,
      userName: nameToUse,
      rating: Number(rating),
      comment: comment || "",
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.averageRating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added!", product });
  } catch (error) {
    console.error(" Review Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: SAVE BOOKING (on checkout)
// ------------------------------------------------------
app.post("/api/bookings/save", async (req, res) => {
  try {
    const { userEmail, userName, items, address } = req.body;

    console.log("Received booking request:", { userEmail, userName, itemsCount: items?.length, address: address?.name });

    if (!userEmail || !items || items.length === 0) {
      return res.status(400).json({ message: "User email and items are required" });
    }

    // Clean items data (remove _id if it exists from products)
    const cleanedItems = items.map(item => ({
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image,
      quantity: item.quantity || 1,
      storeName: item.storeName || "",
      stock: item.stock || 0,
    }));

    const totalPrice = cleanedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    // Decrement stock for each item
    for (const item of cleanedItems) {
      await Product.findOneAndUpdate(
        { name: item.name },
        { $inc: { stock: -(item.quantity || 1) } }
      );
    }

    const newBooking = new Bookings({
      userEmail,
      userName,
      items: cleanedItems,
      address,
      totalPrice,
      paymentMethod: req.body.paymentMethod || "COD",
      orderDate: req.body.orderDate || new Date(),
    });

    const savedBooking = await newBooking.save();

    console.log("Booking saved successfully:", savedBooking._id);

    res.status(201).json({
      message: "Booking saved successfully!",
      booking: savedBooking,
    });
  } catch (error) {
    console.error(" Save Booking Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ------------------------------------------------------
// BOOKINGS: GET ALL BOOKINGS (Admin)
// ------------------------------------------------------
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await Bookings.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Fetch All Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: GET ALL BOOKINGS FOR A USER (by email)
// ------------------------------------------------------
app.get("/api/bookings/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const bookings = await Bookings.find({ userEmail }).sort({ orderDate: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(" Fetch Bookings Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: DELETE A BOOKING
// ------------------------------------------------------
app.delete("/api/bookings/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Bookings.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully!" });
  } catch (error) {
    console.error(" Delete Booking Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: UPDATE BOOKING STATUS
// ------------------------------------------------------
app.patch("/api/bookings/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["pending", "shipped", "delivered"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid status. Valid statuses are: pending, shipped, delivered"
      });
    }

    const booking = await Bookings.findByIdAndUpdate(
      id,
      { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({
      message: "Booking status updated successfully!",
      booking
    });
  } catch (error) {
    console.error(" Update Booking Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: UPDATE BOOKING (by user - Shipping Info)
// ------------------------------------------------------
app.put("/api/bookings/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    const booking = await Bookings.findById(id);
    if (!booking) return res.status(404).json({ message: "Order not found" });

    // 24 Hour Check
    const orderTime = new Date(booking.orderDate).getTime();
    const currentTime = new Date().getTime();
    const hoursElapsed = (currentTime - orderTime) / (1000 * 60 * 60);

    if (hoursElapsed > 24) {
      return res.status(400).json({ message: "Order cannot be edited after 24 hours (already Shipped)" });
    }

    if (booking.status !== "Pending") {
      return res.status(400).json({ message: `Order with status '${booking.status}' cannot be edited` });
    }

    booking.address = address;
    await booking.save();

    res.json({ message: "Order updated successfully", booking });
  } catch (error) {
    console.error("Update Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// BOOKINGS: CANCEL BOOKING (by user)
// ------------------------------------------------------
app.put("/api/bookings/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 24 Hour Check
    const orderTime = new Date(booking.orderDate).getTime();
    const currentTime = new Date().getTime();
    const hoursElapsed = (currentTime - orderTime) / (1000 * 60 * 60);

    if (hoursElapsed > 24) {
      return res.status(400).json({ message: "Order cannot be canceled after 24 hours (already Shipped)" });
    }

    if (booking.status === "Canceled" || booking.status === "Cancelled" || booking.status === "Delivered") {
      return res.status(400).json({ message: `Order with status '${booking.status}' cannot be canceled` });
    }

    // Restore stock
    for (const item of booking.items) {
      await Product.findOneAndUpdate(
        { name: item.name },
        { $inc: { stock: (item.quantity || 1) } }
      );
    }

    booking.status = "Canceled";
    await booking.save();

    res.json({ message: "Order canceled successfully. Refund will be processed." });
  } catch (error) {
    console.error(" Cancel Booking Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// CART: SYNC CART
// ------------------------------------------------------
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { userEmail, items } = req.body;
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    let cart = await Cart.findOne({ userEmail });
    if (cart) {
      cart.items = items;
      await cart.save();
    } else {
      cart = new Cart({ userEmail, items });
      await cart.save();
    }

    res.json({ message: "Cart synced successfully", cart });
  } catch (error) {
    console.error(" Sync Cart Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// CART: GET CART
// ------------------------------------------------------
app.get("/api/cart/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const cart = await Cart.findOne({ userEmail });
    res.json(cart ? cart.items : []);
  } catch (error) {
    console.error(" Fetch Cart Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// WISHLIST: ADD ITEM
// ------------------------------------------------------
app.post("/api/wishlist/add", async (req, res) => {
  try {
    const { userEmail, item } = req.body;
    if (!userEmail || !item) {
      return res.status(400).json({ message: "User email and item are required" });
    }

    let wishlist = await Wishlist.findOne({ userEmail });
    if (!wishlist) {
      wishlist = new Wishlist({ userEmail, items: [item] });
      await wishlist.save();
    } else {
      // Check if item already exists
      const exists = wishlist.items.some((wItem) => wItem.name === item.name);
      if (!exists) {
        wishlist.items.push(item);
        await wishlist.save();
      }
    }

    res.json({ message: "Item added to wishlist", wishlist: wishlist.items });
  } catch (error) {
    console.error(" Add Wishlist Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// WISHLIST: REMOVE ITEM
// ------------------------------------------------------
app.delete("/api/wishlist/remove", async (req, res) => {
  try {
    const { userEmail, itemName } = req.body;
    if (!userEmail || !itemName) {
      return res.status(400).json({ message: "User email and itemName are required" });
    }

    const wishlist = await Wishlist.findOne({ userEmail });
    if (wishlist) {
      wishlist.items = wishlist.items.filter((item) => item.name !== itemName);
      await wishlist.save();
      res.json({ message: "Item removed from wishlist", wishlist: wishlist.items });
    } else {
      res.status(404).json({ message: "Wishlist not found" });
    }
  } catch (error) {
    console.error(" Remove Wishlist Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// WISHLIST: GET WISHLIST
// ------------------------------------------------------
app.get("/api/wishlist/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const wishlist = await Wishlist.findOne({ userEmail });
    res.json(wishlist ? wishlist.items : []);
  } catch (error) {
    console.error(" Fetch Wishlist Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT SIGNUP
// ------------------------------------------------------
app.post("/api/merchant/signup", async (req, res) => {
  try {
    const { username, password, storeName } = req.body;

    if (!username || !password || !storeName) {
      return res.status(400).json({ message: "Username, password, and store name are required" });
    }

    const existingMerchant = await Merchant.findOne({ username });
    if (existingMerchant) {
      return res.status(400).json({ message: "Merchant username already exists" });
    }

    const newMerchant = new Merchant({ username, password, storeName });
    await newMerchant.save();

    res.status(201).json({ message: "Merchant registered successfully" });
  } catch (error) {
    console.error(" Merchant Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT LOGIN
// ------------------------------------------------------
app.post("/api/merchant/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const merchant = await Merchant.findOne({ username });
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    // Plain text comparison
    if (password !== merchant.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Merchant login successful",
      merchant: { username: merchant.username, storeName: merchant.storeName },
    });
  } catch (error) {
    console.error(" Merchant Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: ADD PRODUCT
// ------------------------------------------------------
app.post("/api/merchant/add-product", upload.single("image"), async (req, res) => {
  try {
    const { name, price, size, color } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !price || !size || !color || !imagePath) {
      return res.status(400).json({ message: "All fields required" });
    }

    const newProduct = new Product({
      name,
      category: "Clothing", // Default category for merchant products
      price: Number(price),
      image: imagePath,
      size,
      color
    });
    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.error(" Add Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: GET MY PRODUCTS
// ------------------------------------------------------
app.get("/api/merchant/products", async (req, res) => {
  try {
    // For simplicity, return all products (in a real app, you'd filter by merchant)
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error(" Fetch Products Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: UPDATE PRODUCT
// ------------------------------------------------------
app.put("/api/merchant/update-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, size, color } = req.body;

    if (!name || !price || !size || !color) {
      return res.status(400).json({ message: "All fields required" });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { name, price: Number(price), size, color },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully!",
      product: product,
    });
  } catch (error) {
    console.error(" Update Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: DELETE PRODUCT
// ------------------------------------------------------
app.delete("/api/merchant/delete-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image && fs.existsSync("." + product.image)) {
      fs.unlinkSync("." + product.image);
    }

    res.json({ message: "Product deleted successfully!" });
  } catch (error) {
    console.error(" Delete Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: GET ORDERS
// ------------------------------------------------------
app.get("/api/merchant/orders", async (req, res) => {
  try {
    const orders = await Bookings.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    console.error(" Fetch Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: UPDATE ORDER STATUS
// ------------------------------------------------------
app.put("/api/merchant/update-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Bookings.findByIdAndUpdate(
      id,
      { status: status || "Delivered" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order status updated successfully!",
      order: order,
    });
  } catch (error) {
    console.error(" Update Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT: GET EARNINGS
// ------------------------------------------------------
app.get("/api/merchant/earnings", async (req, res) => {
  try {
    const orders = await Bookings.find({ status: "Delivered" });
    const totalEarnings = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    res.json({ totalEarnings });
  } catch (error) {
    console.error(" Fetch Earnings Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// ------------------------------------------------------
// MERCHANT2 SIGNUP
// ------------------------------------------------------
app.post("/api/merchant2/signup", async (req, res) => {
  try {
    const { username, password, storeName } = req.body;

    if (!username || !password || !storeName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingMerchant = await Merchant2.findOne({ username });
    if (existingMerchant) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const newMerchant = new Merchant2({
      username,
      password,
      storeName,
      products: [],
      orders: [],
      earnings: 0,
      reviews: []
    });
    await newMerchant.save();

    res.status(201).json({ message: "Merchant account created successfully" });
  } catch (error) {
    console.error(" Merchant2 Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2 LOGIN
// ------------------------------------------------------
app.post("/api/merchant2/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const merchant = await Merchant2.findOne({ username });
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    if (password !== merchant.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      merchant: {
        id: merchant._id,
        username: merchant.username,
        storeName: merchant.storeName
      }
    });
  } catch (error) {
    console.error(" Merchant2 Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: GET DASHBOARD DATA
// ------------------------------------------------------
app.get("/api/merchant2/dashboard/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    const merchant = await Merchant2.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const merchantProducts = await Product.find({ storeName: merchant.storeName });
    let allReviews = [];
    merchantProducts.forEach(product => {
        product.reviews.forEach(review => {
            allReviews.push({
                ...review.toObject(),
                productName: product.name,
                productImage: product.image,
                customerName: review.userName || "Anonymous"
            });
        });
    });
    
    const allBookings = await Bookings.find({ "items.storeName": merchant.storeName }).sort({ orderDate: -1 });
    let merchantOrders = [];
    let earnings = 0;
    let pendingOrdersCount = 0;

    allBookings.forEach(booking => {
        const merchantItems = booking.items.filter(item => item.storeName === merchant.storeName);
        if (merchantItems.length > 0) {
            const orderTotal = merchantItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            
            if (booking.status === 'Delivered') {
                earnings += orderTotal;
            }
            if (booking.status === 'Pending') {
                pendingOrdersCount++;
            }

            merchantOrders.push({
                _id: booking._id,
                orderId: booking._id.toString(),
                customerName: booking.userName,
                customerEmail: booking.userEmail,
                items: merchantItems,
                totalAmount: orderTotal,
                status: booking.status,
                orderDate: booking.orderDate
            });
        }
    });

    res.json({
      products: merchantProducts,
      orders: merchantOrders,
      earnings: earnings,
      reviews: allReviews.sort((a,b) => new Date(b.date) - new Date(a.date)),
      totalProducts: merchantProducts.length,
      totalOrders: merchantOrders.length,
      pendingOrders: pendingOrdersCount
    });
  } catch (error) {
    console.error(" Get Dashboard Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: ADD PRODUCT
// ------------------------------------------------------
app.post("/api/merchant2/add-product", upload.single("image"), async (req, res) => {
  try {
    const { merchantId, name, price, stock, category } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!merchantId || !name || !price) {
      return res.status(400).json({ message: "All fields required" });
    }

    const merchant = await Merchant2.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    // 1. Create product in global Product collection
    const globalProduct = new Product({
      name,
      category: category || "Clothing",
      price: Number(price),
      image: imagePath,
      storeName: merchant.storeName,
      stock: Number(stock) || 10
    });
    await globalProduct.save();

    res.status(201).json({
      message: "Product added successfully!",
      product: globalProduct
    });
  } catch (error) {
    console.error(" Add Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: UPDATE ORDER STATUS
// ------------------------------------------------------
app.put("/api/merchant2/update-order/:merchantId/:orderId", async (req, res) => {
  try {
    const { merchantId, orderId } = req.params;
    const { status } = req.body;

    const order = await Bookings.findByIdAndUpdate(
      orderId,
      { status: status || "Delivered" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated successfully!", order });
  } catch (error) {
    console.error(" Update Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: DELETE PRODUCT
// ------------------------------------------------------
app.delete("/api/merchant2/delete-product/:merchantId/:productId", async (req, res) => {
  try {
    const { merchantId, productId } = req.params;

    const merchant = await Merchant2.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const globalProduct = await Product.findByIdAndDelete(productId);
    
    // Remove image file if exists
    if (globalProduct && globalProduct.image && fs.existsSync("." + globalProduct.image)) {
      fs.unlinkSync("." + globalProduct.image);
    }
    
    // Attempt local pull just in case it had old data
    const localProduct = merchant.products.id(productId);
    if (localProduct) {
        merchant.products.pull(productId);
        await merchant.save();
    }

    if (!globalProduct && !localProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully!" });
  } catch (error) {
    console.error(" Delete Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: UPDATE PRODUCT
// ------------------------------------------------------
app.put("/api/merchant2/update-product/:merchantId/:productId", upload.single("image"), async (req, res) => {
  try {
    const { merchantId, productId } = req.params;
    const { name, price, stock, category } = req.body;
    let updateFields = {
      name,
      price: Number(price),
      stock: Number(stock),
      category
    };

    if (req.file) {
      updateFields.image = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateFields,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated successfully!", product: updatedProduct });
  } catch (error) {
    console.error(" Update Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------
// MERCHANT2: ADD SAMPLE DATA (for demo)
// ------------------------------------------------------
app.post("/api/merchant2/add-sample-data/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    const merchant = await Merchant2.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    // Add sample orders
    const sampleOrders = [
      {
        orderId: "ORD001",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        items: [{ name: "T-Shirt", price: 500, quantity: 2 }],
        totalAmount: 1000,
        status: "Pending",
        orderDate: new Date()
      },
      {
        orderId: "ORD002",
        customerName: "Jane Smith",
        customerEmail: "jane@example.com",
        items: [{ name: "Jeans", price: 1500, quantity: 1 }],
        totalAmount: 1500,
        status: "Delivered",
        orderDate: new Date(Date.now() - 86400000) // 1 day ago
      }
    ];

    // Add sample reviews
    const sampleReviews = [
      {
        customerName: "Alice Brown",
        productName: "T-Shirt",
        rating: 5,
        comment: "Great quality and fast delivery!",
        date: new Date()
      },
      {
        customerName: "Bob Wilson",
        productName: "Jeans",
        rating: 4,
        comment: "Good fit and comfortable material.",
        date: new Date(Date.now() - 86400000)
      }
    ];

    merchant.orders.push(...sampleOrders);
    merchant.reviews.push(...sampleReviews);
    merchant.earnings = 1500; // From delivered order

    await merchant.save();

    res.json({ message: "Sample data added successfully!" });
  } catch (error) {
    console.error(" Add Sample Data Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// ------------------------------------------------------
// START SERVER
// ------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
