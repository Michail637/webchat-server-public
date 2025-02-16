const messageModel = require("../models/messageModel");
const validationManager = require("../utils/validationManager");

async function messageController(io, socket, userID){

  const createMessage = async (message) => {
    message = JSON.parse(message);
    const userChats = socket.rooms;  // type Set
    const messageValidation = validationManager.messageValidation(message, userChats);
    if(!messageValidation) {
      socket.emit("error", JSON.stringify({error:"Bad request", message:"Forged request"}));
      return;
    }
    message.senderID = userID;
    message.status = "sent";
    message.sendTime = new Date();

    const databaseResult = await messageModel.createMessage(message);
    if(!databaseResult) {
      socket.emit("error", JSON.stringify({ error: "Internal server error", message:"Message was not saved. Try to send again"}));
      return;
    }
    const chatID = message.chatID;
    io.to(chatID).emit("create-message", JSON.stringify(message));
    return;
  }

  const updateMessage = async (message) => {
    message = JSON.parse(message);
    const userChats = socket.rooms;  // type Set
    const messageValidation = validationManager.messageValidation(message,userChats);
    if(!messageValidation) {
      socket.emit("error", JSON.stringify({ error:"Bad request", message:"Forged request"}));
      return;
    }
    const updatedMessage = await messageModel.updateMessage(message);
    if(!updatedMessage) {
      socket.emit("error", JSON.stringify({error: "Internal server error", message:"Message was not updated. Try to send again"}));
      return;
    }
    const chatID = updatedMessage.chatID;
    io.to(chatID).emit("update-message", JSON.stringify(updatedMessage));
    return;
  }

  socket.on("create-message", createMessage);
  socket.on("update-message", updateMessage);
}

module.exports = messageController;