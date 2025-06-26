/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();

const sharedsession = require("express-socket.io-session");
const cookieParser = require("cookie-parser");
const querystring = require("querystring");
const session = require("express-session");
const axios = require("axios");

const openai = require("openai");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { google } = require("googleapis");
const multer = require("multer");
const upload = multer({dest:"/api/drive-upload"});

const openAI = new openai({apiKey:process.env.CHATGPT_API_KEY});
const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(cookieParser());
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

/*--Schemas------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const Schema = mongoose.Schema;
const usersSchema = new Schema({
    userID:      {type:String, required:true},
    username:    {type:String, required:true},
    email:       {type:String, required:true},
    password:    {type:String, required:false, default:null},
    clientID:    {type:String, required:false, default:null},
    sessionID:   {type:String, required:false, default:null},
    jobTitle:    {type:String, required:false, default:null},
    location:    {type:String, required:false, default:null},
    education:   {type:String, required:false, default:null},
    history:     {type:String, required:false, default:null},
    description: {type:String, required:false, default:null},
    cv:{
        type:{
            contentType: {type:String, required:true},
            filename:    {type:String, required:true},
            data:        {type:Buffer, required:true}
        },
        required:false,
        default:null,
    },
    googleConnected:    {type:Boolean, required:true,  default:false},
    googleRefreshToken: {type:String,  required:false, default:null},
    googleUserID:       {type:String,  required:false, default:null}
});
const Users = mongoose.model("User", usersSchema);

/*--Setup Google Services----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.GOOGLE_REDIRECT_URL
},
(accessToken, refreshToken, profile, done) => {
    profile.refreshToken = refreshToken;
    profile.accessToken = accessToken;
    checkUserExistGoogleLogin(profile);
    return done(null, profile);
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
GoogleStrategy.prototype.authorizationParams = (options)=>{
    return{access_type:"offline", prompt:"consent"};
};

app.get("/auth/google/callback", passport.authenticate("google", {failureRedirect:"/login"}), (req, res) => res.redirect("/"));
app.get("/auth/google", passport.authenticate("google", {
    scope:[
        "profile", "email", "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send"
    ]
}));

function authentificateGoogleAPI(req, res, index){
    const googleFunctions = [
        getEmailInbox, getEmailContent, readEmail, starEmail,
        importanceEmail, sendEmail, deleteEmail,
        getDriveList, getDriveFile, driveDownload, driveUpload, driveDelete,
        getCalendar, addCalendarEvent, editCalendarEvent, deleteCalendarEvent
    ];
    Users.find({userID:req.session.userID})
    .then((result)=>{
        if(result.length === 0) console.error("Find user DB error: ", error);
        else{
            const foundUser = result[0];
            const currFunc = googleFunctions[index]
            currFunc(req, res, foundUser.googleRefreshToken);
        }
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
    });
}

/*--Google Mail API----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/emails/:inbox", async (req, res)=>{
    authentificateGoogleAPI(req, res, 0);
});
app.get("/api/email-content/:id", async (req, res)=>{
    authentificateGoogleAPI(req, res, 1);
});
app.post("/api/emails/:id/read", async (req, res)=>{
    authentificateGoogleAPI(req, res, 2);
});
app.post("/api/emails/:id/star", async (req, res)=>{
    authentificateGoogleAPI(req, res, 3);
});
app.post("/api/emails/:id/importance", async (req, res)=>{
    authentificateGoogleAPI(req, res, 4);
});
app.post("/api/send-mail", upload.array("file"), async (req, res)=>{
    authentificateGoogleAPI(req, res, 5);
});
app.delete("/api/emails/:id", async (req, res)=>{
    authentificateGoogleAPI(req, res, 6);
});

async function getEmailInbox(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();
       
        const {inbox} = req.params;
        const {pageToken} = req.query;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.list({
            userId:"me", maxResults:50, q:"in:"+inbox,
            pageToken: pageToken || undefined
        });

        let messages = [];
        if(response.data.messages){
            messages = await Promise.all(
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
        }
        res.json({messages:messages, nextPageToken:response.data.nextPageToken || null});
    }
    catch(error){
        console.error("Gmail error:", error);
        res.status(error.status).json({error:"Failed to fetch emails"});
    }
}
async function getEmailContent(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function readEmail(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

        const {id} = req.params;
        const gmail = google.gmail({version:"v1", auth:oauth2Client});
        const response = await gmail.users.messages.modify({userId:"me", id:id, requestBody:{removeLabelIds:["UNREAD"]}});
        res.json({success:true, message:"Email marked as read"});
    }
    catch(error){
        console.error("Error marking email as read:", error);
        res.status(error.status).json({error:"Failed to update email status"});
    }
}
async function starEmail(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function importanceEmail(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function sendEmail(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

        const attachments = req.files || [];
        const {recipients, subject, message} = req.body;
        const boundary = '----------' + Math.random().toString(36).substring(2, 15);
        
        const rawEmailParts = [
            "From:'My Easy Class' <"+req.session.email+">",
            "To:"+recipients,
            "Subject:"+subject,
            "MIME-Version:1.0",
            "Content-Type:multipart/mixed; boundary="+boundary,
            ""
        ];

        rawEmailParts.push(
            "--"+boundary,
            "Content-Type:text/html; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            ""
        );

        const encodedHtml = Buffer.from(message).toString("base64");
        rawEmailParts.push(encodedHtml);
        rawEmailParts.push("");

        if(attachments && attachments.length > 0){
            for(const attachment of attachments){
                rawEmailParts.push(
                    "--"+boundary,
                    "Content-Type:"+attachment.mimetype+"; name="+attachment.originalname,
                    "Content-Disposition: attachment; filename="+attachment.originalname,
                    "Content-Transfer-Encoding: base64",
                    ""
                );
                const fileContent = fs.readFileSync(attachment.path);
                const encodedAttachment = fileContent.toString("base64");
                rawEmailParts.push(encodedAttachment);
                rawEmailParts.push("");
            }
        }
        rawEmailParts.push("--"+boundary+"--");

        const rawEmail = rawEmailParts.join("\n");
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
}
async function deleteEmail(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}

/*--Google Drive API---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/drive-list", async (req, res)=>{
    authentificateGoogleAPI(req, res, 7);
});
app.get("/api/drive-file-content/:fileId", async (req, res)=>{
    authentificateGoogleAPI(req, res, 8);
});
app.get("/api/drive-download/:fileId", async (req, res)=>{
    authentificateGoogleAPI(req, res, 9);
});
app.post("/api/drive-upload", upload.single("file"), async (req, res)=>{
    authentificateGoogleAPI(req, res, 10);
});
app.delete("/api/drive-delete/:fileId", async (req, res)=>{
    authentificateGoogleAPI(req, res, 11);
});

async function getDriveList(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

        const drive = google.drive({version:"v3", auth:oauth2Client});
        const response = await drive.files.list({fields:"files(id, name, mimeType, size, modifiedTime, thumbnailLink)"});
        res.json(response.data.files);
    }
    catch(error){
        console.error("Drive API Error:", error);
        res.status(error.status).json({error:"Failed to fetch drive data"});
    }
}
async function getDriveFile(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function driveDownload(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function driveUpload(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function driveDelete(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

        const fileId = req.params.fileId;
        const drive = google.drive({version:"v3", auth:oauth2Client});
        await drive.files.delete({fileId: fileId});
        res.status(200).json({success:true, message:"File deleted"});
    }
    catch(error){
        console.error("Delete error:", error);
        res.status(error.status).json({success:false, message:"Failed to delete file"});
    }
}

/*--Google Calendar API------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.get("/api/calendar", async (req, res)=>{
    authentificateGoogleAPI(req, res, 12);
});
app.post("/api/calendar/add", async (req, res)=>{
    authentificateGoogleAPI(req, res, 13);
});
app.put("/api/calendar/edit/:id", async (req, res)=>{
    authentificateGoogleAPI(req, res, 14);
});
app.delete("/api/calendar/delete/:id", async (req, res)=>{
    authentificateGoogleAPI(req, res, 15);
});

async function getCalendar(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function addCalendarEvent(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
async function editCalendarEvent(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

        const calendar = google.calendar({version:"v3", auth:oauth2Client});
        const updatedEvent = {
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
}
async function deleteCalendarEvent(req, res, refreshToken){
    try{
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token: refreshToken});
        await oauth2Client.getAccessToken();

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
}
function getColorHex(colorId){
    const colors = {
        "1":"a4bdfc", // Lavender
        "2":"7ae7bf", // Sage
        "3":"dbadff", // Grape
        "4":"ff887c", // Flamingo
    };
    return colors[colorId] || "1a73e8"; // Default blue
}

/*--Input/Output-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
io.use((client, next) => {sessionMiddleware(client.request, {}, next);});
io.on("connection", (client)=>{
    if(client.handshake.session.passport?.user){
        client.emit("google-status", client.handshake.session.passport.user);
    }

    client.on("disconnect", ()=>{userLogOff(client)});
    client.on("user-log-off", ()=>{userLogOff(client)});
    client.on("user-log-in", (email)=>{userLogIn(client, email, null, false, null)});
    client.on("session-log-in", (sessionID)=>{userLogIn(client, null, null, true, sessionID)});
    client.on("user-log-in-attempt", (email, password)=>{userLogIn(client, email, password, false, null)});
    client.on("add-password", (userID, password)=>{
        Users.find({userID:userID})
        .then((result)=>{
            if(result.length === 0){
                client.emit("add-password-fail", 0);
                return;
            }

            const foundUser = result[0];
            foundUser.password = password;
            foundUser.save()
            .then(()=>{
                client.emit("add-password-success");
            })
            .catch((error)=>{
                console.error("Client ID update error: ", error);
                client.emit("add-password-fail", 1);
            });
        })
        .catch((error)=>{
            console.error("Find user DB error: ", error);
            client.emit("user-log-in-fail", 0);
        });
    });
    client.on("google-log-in", ()=>{
        client.emit("google-redirect", "/auth/google");
    });

    client.on("new-chatgpt-message", (message)=>{
        openAI.chat.completions.create({
            model:"gpt-4o",
            messages:[{role:"user", content:message}]
        })
        .then((result)=>{
            client.emit("chatgpt-message", result.choices[0].message.content);
        })
        .catch((error)=>{
            console.error("AI Error: ", error);
            client.emit("chatgpt-message-error", error);
        });
    });
    client.on("chatgpt-assignment", (material)=>{

    });
    client.on("chatgpt-homework", (material)=>{

    });
});


/*--Start Server-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.use(express.static(__dirname));
mongoose.connect(process.env.DB_URL,{})
.then(()=>{
    app.get("/", (req, res)=>{res.sendFile(__dirname+"/pages/index.html")});
    server.listen(process.env.PORT, ()=>{console.log("Running at port "+process.env.PORT)});
})
.catch((error)=>{
    console.log(error);
    app.get("/", (req, res)=>{res.sendFile(__dirname+"/pages/db error.html")});
    server.listen(process.env.PORT, ()=>{console.log("Running at port "+process.env.PORT)});
});

function userLogOff(client){
    Users.find({clientID:client.id})
    .then((result)=>{
        if(result.length === 0) return;
        const foundUser = result[0];
        foundUser.clientID = null;
        foundUser.save()
        .catch((error)=>{
            console.error("Client ID update error: ", error);
        });
        delete client.handshake.session.passport;
        client.handshake.session.save();
    })
    .catch((error)=>{
        console.error("User clientID search failed: ", error);
    });
}
function userLogIn(client, email, password, sessionLogin, sessionID){
    let searchParam = {email:email};
    if(sessionLogin){
        searchParam = {sessionID:sessionID};
        if(sessionID === null){
            client.emit("user-log-in-fail", 4);
            return;
        }
    }
    
    Users.find(searchParam)
    .then((result)=>{
        if(result.length === 0){
            if(sessionID) client.emit("user-log-in-fail", 4);
            else client.emit("user-log-in-fail", 1);
            return;
        }

        const foundUser = result[0];
        if(sessionID === null && password !== null){
            if(foundUser.password !== password){
                client.emit("user-log-in-fail", 2);
                return;
            }
        }
        foundUser.clientID = client.id;
        foundUser.save().catch((error)=>{
            console.error("Client ID update error: ", error);
        });

        const userData = {
            userID:            foundUser.userID,
            username:          foundUser.username,
            email:             foundUser.email,
            sessionID:         foundUser.sessionID,
            jobTitle:          foundUser.jobTitle,
            location:          foundUser.location,
            education:         foundUser.education,
            history:           foundUser.history,
            cv:                foundUser.cv,
            description:       foundUser.description,
            googleConnected:   foundUser.googleConnected,
        }
        let requestPassword = false;
        if(foundUser.password === "") requestPassword = true;
        client.request.session.userID = foundUser.userID;
        client.request.session.email = foundUser.email;
        client.request.session.save((error)=>{
            if(error){
                console.error("Session save error:", error);
                client.emit("user-log-in-fail", 3);
            }
            else client.emit("user-log-in-success", userData, requestPassword);
        });
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
        if(sessionID) client.emit("user-log-in-fail", 4);
        else client.emit("user-log-in-fail", 0);
    });
}
function checkUserExistGoogleLogin(profile){
    Users.find({email:profile.emails[0].value})
    .then((result)=>{
        if(result.length > 0) return;

        const newUser = new Users({
            userID:nanoid(10),
            username:profile.displayName,
            password:"",
            sessionID:nanoid(10),
            email:profile.emails[0].value,
            googleConnected:true,
            googleRefreshToken:profile.refreshToken,
            googleUserID:profile.id
        });
        newUser.save()
        .then(()=>{console.log("New user '"+newUser.username+"' added")})
        .catch((error)=>{console.error("New user DB error: ", error)});
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
    });
}
























/*--Setup Zoom Services------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--Zoom API-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const jwt = require('jsonwebtoken');

app.get('/auth/zoom', (req, res) => {
    const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${process.env.ZOOM_REDIRECT_URL}`;
    res.redirect(url);
});
app.get('/auth/zoom/callback', async (req, res) => {
    const { code } = req.query;
    const params = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URL,
      client_id: process.env.ZOOM_CLIENT_ID,
      client_secret: process.env.ZOOM_CLIENT_SECRET,
    };
  
    try {
      const response = await axios.post('https://zoom.us/oauth/token', querystring.stringify(params));
      req.session.zoomAccessToken = response.data.access_token;
      res.redirect('/');
    } catch (error) {
      res.send('Zoom authentication failed.');
    }
});
app.get('/api/create-meeting', async (req, res) => {
    if (!req.session.zoomAccessToken) return res.status(401).send('Unauthorized');
  
    try {
      const meetingConfig = {
        topic: 'My Zoom Meeting',
        type: 1, // Instant meeting
        settings: { host_video: true, participant_video: true },
      };
  
      const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', meetingConfig, {
        headers: { Authorization: `Bearer ${req.session.zoomAccessToken}` },
      });
  
      res.json(response.data);
    } catch (error) {
        console.log(error)
      res.status(500).json({ error: 'Failed to create meeting' });
    }
});
app.post('/api/generate-zoom-signature', async (req, res) => {
    const { meetingNumber, role } = req.body;

    if (!meetingNumber || typeof role === 'undefined') {
        return res.status(400).json({ error: 'Meeting number and role are required.' });
    }

    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // Expires in 2 hours

    const payload = {
        sdkKey: process.env.ZOOM_CLIENT_ID,
        mn: meetingNumber.toString(),
        role: parseInt(role, 10),
        iat: iat,
        exp: exp,
        appKey: process.env.ZOOM_CLIENT_ID, // Some SDK versions might expect appKey
        tokenExp: exp,
    };

    try {
        const signature = jwt.sign(payload, process.env.ZOOM_CLIENT_SECRET, { algorithm: 'HS256' });
        let zakToken = null;

        if (parseInt(role, 10) === 1) {
            // === Option 1: If the meeting is being created by and for the API user ===
            // And you're using a Server-to-Server OAuth app or JWT app for that user,
            // you might fetch their ZAK token.
            // This is a placeholder - actual ZAK fetching requires Zoom API call.
            const zakResponse = await axios.get(`https://api.zoom.us/v2/users/me/zak`, { headers: { 'Authorization': `Bearer ${YOUR_S2S_ACCESS_TOKEN}` } });
            zakToken = zakResponse.data.token;
            // For simplicity in this example, we'll assume you might have it or get it.
            // If your /api/create-meeting already returns a host_zak, you could use that.
            // For now, let's send null and acknowledge it might be an issue.
            console.warn("ZAK token fetching logic not fully implemented in this example for host role.");
            // You might need to pass the ZAK from the meeting creation step if it provides it,
            // or have a dedicated user ID for whom you fetch the ZAK.
        }

        res.json({ signature, zak: zakToken });

    } catch (error) {
        console.error('Error generating signature or fetching ZAK:', error);
        res.status(500).json({ error: 'Failed to generate signature or process request.' });
    }
});