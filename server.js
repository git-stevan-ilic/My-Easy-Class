/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
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
const vision = require("@google-cloud/vision");
const multer = require("multer");
const upload = multer({storage:multer.memoryStorage()});
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const stream = require("stream");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cheerio = require("cheerio");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const openAI = new openai({apiKey:process.env.CHATGPT_API_KEY});
const app = express();
const server = createServer(app);
const io = new Server(server, {maxHttpBufferSize:1e7});
const visionClient = new vision.ImageAnnotatorClient({
    keyFile:"./json/plenary-cascade-452811-p1-d482cdc02704.json"
});

app.use(cookieParser());
const sessionMiddleware = session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false} // Set to true in production with HTTPS
});
app.use(bodyParser.json({limit:"10mb"}));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
io.use(sharedsession(sessionMiddleware, {autoSave:true}));

/*--Schemas------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const Schema = mongoose.Schema;
const usersSchema = new Schema({
    userID:         {type:String, required:true},
    username:       {type:String, required:true},
    email:          {type:String, required:true},
    password:       {type:String, required:false, default:null},
    clientID:       {type:String, required:false, default:null},
    sessionID:      {type:String, required:false, default:null},
    jobTitle:       {type:String, required:false, default:null},
    location:       {type:String, required:false, default:null},
    education:      {type:String, required:false, default:null},
    history:        {type:String, required:false, default:null},
    description:    {type:String, required:false, default:null},
    payID:          {type:String, required:false, default:null},
    subscriptionID: {type:String, required:false, default:null},
    subscription:   {type:Number, required:true,  default:0},
    cv:{
        mimeType: {type:String, required:false, default:null},
        filename: {type:String, required:false, default:null},
        data:     {type:Buffer, required:false, default:null}
    },
    icon:{
        mimeType: {type:String, required:false, default:null},
        filename: {type:String, required:false, default:null},
        data:     {type:Buffer, required:false, default:null}
    },
    classes:            {type:Array,   required:true},
    googleConnected:    {type:Boolean, required:true,  default:false},
    googleRefreshToken: {type:String,  required:false, default:null},
    googleUserID:       {type:String,  required:false, default:null},
});
const classSchema = new Schema({
    classID:       {type:String, required:true},
    ownerID:       {type:String, required:true},
    type:          {type:String, required:true},
    name:          {type:String, required:true},
    students:      {type:Array,  required:true, default:[]},
    assignments:   {type:Array,  required:true, default:[]},
    homework:      {type:Array,  required:true, default:[]},
    lessons:{
        upcoming:  {type:Array,  required:true, default:[]},
        completed: {type:Array,  required:true, default:[]},
        canceled:  {type:Array,  required:true, default:[]}
    }
});
 
const Users = mongoose.model("User", usersSchema);
const Classes = mongoose.model("Class", classSchema);

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


/*--Setup Export Functions---------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function authentificateGoogleAPI(req, res, index){
    const googleFunctions = [
        getEmailInbox, getEmailContent, readEmail, starEmail,
        importanceEmail, sendEmail, deleteEmail,
        getDriveList, getDriveFile, driveDownload, driveUpload, driveDelete,
        getCalendar, addCalendarEvent, editCalendarEvent, deleteCalendarEvent
    ];
    Users.find({userID:req.session.userID})
    .then((result)=>{
        if(result.length === 0) console.error("Find user DB error");
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
        res.status(500).json({error:"Failed to fetch emails"});
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
        res.status(500).json({error:"Failed to fetch email"});
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
        res.status(500).json({error:"Failed to update email status"});
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
        res.status(500).json({success:false});
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
        res.status(500).json({success:false});
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
                const encodedAttachment = attachment.buffer.toString("base64");
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
        res.status(500).json({error:"Failed to send email"});
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
        res.status(500).json({ 
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
        console.error(500);
        console.error("Drive API Error:", error);
        res.status(500).json({error:"Failed to fetch drive data"});
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

        let conditionTrue = false, conditionIndex = 0;
        const mimeTypeConditions = [
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            mimeType.startsWith("image/"), mimeType.startsWith("video/"),
            mimeType === "text/plain", mimeType === "application/pdf"
        ];
        for(let i = 0; i < mimeTypeConditions.length; i++){
            if(mimeTypeConditions[i]){
                conditionTrue = true;
                conditionIndex = i;
                break;
            }
        }

        if(conditionTrue){
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
        if(mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
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
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        const media = {mimeType:req.file.mimetype, body:bufferStream};
        const response = await drive.files.create({resource:fileMetadata, media:media, fields:"id, name"});
        res.status(200).json({success:true, file:response.data});
    }
    catch(error){
        console.error("Upload error:", error);
        res.status(500).json({success:false});
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
        res.status(500).json({success:false, message:"Failed to delete file"});
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
        console.error("Calendar API Error:", error);
        res.status(500).json({error:"Failed to fetch calendar events"});
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
        res.status(500).json({error:"Failed to add event", details:error.response?.data?.error});
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
        res.status(500).json({error:"Failed to update event", details:error.response?.data?.error});
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
        res.status(500).json({error:"Failed to delete event", details:error.response?.data?.error});
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

/*--About Me File Upload-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.post("/upload-cv/:userID", upload.single("cvFile"), async (req, res)=>{
    try{
        const userID = req.params.userID;
        if(!req.file) return res.status(400).send("No file uploaded");

        const allowedDocTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document",];
        if(!allowedDocTypes.includes(req.file.mimetype)) return res.status(400).send("Invalid document format");
        
        Users.find({userID:userID})
        .then((result)=>{
            if(result.length === 0){
                console.error("User not found");
                res.status(500).send("CV upload failed");
                return;
            }

            const foundUser = result[0];
            foundUser.cv.data = req.file.buffer;
            foundUser.cv.mimeType = req.file.mimetype;
            foundUser.cv.filename = req.file.originalname;

            foundUser.save().catch((error)=>{
                console.error("Client ID update error: ", error);
                res.status(500).send("CV upload failed");
            });
        })
        .catch((error)=>{
            console.error(error);
            res.status(500).send("CV upload failed");
        });
        res.send("CV uploaded successfully");
    }
    catch(error){
        console.error(error);
        res.status(500).send("CV upload failed");
    }
});
app.post("/upload-icon/:userID", upload.single("iconFile"), async (req, res)=>{
    try{
        const userID = req.params.userID;
        if(!req.file) return res.status(400).send("No file uploaded");

        const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
            if(!allowedImageTypes.includes(req.file.mimetype)) {
            return res.status(400).send("Invalid image format");
        }

        Users.find({userID:userID})
        .then((result)=>{
            if(result.length === 0){
                console.error("User not found");
                res.status(500).send("CV upload failed");
                return;
            }

            const foundUser = result[0];
            foundUser.icon.data = req.file.buffer;
            foundUser.icon.mimeType = req.file.mimetype;
            foundUser.icon.filename = req.file.originalname;

            foundUser.save().catch((error)=>{
                console.error("Client ID update error: ", error);
                res.status(500).send("CV upload failed");
            });
        })
        .catch((error)=>{
            console.error(error);
            res.status(500).send("CV upload failed");
        });
        res.send("Profile image uploaded");
    }
    catch(error){
        console.error(error);
        res.status(500).send("Profile image upload failed");
    }
});

/*--Stripe Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.post("/subscription", async (req, res)=>{
    const subscriptionType = req.body.subscription;
    const userID = req.body.userID;
    if(!subscriptionType){
        res.status(500).json({error:"Subscription type not found"});
        return;
    }
    let price = process.env.STRIPE_BASIC_PRICE_ID;
    if(subscriptionType === "advanced") price = process.env.STRIPE_ADVANCED_PRICE_ID;
    try{
        const payID = nanoid(10);
        Users.find({userID:userID})
        .then((result)=>{
            if(result.length === 0){
                console.error("Find user DB error: ", error);
                client.emit("payment-fail", 1);
                return;
            }

            const foundUser = result[0];
            foundUser.payID = payID;
            foundUser.save()
            .then(async ()=>{stripePayment(res, userID, payID, price, subscriptionType)})
            .catch((error)=>{
                console.error("User payID update error: ", error);
                client.emit("payment-fail", 2);
                return;
            });
        })
        .catch((error)=>{
            console.error("Find user DB error: ", error);
            client.emit("payment-fail", 0);
        });
    }
    catch(error){
        res.status(500).json({error:error.message});
        console.log(error);
    }
});
app.post("/verify-subscription", async (req, res)=>{
    const subscription = req.body.subscription;
    const sessionID = req.body.sessionID;
    const success = req.body.success;
    const userID = req.body.userID;
    const payID = req.body.payID;

    if(!userID || !payID){
        res.status(500).json({error:"Invalid request"});
        return;
    }
    Users.find({userID:userID})
    .then(async (result)=>{
        if(result.length === 0){
            console.error("Find user DB error: ", error);
            client.emit("payment-fail", 1);
            return;
        }

        const foundUser = result[0];
        if(foundUser.payID !== payID){
            console.error("PayID doesn't match: ", error);
            client.emit("payment-fail", 3);
            return;
        }
        if(!success){
            foundUser.payID = null;
            foundUser.save()
            .catch((error)=>{
                console.error("User payID update error: ", error);
                client.emit("payment-fail", 2);
                return;
            });
            return;
        }
        
        const session = await stripe.checkout.sessions.retrieve(sessionID);
        const subscriptionID = session.subscription;

        if(subscription === 2 && foundUser.subscription === 1 && foundUser.subscriptionID){
            try{
                const canceledSubscription = await stripe.subscriptions.cancel(foundUser.subscriptionID);
                console.log("Cancel old success success: ", canceledSubscription);
            }
            catch(error){
                console.error("Cancel Old Subscription Error: ", error);
                client.emit("payment-fail", 5);
            }
        }

        foundUser.subscriptionID = subscriptionID;
        foundUser.subscription = subscription;
        foundUser.payID = null;
        foundUser.save()
        .then(()=>{res.json({ok:true})})
        .catch((error)=>{
            console.error("User payID update error: ", error);
            client.emit("payment-fail", 2);
            return;
        });
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
        client.emit("payment-fail", 0);
    });
});

async function stripePayment(res, userID, payID, price, subscriptionType){
    const session = await stripe.checkout.sessions.create({
        mode:"subscription",
        payment_method_types:["card"],
        line_items:[{
            price:price,
            quantity:1,
        }],
        success_url:process.env.URL+"/pages/payment_success.html?userID="+userID+"&payID="+payID+"&subscription="+subscriptionType+"&session_id={CHECKOUT_SESSION_ID}",
        cancel_url:process.env.URL+"/pages/payment_fail.html?userID="+userID+"&payID="+payID+"&subscription="+subscriptionType,
    });
    res.json({url:session.url});
}
async function cancelSubscription(client, userID){
    Users.find({userID:userID})
    .then(async (result)=>{
        if(result.length === 0){
            console.error("Find user DB fail");
            client.emit("payment-fail", 1);
            return;
        }

        const foundUser = result[0];
        try{
            const canceledSubscription = await stripe.subscriptions.cancel(foundUser.subscriptionID);
            console.log("Cancel success: ", canceledSubscription);

            foundUser.subscriptionID = null;
            foundUser.subscription = 0;
            foundUser.save()
            .then(()=>{client.emit("cancel-subscription-success")})
            .catch((error)=>{
                console.error("User payID update error: ", error);
                client.emit("payment-fail", 2);
                return;
            });
        }
        catch(error){
            console.error("Cancel Subscription Error: ", error);
            client.emit("payment-fail", 4);
        }
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
        client.emit("payment-fail", 0);
    });
}

/*--Assignment Download------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.post("/generate-doc", (req, res)=>{
    const { htmlContent } = req.body;
    if(!htmlContent) return res.status(400).send("Missing HTML content");

    const wordDocument = htmlContent;
    res.setHeader("Content-Disposition", "attachment; filename=document.doc");
    res.setHeader("Content-Type", "application/msword");
    res.send(wordDocument);
});
app.post("/generate-pdf", async (req, res)=>{
    const { htmlContent } = req.body;
    if(!htmlContent) return res.status(400).send("Missing HTML content");

    try{
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil:"networkidle0"});
    
        const pdfBuffer = await page.pdf({format:"A4"});
        await browser.close();
    
        res.set({
          "Content-Type":"application/pdf",
          "Content-Disposition":"attachment; filename='document.pdf"
        });
        res.send(pdfBuffer);
    }
    catch(error){
        console.error("PDF generation failed:", error);
        res.status(500).send("Failed to generate PDF");
    }
});

/*--Input/Output-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
io.use((client, next) => {sessionMiddleware(client.request, {}, next);});
io.on("connection", (client)=>{
    if(client.handshake.session.passport?.user) client.emit("google-status", client.handshake.session.passport.user);
    client.on("disconnect", ()=>{userLogOff(client)});
    client.on("user-log-off", ()=>{userLogOff(client)});
    client.on("user-log-in", (email)=>{userLogIn(client, email, null, false, null)});
    client.on("session-log-in", (sessionID)=>{userLogIn(client, null, null, true, sessionID)});
    client.on("user-log-in-attempt", (email, password)=>{userLogIn(client, email, password, false, null)});
    client.on("register-new-account", (newAccount)=>{userRegister(client, newAccount)});
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
    client.on("get-user-display-data", (userID)=>{
        Users.find({userID:userID})
        .then((result)=>{
            if(result.length === 0){
                client.emit("get-user-display-data-fail");
                return;
            }
            const foundUser = result[0];
            client.emit("receive-user-display-data", {
                userID:userID,
                username:foundUser.username,
                email:foundUser.email,
                jobTitle:foundUser.jobTitle,
                location:foundUser.location,
                education:foundUser.education,
                history:foundUser.history,
                description:foundUser.description,
                icon:foundUser.icon,
                cv:foundUser.cv
            });
        })
        .catch((error)=>{
            console.error("Find user DB error: ", error);
            client.emit("get-user-display-data-fail");
        });
    });
    client.on("get-class-display-data", (classID)=>{
        Classes.find({classID:classID})
        .then((result)=>{
            if(result.length === 0){
                console.error("Find Class DB error: ", error);
                client.emit("get-class-display-data-fail");
                return;
            }
            const foundClass = result[0];
            client.emit("receive-class-display-data", foundClass); 
        })
        .catch((error)=>{
            console.error("Find Class DB error: ", error);
            client.emit("get-class-display-data-fail");
        });
    });
    client.on("class-data-request", (userID)=>{
        getClassData(client, userID, false);
    });
    client.on("new-class", async (name, userID)=>{
        const newClassID = await createClass(name, userID, null);
        if(!newClassID) client.emit("new-class-error");
        else getClassData(client, userID, true);
    });
    client.on("delete-class", (classID, ownerID)=>{
        deleteClass(client, classID, ownerID);
    });
    client.on("edit-class", (classID, name)=>{
        editClass(client, classID, name);
    });
    client.on("update-user-data", (userData)=>{
        Users.find({email:userData.email})
        .then((result)=>{
            if(result.length === 0){
                client.emit("get-user-display-data-fail");
                return;
            }
            const foundUser = result[0];
            foundUser.description = userData.description;
            foundUser.education = userData.education;
            foundUser.jobTitle = userData.jobTitle;
            foundUser.location = userData.location;
            foundUser.username = userData.username;
            foundUser.history = userData.history;
            foundUser.save().catch((error)=>{
                console.error("Client ID update error: ", error);
            });
        })
        .catch((error)=>{
            console.error("Find user DB error: ", error);
            client.emit("get-user-display-data-fail");
        });
    });
    client.on("cancel-subscription", (userID)=>{
        cancelSubscription(client, userID);
    });
    client.on("analize-cefr", (fileId)=>{
        Users.find({clientID:client.id})
        .then(async (result)=>{
            if(result.length === 0) console.error("Find user DB error: ", error);
            else{
                try{
                    const foundUser = result[0];
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET,
                        process.env.GOOGLE_REDIRECT_URL
                    );
                    oauth2Client.setCredentials({refresh_token:foundUser.googleRefreshToken});
                    await oauth2Client.getAccessToken();

                    const drive = google.drive({version:"v3", auth:oauth2Client});
                    const metadata = await drive.files.get({fileId, fields:"mimeType"});
                    const mimeType = metadata.data.mimeType;

                    const res = await drive.files.get({fileId, alt:"media"}, {responseType:"arraybuffer"});
                    const buffer = Buffer.from(res.data);
                    let textContent = "";

                    if(mimeType.startsWith("text/")) textContent = buffer.toString("utf8");
                    else if(mimeType === "application/pdf"){
                        const pdfData = await pdfParse(buffer);
                        textContent = pdfData.text;
                    }
                    else if(mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
                        const result = await mammoth.extractRawText({buffer});
                        textContent = result.value;
                    }
                    /*else if(mimeType.startsWith("image/")){
                        textContent = await extractTextFromImage(buffer);
                        console.log(textContent)
                        return;
                    }
                    /*else if(mimeType.startsWith("image/")){
                        const [result] = await visionClient.textDetection({image:{content:buffer}});
                        const detections = result.textAnnotations;
                        textContent = detections.length ? detections[0].description : "";
                    }*/
                    else{
                        console.error("Unsupported file type for CEFR analysis");
                        client.emit("cefr-read-error", 1);
                        return;
                    }
                    if(!textContent.trim()){
                        console.error("No readable text found");
                        client.emit("cefr-read-error", 2);
                    }
                    analyzeCEFR(client, textContent);
                }
                catch(error){
                    console.error("Reading CEFR error: ", error);
                    client.emit("cefr-read-error", 0);
                }
            }
        })
        .catch((error)=>{
            console.error("Find user DB error: ", error);
        });
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
    client.on("generate-assignment", async (assignment)=>{
        const prompt = await generateAssignmentPrompt(assignment);
        openAI.chat.completions.create({
            model:"gpt-4o",
            messages:[{role:"user", content:prompt}]
        })
        .then((result)=>{
            client.emit("generate-assignment-success", result.choices[0].message.content);
        })
        .catch((error)=>{
            console.error("AI Assignment Error: ", error);
            client.emit("generate-assignment-fail", error);
        });
    });
    client.on("generate-assignment-cefr", (text)=>{
        analyzeCEFR(client, text);
    });
    client.on("save-assignment", (assignment, classID)=>{
        Classes.find({classID:classID})
        .then((result)=>{
            if(result.length === 0){
                console.error("Find Class DB error");
                client.emit("save-assignment-fail", 0);
                return;
            }
            assignment.id = nanoid(10);
            const foundClass = result[0];
            if(assignment.assignmentType === "Assignment") foundClass.assignments.push(assignment);
            else if(assignment.assignmentType === "Homework") foundClass.homework.push(assignment);
            else{
                console.error("Invalid assignment format");
                client.emit("save-assignment-fail", 1);
                return;
            }
            foundClass.save()
            .then(()=>{
                client.emit("save-assignment-success");
            })
            .catch((error)=>{
                console.error("Saving Class error: ", error);
                client.emit("save-assignment-fail", 2);
                return;
            });
        })
        .catch((error)=>{
            console.error("Find Class DB error: ", error);
            client.emit("save-assignment-fail", 0);
        });
    });
    client.on("delete-assignment", (classID, assignmentID, isHomework)=>{
        Classes.find({classID:classID})
        .then((result)=>{
            if(result.length === 0){
                client.emit("assignment-delete-fail", 1);
                console.error("Class delete error");
                return;
            }
            const currClass = result[0];
            let found = false;
            if(isHomework){
                for(let i = 0; i < currClass.homework.length; i++){
                    if(currClass.homework[i].id === assignmentID){
                        currClass.homework.splice(i, 1);
                        found = true;
                        break;
                    }
                }
            }
            else{
                for(let i = 0; i < currClass.assignments.length; i++){
                    if(currClass.assignments[i].id === assignmentID){
                        currClass.assignments.splice(i, 1);
                        found = true;
                        break;
                    }
                }
            }
            if(!found){
                client.emit("assignment-delete-fail", 1);
                console.error("Class delete error: Assignment not found");
            }
            else{
                currClass.save()
                .then(()=>{client.emit("assignment-delete-success")})
                .catch((error)=>{
                    client.emit("assignment-delete-fail", 2);
                    console.error("Class delete error: " + error);
                });
            }
        })
        .catch((error)=>{
            client.emit("assignment-delete-fail", 0);
            console.error("Class delete error: " + error);
        });
    });
    client.on("add-student", (classID, name, email)=>{
        addStudent(client, classID, name, email, null, true);
    });
    client.on("edit-student", (classID, studentID, name, email)=>{
        editStudent(client, classID, studentID, name, email, true);
    });
    client.on("delete-student", (classID, studentID)=>{
        deleteStudent(client, classID, studentID, true);
    });
    client.on("remove-student", (classID, studentID)=>{
        removeStudent(client, classID, studentID);
    });
    client.on("add-students-list", (allStudentsID, ungroupedStudentsID, receiveingClassID, studentList)=>{
        addStudentsList(client, allStudentsID, ungroupedStudentsID, receiveingClassID, studentList);
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

/*--Account Functions--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
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
            icon:              foundUser.icon,
            description:       foundUser.description,
            subscription:      foundUser.subscription,
            classes:           foundUser.classes,
            googleConnected:   foundUser.googleConnected
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
function userRegister(client, newAccount){
    Users.find({email:newAccount.email})
    .then(async (result)=>{
        if(result.length > 0){
            console.error("User already exists");
            client.emit("user-register-fail", 1);
            return;
        }
        const userID = nanoid(10)
        const newUser = new Users({
            userID:userID,
            username:newAccount.username,
            password:newAccount.password,
            sessionID:nanoid(10),
            email:newAccount.email,
            classes:[],
            googleConnected:false,
            googleRefreshToken:null,
            googleUserID:null
        });
        
        await newUser.save()
        .then(async ()=>{
            const allStudentsClass = await createClass("All Students", userID, "all-students");
            const ungroupedClass = await createClass("Ungrouped", userID, "ungrouped-students");
            if(!allStudentsClass || !ungroupedClass){
                client.emit("user-register-fail", 2);
                console.log("Class Creation Error");
            }

            console.log("New user '"+newUser.username+"' added");
            client.emit("user-register-success", newUser);
        })
        .catch((error)=>{
            console.error("New user DB error: ", error);
            client.emit("user-register-fail", 0);
        });
    })
    .catch((error)=>{
        console.error("User register failed: ", error);
        client.emit("user-register-fail", 0);
    });
}
async function checkUserExistGoogleLogin(profile){
    try{
        const result = await Users.find({email:profile.emails[0].value});
        if(result.length > 0){
            const foundUser = result[0];
            if(!foundUser.googleConnected){
                foundUser.googleConnected = true;
                foundUser.googleRefreshToken = profile.refreshToken;
                foundUser.googleUserID = profile.id;
            }
            await foundUser.save().catch((error)=>{
                console.error("Client ID update error: ", error);
            });
            return;
        }

        const userID = nanoid(10);
        const newUser = new Users({
            userID:userID,
            username:profile.displayName,
            password:"",
            sessionID:nanoid(10),
            email:profile.emails[0].value,
            classes:[],
            googleConnected:true,
            googleRefreshToken:profile.refreshToken,
            googleUserID:profile.id
        });

        await newUser.save()
        .then(async ()=>{
            console.log("New user '"+newUser.username+"' added");

            const allStudentsClass = await createClass("All Students", userID, "all-students");
            const ungroupedClass = await createClass("Ungrouped", userID, "ungrouped-students");
            if(!allStudentsClass || !ungroupedClass){
                console.log("Class Creation Error");
                return;
            }
        })
        .catch((error)=>{console.error("New user DB error: ", error)});
    }
    catch(error){
        console.error("Find user DB error: ", error);
    }
}

/*--Class Functions----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function createClass(name, ownerID, type){
    try{
        if(!type) type = "user-class";
        const newClass = new Classes({
            classID:nanoid(10),
            ownerID:ownerID,
            type:type,
            name:name,
            students:[],
            assignments:[],
            homework:[],
            lessons:{
                upcoming:[],
                completed:[],
                canceled:[],
            }
        });
        await newClass.save();
        const foundUser = await Users.findOne({userID:ownerID});
        if(!foundUser){
            console.error("New class DB error: User not found");
            return null;
        }
        let idPresent = false;
        for(let i = 0; i < foundUser.classes.length; i++){
            if(foundUser.classes[i] === newClass.classID){
                idPresent = true;
                break;
            }
        }
        if(!idPresent){
            foundUser.classes.push(newClass.classID);
            await foundUser.save();
        }
        return newClass.classID;
    }
    catch(error){
        console.error("New class DB error: ", error);
        return null;
    }
}
function getClassData(client, userID, newClass){
    Users.find({userID:userID})
    .then((result)=>{
        if(result.length === 0){
            client.emit("class-data-request-fail");
            return;
        }

        let error = false;
        const foundUser = result[0], classData = [], classDataReceived = [];
        for(let i = 0; i < foundUser.classes.length; i++) classDataReceived.push(false);
        for(let i = 0; i < foundUser.classes.length; i++){
            Classes.find({classID:foundUser.classes[i]})
            .then((result)=>{
                if(result.length === 0){
                    console.error("Class not found DB");
                    error = true;
                    return;
                }
                classData[i] = result[0];
                classDataReceived[i] = true;
                if(error) client.emit("class-data-request-fail");
                else if(checkClassRetreiveCompletge()){
                    let newCurrClass = -1;
                    if(newClass) newCurrClass = foundUser.classes.length-1;
                    client.emit("class-data-received", classData, newCurrClass);
                }
            })
            .catch((error)=>{
                console.error("Find Class DB error: ", error);
                error = true;
            });
        }

        function checkClassRetreiveCompletge(){
            let allReceived = true;
            for(let i = 0; i < classDataReceived.length; i++){
                if(!classDataReceived[i]){
                    allReceived = false;
                    break;
                }
            }
            return allReceived;
        }
    })
    .catch((error)=>{
        console.error("Find user DB error: ", error);
        client.emit("class-data-request-fail");
    });
}
function deleteClass(client, classID, ownerID){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Edit Class Error: Class owner not found");
            client.emit("edit-class-fail", 3);
            return;
        }
        const foundUser = result[0];
        let classIndex, foundClass = false;
        for(let i = 0; i < foundUser.classes.length; i++){
            if(foundUser.classes[i] === classID){
                foundClass = true;
                classIndex = i;
            }
        }
        if(!foundClass){
            console.error("Edit Class Error: Class not found in User");
            client.emit("edit-class-fail", 4);
            return;
        }
        foundUser.classes.splice(classIndex, 1);
        foundUser.save()
        .then(()=>{
            Classes.findOneAndDelete({classID:classID})
            .then(()=>{client.emit("edit-class-success", 1)})
            .catch((error)=>{
                console.error("Edit Class Error: " + error);
                client.emit("edit-class-fail", 0);
            });
        })
        .catch((error)=>{
            console.error("Edit Class Error: " + error);
            client.emit("edit-class-fail", 2);
        });
    })
    .catch((error)=>{
        console.error("Edit Class Error: " + error);
        client.emit("edit-class-fail", 0);
    });
}
function editClass(client, classID, name){
    Classes.find({classID:classID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Edit Class failed: Class not found");
            client.emit("edit-class-fail", 1);
            return;
        }
        const foundClass = result[0];
        foundClass.name = name;
        foundClass.save()
        .then(()=>{client.emit("edit-class-success", 0)})
        .catch((error)=>{
            console.error("Edit Class failed: " + error);
            client.emit("edit-class-fail", 2);
        });
    })
    .catch((error)=>{
        console.error("Edit Class failed: " + error);
        client.emit("edit-class-fail", 0);
    });
}
function addStudent(client, classID, name, email, studentID, checkDefaulAdd){
    let newStudentID = studentID;
    if(!studentID) newStudentID = nanoid(10);
    Classes.find({classID:classID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Find Class Error: Class doesn't exist");
            client.emit("input-name-fail", 1);
            return;
        }
        const foundClass = result[0];
        let studentPresent = false;
        for(let i = 0; i < foundClass.students.length; i++){
            if(foundClass.students[i].name === name){
                studentPresent = true;
                break;
            }
        }
        if(studentPresent){
            client.emit("input-name-success", true, null);
            return;
        }

        foundClass.students.push({id:newStudentID, name:name, email:email});
        foundClass.save()
        .then(()=>{
            if(checkDefaulAdd){
                client.emit("input-name-success", false, foundClass);
                addStudentRequestUpdate(foundClass.ownerID);
                addStudentsOtherClassUpdate(client, foundClass.ownerID, foundClass.type, name, email, newStudentID);
            }
        })
        .catch((error)=>{
            console.error("Save Class Error: "+error);
            client.emit("input-name-fail", 2);
        });
    })
    .catch((error)=>{
        console.error("Find Class Error: "+error);
        client.emit("input-name-fail", 0);
    });
}
function addStudentRequestUpdate(ownerID){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Find Class Error: "+error);
            return;
        }
        const foundUser = result[0];
        if(foundUser.clientID){
            io.to(foundUser.clientID).emit("update-student-list");
        }
    })
    .catch((error)=>{
        console.error("Find Class Error: "+error);
    });
}
function addStudentsOtherClassUpdate(client, ownerID, type, name, email, newStudentID){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Find Class Error: "+error);
            client.emit("input-name-fail", 4);
            return;
        }
        const foundUser = result[0];
        if(type === "user-class") addStudent(client, foundUser.classes[0], name, email, newStudentID, false);
        else{
            let classIndex = 0;
            if(type === "all-students") classIndex = 1;
            addStudent(client, foundUser.classes[classIndex], name, email, newStudentID, false);
        }
    })
    .catch((error)=>{
        console.error("Find Class Error: "+error);
        client.emit("input-name-fail", 3);
    });
}
function deleteStudent(client, classID, studentID, checkDefaulDelete){
    Classes.find({classID:classID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Delete Student Failed: Class not found");
            client.emit("edit-student-fail", 1);
            return;
        }
        const foundClass = result[0];
        let studentFound = false, studentIndex;
        for(let i = 0; i < foundClass.students.length; i++){
            if(foundClass.students[i].id === studentID){
                studentFound = true;
                studentIndex = i;
                break;
            }
        }
        if(!studentFound) return;

        foundClass.students.splice(studentIndex, 1);
        foundClass.markModified("students");
        foundClass.save()
        .then(()=>{
            if(checkDefaulDelete){
                client.emit("edit-student-success", 1);
                deleteStudentOtherClassUpdate(client, classID, studentID, foundClass.ownerID);  
            }
        })
        .catch((error)=>{
            console.error("Delete Student Failed: "+error);
            client.emit("edit-student-fail", 3);
        });
    })
    .catch((error)=>{
        console.error("Delete Student Failed: "+error);
        client.emit("edit-student-fail", 0);
    });
}
function deleteStudentOtherClassUpdate(client, classID, studentID, ownerID){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Delete Student Failed: Owner not found");
            client.emit("edit-student-fail", 5);
            return;
        }
        const foundUser = result[0];
        for(let i = 0; i < foundUser.classes.length; i++){
            if(foundUser.classes[i] !== classID){
                deleteStudent(client, foundUser.classes[i], studentID, false);
            }
        }
    })
    .catch((error)=>{
        console.error("Delete Student Failed: "+error);
        client.emit("edit-student-fail", 4);
    });
}
function removeStudent(client, classID, studentID){
    Classes.find({classID:classID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Remove Student Failed: Class not found");
            client.emit("edit-student-fail", 1);
            return;
        }
        const foundClass = result[0];
        let studentFound = false, studentIndex;
        for(let i = 0; i < foundClass.students.length; i++){
            if(foundClass.students[i].id === studentID){
                studentFound = true;
                studentIndex = i;
                break;
            }
        }
        if(!studentFound) return;

        const removedStudent = foundClass.students[studentIndex];
        foundClass.students.splice(studentIndex, 1);
        foundClass.markModified("students");
        foundClass.save()
        .then(()=>{
            client.emit("edit-student-success", 2);
            ungroupRemovedStudent(client, foundClass.ownerID, removedStudent);
        })
        .catch((error)=>{
            console.error("Remove Student Failed: "+error);
            client.emit("edit-student-fail", 3);
        });
    })
    .catch((error)=>{
        console.error("Remove Student Failed: "+error);
        client.emit("edit-student-fail", 0);
    });
}
function ungroupRemovedStudent(client, ownerID, removedStudent){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Remove Student Failed: Owner not found");
            client.emit("edit-student-fail", 5);
            return;
        }
        const foundUser = result[0];
        addStudent(client, foundUser.classes[1], removedStudent.name, removedStudent.email, removedStudent.id, false);
    })
    .catch((error)=>{
        console.error("Remove Student Failed: "+error);
        client.emit("edit-student-fail", 4);
    });
}
function editStudent(client, classID, studentID, studentName, studentEmail, checkDefaultEdit){
    Classes.find({classID:classID})
    .then((result)=>{
        if(result.length === 0){
              console.error("Edit Student Failed: Class not found");
            client.emit("edit-student-fail", 1);
            return;
        }
        const foundClass = result[0];
        let studentFound = false, studentIndex;
        for(let i = 0; i < foundClass.students.length; i++){
            if(foundClass.students[i].id === studentID){
                studentFound = true;
                studentIndex = i;
                break;
            }
        }
        if(!studentFound) return;

        foundClass.students[studentIndex].name = studentName;
        foundClass.students[studentIndex].email = studentEmail;
        foundClass.markModified("students");
        foundClass.save()
        .then(()=>{
            if(checkDefaultEdit){
                client.emit("edit-student-success", 0);
                editStudentOtherClassUpdate(client, foundClass.ownerID, classID, studentID, studentName, studentEmail);
            }
        })
        .catch((error)=>{
            console.error("Edit Student Failed: "+error);
            client.emit("edit-student-fail", 3);
        });
    })
    .catch((error)=>{
        console.error("Edit Student Failed: "+error);
        client.emit("edit-student-fail", 0);
    });
}
function editStudentOtherClassUpdate(client, ownerID, classID, studentID, studentName, studentEmail){
    Users.find({userID:ownerID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Edit Student Failed: Owner not found");
            client.emit("edit-student-fail", 5);
            return;
        }
        const foundUser = result[0];
        for(let i = 0; i < foundUser.classes.length; i++){
            if(foundUser.classes[i] !== classID){
                editStudent(client, foundUser.classes[i], studentID, studentName, studentEmail, false);
            }
        }
    })
    .catch((error)=>{
        console.error("Edit Student Failed: "+error);
        client.emit("edit-student-fail", 4);
    });
}
function addStudentsList(client, allStudentsID, ungroupedStudentsID, receiveingClassID, studentList){
    let students = [];
    Classes.find({classID:allStudentsID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Add Student Error: All Students Class not found");
            client.emit("add-students-list-fail", 1);
            return;
        }
        const allStudentsClass = result[0];
        for(let i = 0; i < allStudentsClass.students.length; i++){
            for(let j = 0; j < studentList.length; j++){
                if(allStudentsClass.students[i].id === studentList[j]){
                    students.push(allStudentsClass.students[i]);
                    break;
                }
            }
        }
        if(students.length === 0){
            console.error("Add Student Error: Student IDs not found");
            client.emit("add-students-list-fail", 2);
        }
        else{
            removeFromUngrouped(client, students, ungroupedStudentsID);
            addStudentListReceive(client, students, receiveingClassID);
        }
    })
    .catch((error)=>{
        console.error("Add Student Error: " + error);
        client.emit("add-students-list-fail", 0);
    });
}
function removeFromUngrouped(client, students, ungroupedStudentsID){
    Classes.find({classID:ungroupedStudentsID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Remove Ungrouped Students Error: Ungrouped Students Class not found");
            client.emit("add-students-list-fail", 4);
            return;
        }
        const ungroupedStudentsClass = result[0];
        for(let i = ungroupedStudentsClass.students.length-1; i >= 0; i--){
            for(let j = 0; j < students.length; j++){
                if(ungroupedStudentsClass.students[i].id === students[j].id){
                    ungroupedStudentsClass.students.splice(i, 1);
                    break;
                }
            }
        }
        ungroupedStudentsClass.markModified("students");
        ungroupedStudentsClass.save()
        .catch((error)=>{
            console.error("Remove Ungrouped Students Error: " + error);
            client.emit("add-students-list-fail", 4);
        });
    })
    .catch((error)=>{
        console.error("Remove Ungrouped Students Error: " + error);
        client.emit("add-students-list-fail", 3);
    });
}
function addStudentListReceive(client, students, receiveingClassID){
    Classes.find({classID:receiveingClassID})
    .then((result)=>{
        if(result.length === 0){
            console.error("Add list Students to Class Error: Receiving Class not found");
            client.emit("add-students-list-fail", 6);
            return;
        }
        const receivingClass = result[0];
        for(let i = 0; i < students.length; i++){
            let studentAlreadyInClass = false;
            for(let j = 0; j < receivingClass.students.length; j++){
                if(students[i].id === receivingClass.students[j].id){
                    studentAlreadyInClass = true;
                    break;
                }
            }
            if(!studentAlreadyInClass){
                receivingClass.students.push(students[i]);
            }
        }
        receivingClass.markModified("students");
        receivingClass.save()
        .then(()=>{client.emit("add-students-list-success")})
        .catch((error)=>{
            console.error("Add List Students to Class Error: " + error);
            client.emit("add-students-list-fail", 7);
        });
    })
    .catch((error)=>{
        console.error("Add list Students to Class Error: " + error);
        client.emit("add-students-list-fail", 5);
    });
}

/*--AI Functions-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function analyzeCEFR(client, text){
    if(!text.trim()) return null;
    const systemPrompt = `
        You are a CEFR analysis engine. You will evaluate a provided English text based on the CEFR language proficiency framework.

        Return a JSON object with:
        - "totalLevel": The estimated overall CEFR level (A1, A2, B1, B2, C1, or C2).
        - "components": {
            "vocabulary": {
                "level": string (A1-C2),
                "distribution": { "A1": number, "A2": number, "B1": number, "B2": number, "C1": number, "C2": number }
            },
            "grammar": {
                "level": string (A1-C2),
                "distribution": { "A1": number, "A2": number, "B1": number, "B2": number, "C1": number, "C2": number },
                "features": string[] (e.g. ["present simple", "past perfect", "passive voice"])
            },
            "syntax": {
                "level": string (A1-C2),
                "distribution": { "A1": number, "A2": number, "B1": number, "B2": number, "C1": number, "C2": number },
                "features": string[] (e.g. ["compound sentences", "relative clauses"])
            }
        }
        Only return the JSON object and nothing else. Do not include commentary.
    `;

    const userPrompt = `Analyze this text for CEFR level:\n\n"${text}"`;
    const response = await openAI.chat.completions.create({
        model:"gpt-4o",
        messages:[
            {role:"system", content:systemPrompt},
            {role:"user", content:userPrompt}
        ]
    });

    try{
        const output = response.choices[0].message.content.trim();
        client.emit("cefr-analysis", output);
    }
    catch(error){
        console.error("Failed to parse CEFR JSON:", error);
        client.emit("cefr-read-error", 3);
        return null;
    }
}
async function generateAssignmentPrompt(settings){
    const {format, name, theme, questionNum, answerNum, notes, questionLevel, type, files, selectedIDs, userID} = settings;
    let fileContent = "";
    for(let i = 0; i < files.length; i++){
        const fileText = await extractTextFromFile(files[i]);
        if(fileText !== null) fileContent += `\n\n---\nContent from ${files[i].name}:\n${fileText}`;
    }
    let driveContent = "";
    for(let i = 0; i < selectedIDs.length; i++){
        const fileText = await extractTextFromDriveFile(userID, selectedIDs[i]);
        if(fileText !== null) driveContent += `\n\n---\nContent from drive file:\n${fileText}`;
    }
    
    const noteText = notes ? `Additional notes: ${notes}` : "";
    let referenceContent = "";
    for(const url of settings.urls){
        const content = await extractTextFromURL(url);
        if(content) referenceContent += `\n\n---\nReference from ${url}:\n${content}`;
    }
    switch(format){
        default: return `Unsupported format: ${format}`;
        case "Essay":
            return `
                You are an educational AI. Generate a JSON object with this structure:
                {
                    name: "...",
                    format: "Essay",
                    assignmentType: "${type}",
                    content: "..."
                }
                Generate an assignment titled "${name}", where the student is required to write an essay on the theme: "${theme}".
                ${noteText}
                Use the following reference material to inform the assignment:
                ${referenceContent}
                Use the following material from uploaded files to inform the assignment:
                ${fileContent}
                Use the following material from drive files to inform the assignment:
                ${driveContent}
            `;
        case "ABC Question":
            return `
                You are an educational AI. Generate a JSON object with this structure:
                {
                    name: "...",
                    format: "ABC Question",
                    assignmentType: "${type}",
                    questionNum: ...,
                    answerNum: ...,
                    questionLevel: "...",
                    questions: [
                        { text: "...", answers: ["...", "...", ...], correct: "..." },
                        ...
                    ]
                }

                Generate ${questionNum} multiple-choice questions on the theme: "${theme}", with ${answerNum} answers per question.
                Randomize the order of the answers. Do NOT always place the correct answer first.
                IMPORTANT: Vary the correct answer positions across questions. The correct answer should sometimes be first, sometimes second, etc.
                Try to balance the positions across all questions so the correct answer does not appear most often in one place.
                Use the field "correct" (a number like 0, 1, 2, etc.) to mark which option is correct **based on the shuffled array**.
                The assignment should be titled "${name}".
                CEFR Level: "${questionLevel}". 
                ${noteText}
                Use the following reference material to inform the assignment:
                ${referenceContent}
                Use the following material from uploaded files to inform the assignment:
                ${fileContent}
                Use the following material from drive files to inform the assignment:
                ${driveContent}
            `;
        case "Question and Answer":
            return `
                You are an educational AI. Generate a JSON object with this structure:
                {
                    name: "...",
                    format: "Question and Answer",
                    assignmentType: "${type}",
                    questionNum: ...,
                    questionLevel: "...",
                    questions: [
                        { text: "..." },
                        ...
                    ]
                }

                Generate ${questionNum} short-answer questions about: "${theme}".
                The assignment should be called "${name}".
                CEFR Level: "${questionLevel}". 
                ${noteText}
                Use the following reference material to inform the assignment:
                ${referenceContent}
                Use the following material from uploaded files to inform the assignment:
                ${fileContent}
                Use the following material from drive files to inform the assignment:
                ${driveContent}
            `;
    }
}
async function extractTextFromURL(url){
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);;
}
async function extractTextFromFile(fileData){
    const buffer = Buffer.from(fileData.buffer);
    let text = "";
    if(fileData.type === "text/plain" || fileData.name.endsWith(".txt")){
        text = buffer.toString("utf8");
    }
    else if(fileData.type === "application/pdf"){
        const data = await pdfParse(buffer);
        text = data.text;
    }
    else if(fileData.name.endsWith(".docx")){
        const result = await mammoth.extractRawText({buffer});
        console.log(result)
        text = result.value;
    }
    else text = null;
    return text;
}
async function extractTextFromDriveFile(userID, fileId){
    try{
        const result = await Users.find({userID:userID});
        if(result.length === 0){
            console.error("Find user DB error: User not found");
            return null;
        }

        const foundUser = result[0];
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );
        oauth2Client.setCredentials({refresh_token:foundUser.googleRefreshToken});
        await oauth2Client.getAccessToken();

        const drive = google.drive({version:"v3", auth:oauth2Client});
        const metadata = await drive.files.get({fileId, fields:"mimeType"});
        const mimeType = metadata.data.mimeType;

        const res = await drive.files.get({fileId, alt:"media"}, {responseType:"arraybuffer"});
        const buffer = Buffer.from(res.data);
        let textContent = "";

        if(mimeType.startsWith("text/")) textContent = buffer.toString("utf8");
        else if(mimeType === "application/pdf"){
            const pdfData = await pdfParse(buffer);
            textContent = pdfData.text;
        }
        else if(mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
            const result = await mammoth.extractRawText({buffer});
            textContent = result.value;
        }
        else{
            console.error("Unsupported file type for CEFR analysis");
            return null;
        }
        if(!textContent.trim()){
            console.error("No readable text found");
            return null;
        }
        return textContent;
    }
    catch(error){
        console.error("Reading Drive error: ", error);
        return null;
    }
}
async function extractTextFromImage(buffer){
    const [result] = await visionClient.textDetection({image:{content:buffer}});
    const detections = result.textAnnotations;
    if(detections.length > 0) return detections[0].description;
    return "";
}




















































/*
async function setupStripeProduct() {
    const product = await stripe.products.create({
        name: 'Advanced Subscription',
        description: 'Advanced subscription to MyEasyClass.',
    });

    const price = await stripe.prices.create({
        unit_amount: 2500,  // $15.00
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id,
    });

    console.log('Product ID:', product.id);
    console.log('Price ID:', price.id);
}

setupStripeProduct();
*/
































/*--Setup Zoom Services------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--Zoom API-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const jwt = require('jsonwebtoken');
const { file } = require("googleapis/build/src/apis/file");

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