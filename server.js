/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const sharedsession = require("express-socket.io-session");
const { google } = require("googleapis");

const multer = require("multer");
const upload = multer({dest:"/api/drive-upload"});

const app = express();
const server = createServer(app);
const io = new Server(server);

/*--Setup Google Services----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const sessionMiddleware = session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false} // Set to true in production with HTTPS
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
io.use(sharedsession(sessionMiddleware, {autoSave:true}));

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/auth/google/callback" || "http://localhost:"+process.env.PORT+"/auth/google/callback",
    scope:[
        "profile", "email", "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify"
    ],
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

app.get("/auth/google/callback", passport.authenticate("google", {failureRedirect:"/login"}), (req, res) => res.redirect("/"));
app.get("/auth/google", passport.authenticate("google", {
    scope:[
        "profile", "email", "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify"
    ],
    prompt:"consent"
}));

/*--Google Mail API----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/emails", async (req, res)=>{
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

        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.list({userId:"me", maxResults:20, q:"in:inbox"});
        const messages = await Promise.all(
            response.data.messages.map(async (message)=>{
                const msg = await gmail.users.messages.get({
                    userId:"me",
                    id:message.id,
                    format:"metadata",
                    metadataHeaders:['From', 'Subject', 'Date'],
                    fields:"payload(headers),snippet,labelIds"
                });

                const labels = msg.data.labelIds || [];
                return {
                    id:message.id,
                    from:msg.data.payload.headers.find(h => h.name === "From").value,
                    subject:msg.data.payload.headers.find(h => h.name === "Subject").value,
                    date:msg.data.payload.headers.find(h => h.name === "Date").value,
                    snippet:msg.data.snippet,
                    isStarred:labels.includes("STARRED"),
                    isImportant:labels.includes("IMPORTANT")
                };
            })
          );
        res.json(messages);
    }
    catch(error){
        console.error("Gmail error:", error);
        res.status(500).json({error:"Failed to fetch emails"});
    }
});
app.post("/api/emails/:id/star", async (req, res)=>{
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

        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const {id} = req.params;
        const {markAsStarred} = req.body;

        const response = await gmail.users.messages.modify({
            userId:"me", id:id,
            requestBody:{[markAsStarred ? "addLabelIds" : "removeLabelIds"]: ["STARRED"]}
        });
        res.json({success:true, newLabels:response.data.labelIds});
    }
    catch(error){
        console.error("Error:", error);
        res.status(500).json({success:false});
    }
});
app.post("/api/emails/:id/importance", async (req, res)=>{
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

        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const {id} = req.params;
        const {markAsImportant} = req.body;

        const response = await gmail.users.messages.modify({
            userId:"me", id:id,
            requestBody:{[markAsImportant ? "addLabelIds" : "removeLabelIds"]: ["IMPORTANT"]}
        });
        res.json({success:true, newLabels:response.data.labelIds});
    }
    catch(error){
        console.error("Error:", error);
        res.status(500).json({success:false});
    }
});

/*--Google Drive API---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/drive-list", async (req, res)=>{
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

        const drive = google.drive({version:"v3", auth:oauth2Client});
        const response = await drive.files.list({fields:"files(id, name, mimeType, size, modifiedTime, thumbnailLink)"});
        res.json(response.data.files);
    }
    catch(error){
        console.error("Drive API Error:", error);
        res.status(500).json({error:"Failed to fetch drive data"});
    }
})
app.get("/api/drive-download/:fileId", async (req, res)=>{
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

        const {fileId} = req.params;
        const {format} = req.query;
        const drive = google.drive({version:"v3", auth:oauth2Client});

        const exportTypes = {
            pdf:"application/pdf",
            docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        };

        const metadata = await drive.files.get({fileId, fields:"name, mimeType"});
        const {name, mimeType} = metadata.data;

        let response;
        if(mimeType === "application/vnd.google-apps.document"){
            const exportMime = exportTypes[format] || "application/pdf";
            const extension = format || "pdf";
      
            res.setHeader("Content-Disposition", `attachment; filename="${name}.${extension}"`);
            res.setHeader("Content-Type", exportMime);
            response = await drive.files.export({fileId,mimeType:exportMime}, {responseType:"stream"});
        }
        else if(mimeType === "application/pdf"){
            res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
            res.setHeader("Content-Type", "application/pdf");
            response = await drive.files.get({fileId, alt:"media"}, {responseType:"stream"});
        }
        else{
            res.setHeader("Content-Disposition", `attachment; filename="${metadata.data.name}"`);
            res.setHeader("Content-Type", metadata.data.mimeType);
            response = await drive.files.get({fileId, alt:"media"}, {responseType:"stream"});
        }
        response.data.on("error", (error)=>{
            console.error("Error streaming file:", error);
            res.status(500).send("Error downloading file");
        }).pipe(res);
    }
    catch(error){
        console.error("Drive API Error:", error);
        res.status(500).json({error:"Failed to download drive data"});
    }
});
app.get("/api/drive-file-content/:fileId", async (req, res)=>{
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

        const fileId = req.params.fileId;
        const drive = google.drive({version:"v3", auth:oauth2Client});
        const metadata = await drive.files.get({fileId, fields:"mimeType"});
        const mimeType = metadata.data.mimeType;

        if(mimeType === "application/vnd.google-apps.document"){
            const response = await drive.files.export({fileId,mimeType:"text/html"}, {responseType:"stream"});
            res.setHeader("Content-Type", "text/html");
            response.data.pipe(res);
        }
        else if(mimeType === "application/pdf"){
            const response = await drive.files.get({fileId, alt:"media"}, {responseType:"stream"});
            res.setHeader("Content-Type", "application/pdf");
            response.data.pipe(res);
        }
        else if(mimeType.startsWith("image/")){
            const response = await drive.files.get({fileId, alt:"media"}, {responseType:"stream"});
            res.setHeader("Content-Type", mimeType);
            response.data.pipe(res);
        
        }
        else if(mimeType.startsWith("video/")){
            const response = await drive.files.get({fileId, alt:"media"}, {responseType:"stream"});
            res.setHeader("Content-Type", mimeType);
            response.data.pipe(res);
        }
        else{
            res.status(400).send("Unsupported file type");
        }
    }
    catch(error){
        console.error("Drive API Error:", error);
        res.status(500).json({error:"Failed to fetch file content"});
    }
});
app.post("/api/drive-upload", upload.single("file"), async (req, res)=>{
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

        const drive = google.drive({version:"v3", auth:oauth2Client});
        const fileMetadata = {name:req.file.originalname};
        const media = {mimeType:req.file.mimetype, body:fs.createReadStream(req.file.path)};
        const response = await drive.files.create({resource:fileMetadata, media:media, fields:"id, name"});
        fs.unlinkSync(req.file.path);
        res.status(200).json({success:true, file:response.data});
    }
    catch(error){
        console.error("Upload error:", error);
        res.status(500).json({success:false});
    }
});
app.delete("/api/drive-delete/:fileId", async (req, res)=>{
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
        const fileId = req.params.fileId;
        const drive = google.drive({version:"v3", auth:oauth2Client});
        await drive.files.delete({fileId: fileId});
        res.status(200).json({success:true, message:"File deleted"});
    }
    catch(error){
        console.error("Delete error:", error);
        res.status(500).json({success:false, message:"Failed to delete file"});
    }
});

/*--Google Calendar API------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
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

        const events = response.data.items.map(event => ({
            id:event.id,
            title:event.summary,
            start:event.start.dateTime || event.start.date,
            end:event.end.dateTime || event.end.date,
            color:event.colorId ? `#${getColorHex(event.colorId)}` : "#1a73e8"
        }));

        res.json(events);
    }
    catch(error){
        client.emit("google-calendar-error", error);
        console.error("Calendar API Error:", error);
        res.status(500).json({error:"Failed to fetch calendar events"});
    }
});
function getColorHex(colorId) {
    const colors = {
        "1":"a4bdfc", // Lavender
        "2":"7ae7bf", // Sage
        "3":"dbadff", // Grape
        "4":"ff887c", // Flamingo
    };
    return colors[colorId] || "1a73e8"; // Default blue
}

/*--Start Server-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
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