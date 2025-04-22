/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
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
        "profile", "email", "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send"
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
        "profile", "email", "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send"
    ],
    prompt:"consent"
}));













/*--Setup Zoom Services------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*const axios = require("axios");
const jwt = require("jsonwebtoken");
const cors = require("cors");
app.use(cors());

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

function generateZoomToken(){
  return jwt.sign({iss:ZOOM_CLIENT_ID, exp:Math.floor(Date.now() / 1000) + 3600}, ZOOM_CLIENT_SECRET);
}
*/
/*
app.get("/api/zoom/create-meeting", async (req, res) => {
    try{
        console.log(0)
        const token = generateZoomToken();  console.log(1)
        const {data} = await axios.post(
            "https://api.zoom.us/v2/users/me/meetings",{
                topic:"My Meeting",
                type:1,
                settings:{
                host_video:true,
                participant_video:true
            }
        },{
            headers: {
                "Authorization":"Bearer "+ token,
                "Content-Type":"application/json"
            }
        });
        console.log(2)
      
        
        res.json({
            join_url:data.joinURL,
            meetingID:data.id,
            password:data.password
        });
    }
    catch(error){
        console.log("Zoom Error: "+error);
        res.status(500).json({error:error.message});
    }
});
*/
/*
const zoomus = require("zoomus")({
    client_id:process.env.ZOOM_CLIENT_ID,
    client_secret:process.env.ZOOM_CLIENT_SECRET
});

app.get("/auth/zoom", (req, res)=>{
    const zoomAuthURL = "https://zoom.us/oauth/authorize?response_type=code&client_id="+ZOOM_CLIENT_ID+"&redirect_uri="+ZOOM_REDIRECT_URI;
    res.redirect(zoomAuthURL);
});
app.get("/auth/zoom/callback", async (req, res)=>{
    try {
        const {code} = req.query;
        const {data} = await zoomus.auth.getToken(code);
        // Store access_token and refresh_token securely
        res.redirect("/dashboard");
    }
    catch(error){
        console.error("Zoom Auth Failed", error);
        res.status(500).send("Zoom Auth Failed");
    }
});
*/
/*--Zoom API-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*app.post("/api/zoom/create-meeting", async (req, res)=>{
    try{
        const meeting = await zoomus.meeting.create({
            topic:"My Meeting",
            type:1, // Instant meeting
            settings:{
                host_video:true,
                participant_video:true
            }
        });
        res.json({success:true, meeting});
    }
    catch(error){
        console.log("Zoom meeting cretaion error: ", error);
        res.status(500).json({
            success:false,
            error:"Failed to create meeting",
            details:error.message
        });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });
  app.use(express.static('public'));*/





  









/*--Google Mail API----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/emails/:inbox", async (req, res)=>{
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

        const {inbox} = req.params;
        const {pageToken} = req.query;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.list({
            userId:"me", maxResults:50, q:"in:"+inbox,
            pageToken: pageToken || undefined
        });

        const messages = await Promise.all(
            response.data.messages.map(async (message)=>{
                const msg = await gmail.users.messages.get({
                    userId:"me",
                    id:message.id,
                    format:"metadata",
                    metadataHeaders:["From", "To", "Subject", "Date"],
                    fields:"payload(headers),snippet,labelIds"
                });

                const labels = msg.data.labelIds || [];
                const returnFromHeader    = msg.data.payload.headers.find(h => h.name === "From");
                const returnToHeader      = msg.data.payload.headers.find(h => h.name === "To");
                const returnSubjectHeader = msg.data.payload.headers.find(h => h.name === "Subject");
                const returnDateHeader    = msg.data.payload.headers.find(h => h.name === "Date");

                let returnFrom = "N/A", returnTo = "N/A", returnSubject = "No Subject", returnDate = "N/A";
                if(returnFromHeader)    returnFrom    = returnFromHeader.value;
                if(returnToHeader)      returnTo      = returnToHeader.value;
                if(returnSubjectHeader) returnSubject = returnSubjectHeader.value;
                if(returnDateHeader)    returnDate    = returnDateHeader.value;

                return {
                    id:message.id,
                    from:returnFrom,
                    to:returnTo,
                    subject:returnSubject,
                    date:returnDate,
                    snippet:msg.data.snippet,
                    isStarred:labels.includes("STARRED"),
                    isImportant:labels.includes("IMPORTANT"),
                    isUnread:labels.includes("UNREAD")
                };
            })
        );
        res.json({messages:messages, nextPageToken:response.data.nextPageToken || null});
    }
    catch(error){
        console.error("Gmail error:", error);
        res.status(error.status).json({error:"Failed to fetch emails"});
    }
});
app.get("/api/email-content/:id", async (req, res)=>{
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

        const {id} = req.params;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.get({userId:"me", id:id, format:"full"});
        const payload = response.data.payload;
        let body = "";

        function findBody(parts){
            for(const part of parts){
                if(part.parts){
                    const nestedBody = findBody(part.parts);
                    if(nestedBody) return nestedBody;
                }
                if(part.mimeType === "text/html"){
                    return Buffer.from(part.body.data, "base64url").toString("utf8");
                }
                else if(part.mimeType === "text/plain" && !body){
                    body = Buffer.from(part.body.data, "base64url").toString("utf8");
                }
            }
            return body;
        };
        if(payload.parts) body = findBody(payload.parts);
        else if (payload.body?.data) body = Buffer.from(payload.body.data, "base64url").toString("utf8");
        res.json({...response.data, parsedBody: body || "No content found"});
    }
    catch(error){
        console.error("Error fetching email:", error);
        res.status(error.status).json({error:"Failed to fetch email"});
    }
});
app.post("/api/emails/:id/read", async (req, res)=>{
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

        const {id} = req.params;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.modify({userId:"me", id:id, requestBody:{removeLabelIds:["UNREAD"]}});
        res.json({success:true, message:"Email marked as read"});
    }
    catch(error){
        console.error("Error marking email as read:", error);
        res.status(error.status).json({error:"Failed to update email status"});
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
        res.status(error.status).json({success:false});
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
        res.status(error.status).json({success:false});
    }
});
app.post("/api/send-mail", async (req, res)=>{
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

        const {recipients, subject, message} = req.body;
        const encodedHtml = Buffer.from(message).toString("base64");
        const formattedBody = encodedHtml.match(/.{1,76}/g).join('\n');
        const rawEmail = [
            "From:'My Easy Class' <"+req.user.email+">",
            "To:"+recipients,
            "Subject:"+subject,
            "MIME-Version:1.0",
            "Content-Type:text/html; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            "",
            formattedBody
        ].join('\n');

        const encodedEmail = Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.send({userId:"me", requestBody:{raw:encodedEmail}});
        res.json({success:true, message:"Email sent!"});
    }
    catch(error){
        console.error("Error sending email:", error);
        res.status(error.status).json({error:"Failed to send email"});
    }
});
app.delete("/api/emails/:id", async (req, res)=>{
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

        const {id} = req.params;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        await gmail.users.messages.trash({userId:"me", id:id});
        res.json({success:true, message:"Email moved to Trash"});
    }
    catch(error){
        console.error("Delete error:", error);
        res.status(error.status).json({ 
            success:false,
            message:error.message.includes("404") ? 'Email not found' : 'Failed to delete email'
        });
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
        res.status(error.status).json({error:"Failed to fetch drive data"});
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
            res.status(error.status).send("Error downloading file");
        }).pipe(res);
    }
    catch(error){
        console.error("Drive API Error:", error);
        res.status(error.status).json({error:"Failed to download drive data"});
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
        res.status(error.status).json({error:"Failed to fetch file content"});
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
        res.status(error.status).json({success:false});
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
        res.status(error.status).json({success:false, message:"Failed to delete file"});
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
        const currDate = new Date();
        const lastMonthFirstDay = new Date(currDate.getFullYear(), currDate.getMonth() - 1, 1);
        const nextMonthLastDay = new Date(currDate.getFullYear(), currDate.getMonth() + 2, 0);

        const response = await calendar.events.list({
            calendarId:"primary",
            timeMin:lastMonthFirstDay.toISOString(),
            timeMax:nextMonthLastDay.toISOString(),
            singleEvents:true,
            orderBy:"startTime",
            maxResults:2500
        });

        const events = response.data.items.map(event => ({
            id:event.id,
            title:event.summary,
            start:event.start.dateTime || event.start.date,
            end:event.end.dateTime || event.end.date,
            color:event.colorId ? `#${getColorHex(event.colorId)}` : "#1a73e8",
            description:event.description || "No description",
            isPast: new Date(event.end.dateTime || event.end.date) < new Date()
        }));

        res.json(events);
    }
    catch(error){
        client.emit("google-calendar-error", error);
        console.error("Calendar API Error:", error);
        res.status(error.status).json({error:"Failed to fetch calendar events"});
    }
});
app.post("/api/calendar/add", async (req, res)=>{
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
        const event = {
            summary:req.body.title,
            description:req.body.description,
            start:{
                dateTime:req.body.start,
                timeZone:req.body.timeZone || "UTC"
            },
            end:{
                dateTime:req.body.end,
                timeZone:req.body.timeZone || "UTC"
            },
            reminders:{useDefault:true}
        };

        const response = await calendar.events.insert({calendarId:"primary", requestBody:event});
        res.json({id:response.data.id, htmlLink:response.data.htmlLink, created:response.data.created});
    }
    catch(error){
        console.error("Calendar event add error: ", error);
        res.status(error.status).json({error:"Failed to add event", details:error.response?.data?.error});
    }
});
app.put("/api/calendar/edit/:id", async (req, res)=>{
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
        const updatedEvent = {
            summary:req.body.title,
            description:req.body.description,
            start:{
                dateTime:req.body.startDateTime,
                timeZone:req.body.timeZone || "America/Los_Angeles"
            },
            end:{
                dateTime:req.body.endDateTime,
                timeZone:req.body.timeZone || "America/Los_Angeles"
            },
            attendees:req.body.attendees || [],
            reminders:req.body.reminders || {
                useDefault:false,
                overrides: [
                    {method:"email", minutes:24*60},
                    {method:"popup", minutes:30},
                ],
            },
        };

        const response = await calendar.events.update({
            calendarId:"primary",
            eventId:req.params.id,
            requestBody:updatedEvent,
        });
        res.json(response);
    }
    catch(error){
        console.error("Calendar event update error: ", error);
        res.status(error.status).json({error:"Failed to update event", details:error.response?.data?.error});
    }
});
app.delete("/api/calendar/delete/:id", async (req, res)=>{
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
        await calendar.events.delete({
            calendarId:"primary",
            eventId:req.params.id,
            sendUpdates:req.query.notify ? "all" : "none"
        });

        res.json({success:true, message:"Event deleted successfully"});
    }
    catch(error){
        console.error("Calendar event delete error: ", error);
        res.status(error.status).json({error:"Failed to delete event", details:error.response?.data?.error});
    }
});
function getColorHex(colorId){
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