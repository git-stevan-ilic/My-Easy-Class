/*const { Users, Classes } = require("./database utils");
const { nanoid } = require("nanoid");

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

module.exports = { getClassData, createClass, addStudent };

















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
*/