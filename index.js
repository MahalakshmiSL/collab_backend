// server/index.js

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();
const Document = require('./models/Document');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // React frontend
    methods: ['GET', 'POST'],
  },
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


// Default content for new documents
const defaultValue = "";

io.on('connection', (socket) => {
  socket.on('get-document', async (documentId) => {
    console.log("get-document requested for:", documentId); // ← Add this
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit('load-document', document.data);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;

  return await Document.create({ _id: id, data: defaultValue });
}

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
