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
const { google } = require("googleapis");

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
    callbackURL:"/auth/google/callback" || "http://localhost:"+process.env.PORT+"/auth/google/callback",
    scope:["profile", "email", "https://www.googleapis.com/auth/calendar.readonly"],
    accessType:"offline"
},
(accessToken, refreshToken, profile, done) => {
    profile.refreshToken = refreshToken;
    profile.accessToken = accessToken;
    //Here you would typically find or create a user in your database
    return done(null, profile);
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/auth/google", passport.authenticate("google", {
    scope:["profile", "email", "https://www.googleapis.com/auth/calendar.readonly"],
    prompt:"consent"
}));
app.get("/auth/google/callback", passport.authenticate("google", {failureRedirect:"/login"}), (req, res) => res.redirect("/"));
app.get("/api/calendar", async (req, res)=>{
    if(!req.user || !req.user.accessToken) return res.status(401).json({error:"Not authenticated"});
    try{
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.on("tokens", (tokens)=>{
            if(tokens.refresh_token) req.user.refreshToken = tokens.refresh_token;
            req.user.accessToken = tokens.access_token;
        });
        oauth2Client.setCredentials({
            refresh_token:req.user.refreshToken,
            access_token:req.user.accessToken
        });

        const calendar = google.calendar({version:"v3", auth:oauth2Client});
        const response = await calendar.events.list({
          calendarId:"primary",
          timeMin:(new Date()).toISOString(),
          maxResults:10,
          singleEvents:true,
          orderBy:"startTime"
        });
        
        res.json(response.data.items);
    }
    catch{
        console.error("Calendar API Error:", error);
        res.status(500).json({error:"Failed to fetch calendar events"});
    }
});

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