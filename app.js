import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from DevOps Assignment😊",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
