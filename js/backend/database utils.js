/*const mongoose = require("mongoose");

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

module.exports = { mongoose, Users, Classes };*/