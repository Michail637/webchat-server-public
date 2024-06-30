require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors"); 


const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cookie:true,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
} );

const accountRoute = require("./routes/accountRoute");
const chatsRoute = require("./routes/chatsRoute");

const chatsController = require("./controllers/chatsController");
const messageController = require("./controllers/messageController");

app.use(cors())

app.use( "/", express.static("public") );
app.use(express.json()); // to access URL parameters
app.use(cookieParser({httpOnly:true})); // client side JS can not access cookies

app.use("/account", accountRoute);
app.use("/chats", chatsRoute);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on("connection", async (socket) => {
  const userID = await chatsController.connectToChats(socket); // + authorisation + error handling
  if(!userID) {
    return;
  } 
  await messageController(io, socket, userID);
  return;
});

httpServer.listen(443);