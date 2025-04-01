/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server);

/*--Start Server-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.use(express.static(__dirname));
app.get("/",(req, res)=>{res.sendFile(__dirname+"/pages/index.html")});
server.listen(process.env.PORT,()=>{console.log("Running at port "+process.env.PORT)});

/*--Input/Output-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
io.on("connection",(client)=>{
    
});