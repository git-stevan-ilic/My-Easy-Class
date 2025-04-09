/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const sharedsession = require("express-socket.io-session");

const app = express();
const server = createServer(app);
const io = new Server(server);

/*--Start Server-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const sessionMiddleware = session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false} // Set to true in production with HTTPS
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
io.use(sharedsession(sessionMiddleware, {autoSave:true}));

passport.use(new GoogleStrategy({
        clientID:process.env.GOOGLE_CLIENT_ID,
        clientSecret:process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:"/auth/google/callback" || "http://localhost:"+process.env.PORT+"/auth/google/callback"
    },(accessToken, refreshToken, profile, done) => {
        //Here you would typically find or create a user in your database
        done(null, profile);
    }
));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/auth/google", passport.authenticate("google", {scope:["profile", "email"]}));
app.get("/auth/google/callback", passport.authenticate("google", {failureRedirect:"/login"}), (req, res) => res.redirect("/"));
app.use(express.static(__dirname));
app.get("/",(req, res)=>{res.sendFile(__dirname+"/pages/index.html")});
server.listen(process.env.PORT,()=>{console.log("Running at port "+process.env.PORT)});

/*--Input/Output-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
io.on("connection",(client)=>{
    if(client.handshake.session.passport?.user){
        client.emit("google-status", client.handshake.session.passport.user);
    }
    client.on("google-log-in", ()=>{
        client.emit("google-redirect", "/auth/google");
    });
    client.on("google-log-out", ()=>{
        delete client.handshake.session.passport;
        client.handshake.session.save();
        client.emit("google-status", null);
    });
});