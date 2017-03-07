/**
 * Created by johja118 on 2017-01-24.
 */

displayView = function(){
 // the code required to display a view
    // do some fancy stuff here
};

var attachHandlersLogin = function(){
    var loginForm = document.getElementById("loginForm");
    var signupForm = document.getElementById("signupForm");
    var loginButton = document.getElementById("loginbutton");
    var signupButton = document.getElementById("signupbutton");

    loginButton.addEventListener('click', function() {checkLoginForm(loginForm);});
    signupButton.addEventListener('click', function() {checkSignupForm(signupForm);});
}

var attachHandlersHome = function(){

    var homeTab = document.getElementById("homeButton");
    var browseTab = document.getElementById("browseButton");
    var accountTab = document.getElementById("accountButton");

    var changePassForm = document.getElementById("changePassForm");
    var logoutButton = document.getElementById("logoutbutton")

    var uploadImgButton = document.getElementById("uploadImgButton");
    var uploadImgForm = document.getElementById("uploadImgForm");
    var uploadVidButton = document.getElementById("uploadVidButton");
    var uploadVidForm = document.getElementById("uploadVidForm");

    uploadImgButton.addEventListener("click", function() {uploadMedia(uploadImgForm, "image");});
    uploadVidButton.addEventListener("click", function() {uploadMedia(uploadVidForm, "video");});

    homeTab.addEventListener("click", function() {changeTab("home");});
    browseTab.addEventListener("click", function() {changeTab("browse");});
    accountTab.addEventListener("click", function() {changeTab("account");});

    changePassForm.setAttribute("onsubmit", "changePassword(this); return false;");
    logoutButton.addEventListener("click", function() {logout();});

    var postButton = document.getElementById("postbutton");
    var refreshButton = document.getElementById("refreshbutton");

    var searchPostButton = document.getElementById("searchpostbutton");
    var searchRefreshButton = document.getElementById("searchrefreshbutton");

    searchPostButton.addEventListener("click", function() {postMessage(true);});
    postButton.addEventListener("click", function() {postMessage(false);});
    searchRefreshButton.addEventListener("click", function() {listAllMessages(true);});
    refreshButton.addEventListener("click", function() {listAllMessages(false);});

    var searchButton = document.getElementById("searchbutton");

    searchButton.addEventListener("click", function() { search(document.getElementById("emailbox").value);});

    // We create a pie chart to show views on the user's profile page
    var pieChart = document.getElementById("piechart");
    var data = {
        labels: [
            "Male",
            "Female"
        ],
        datasets: [
            {
                data: [0, 0],
                backgroundColor: [
                    "#5cf442",
                    "#ff0000"
                ]
            }]
    }
    // Here we save the actual chart to be able to modify it later
    myPieChart = new Chart(pieChart,{
        type: 'pie',
        data: data,
        options: {
            responsive: false
        }
    });
    pieChart.width = 200;
    pieChart.height = 200;

}

var myPieChart;

function updateChart(data){
    // We update the pie chart with the data received from the server
    myPieChart.data.datasets[0].data = data;
    myPieChart.update();
}

function cleanErrors(){
    var errors = document.getElementsByClassName("errormessage");
    for (var i = 0; i < errors.length; i++){
        errors[i].innerHTML = "";
    }
}

function search(email){
    showUserInfo(email, "searchinfo");
    listAllMessages(true);
}

function changePassword(formData){
    if (!checkPassLength(formData.newpass.value)){
        document.getElementById("changepasserror").innerHTML = "The password is too short. It needs to be at least 8 characters.";
        return;
    }
    else if (formData.newpass.value != formData.newpassag.value){
        document.getElementById("changepasserror").innerHTML = "The passwords do not match!";
        return;
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if(!returnData.success){
                document.getElementById("changepasserror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
            else{
                document.getElementById("changePassForm").reset();
                cleanErrors();
                document.getElementById("changepasserror").innerHTML = "Password changed successfully";
            }
        }
    }
    xhttp.open("POST", "change_password", true);
    var data = new FormData();
    data.append('token', localStorage.getItem("token"));
    data.append('newpass', formData.newpass.value);
    data.append('oldpass', formData.oldpass.value);
    data.append('hash', hashBlob(formData.oldpass.value + formData.newpass.value));
    xhttp.send(data);
}

function changeView(view, email){
    document.getElementById("content").innerHTML = document.getElementById(view + "view").innerHTML;
    if(view == "profile") {
        showUserInfo(email, "personalinfo");
        listAllMessages(email);
        getMediaList(email, "medialist");
    }
}

function logout(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            localStorage.removeItem("token");
            changeView("welcome");
            attachHandlersLogin();
        }
    }
    xhttp.open("POST", "signout", true);
    var data = new FormData();
    data.append('token', localStorage.getItem("token"));
    xhttp.send(data);
}

var changeTab = function(tabName, email){
    email = email || localStorage.getItem("email");
    var tabContent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabContent.length; i++){
        tabContent[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";
    cleanErrors();
}
print = console.log;
function createSocket(token, key) {
    var newSocket = new WebSocket("ws://127.0.0.1:5000/websocket")
    newSocket.onopen = function () {
        newSocket.send(JSON.stringify({'messageType': 'token', 'token': token, 'key': key}));

    }
    newSocket.onmessage = function (event) {
        var returnData = JSON.parse(event.data)
        if (returnData.messageType == 'logout') {
            localStorage.removeItem("token");
            changeView("welcome");
            attachHandlersLogin();
        }
        else if(returnData.messageType == 'login'){
            changeView("profile");
            attachHandlersHome();
            changeTab("home");
        }
        // Here are the three possible updates of our live presentation
        // We have one messagetype for each type of data to update
        // The views updates our chart, while the others simply update a text field
        else if(returnData.messageType == 'views'){
            updateChart(returnData.message);
        }
        else if(returnData.messageType == 'totalUsers'){
            document.getElementById("totalusers").innerHTML = "Total users registered: "+ returnData.message;
        }
        else if(returnData.messageType == 'loggedInUsers'){
            document.getElementById("loggedinusers").innerHTML = "Amount of users logged in: " + returnData.message;
        }
    }
}
function login(email, password){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (!returnData.success){
                document.getElementById("loginerror").innerHTML = returnData.message;
            }
            else{
                localStorage.setItem("token", returnData.data.token);
                localStorage.setItem("private_key", returnData.data.key);
                localStorage.setItem("email", email);
                changeView("profile");
                changeTab("home");
                attachHandlersHome();
                createSocket(returnData.data.token, returnData.data.key);
            }
        }
    }
    xhttp.open("POST", "signin", true);
    var data = new FormData();
    data.append('email', email);
    data.append('password', password);
    xhttp.send(data);
}

function getMediaList(email, areaName){
    email = email || localStorage.getItem("email");
    print(email);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success) {
                var infoArea = document.getElementById(areaName);
                infoArea.innerHTML = "";
                print(returnData.data);
                // We go through the list of names we get and create buttons/links to each one
                for (filename in returnData.data) {
                    filename  = returnData.data[filename];
                    print(filename);
                    infoArea.innerHTML += "<button onclick='loadMedia(\"" + filename[0] + "\", " +
                    "\"" + email + "\", \"" + filename[1] + "\");'>" + filename[0] + "</button></br>";
                }
            }
            else{
                document.getElementById("posterror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("show_media", {
        'user_email': email, 'token': localStorage.getItem("token"), 'hash': hashBlob(email)});
    xhttp.open("GET", url, true);
    xhttp.send();
}

function loadMedia(filename, email, filetype){
    print(filename);
    var vid = document.getElementById("video");
    var img = document.getElementById("image");
    var url = createGetURL("view_media", {
        'user_email': email, 'token': localStorage.getItem("token"), 'name': filename, 'hash': hashBlob(email+filename)});
    if (filetype == "image") {
        img.src = url;
        img.style.display = "block";
        vid.style.display = "none";
    }
    else{
        vid.src = url;
        vid.load();
        vid.style.display = "block";
        img.style.display = "none";

    }
}

function uploadMedia(formData, type){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success){
                getMediaList(localStorage.getItem("email"), "medialist");
            }
            else{

            }
        }
    }

    xhttp.open("POST", "upload_media", true);
    var data = new FormData();
    data.append('token',localStorage.getItem("token"));
    data.append('file', formData["upload_" + type].files[0]);
    data.append('filetype', type);
    data.append('hash', hashBlob(type))
    xhttp.send(data);
}

var mediaOn = false;

function toggleMedia(){
    mediaOn = !mediaOn;

    if (mediaOn){
        document.getElementById("mediaview").style.display = "block";
        document.getElementById("messagearea").style.display = "none";
    }
    else{
        document.getElementById("mediaview").style.display = "none";
        document.getElementById("messagearea").style.display = "block";
    }
}

function checkLoginForm(formData){
    if (!checkPassLength(formData.loginpass.value)){
        document.getElementById("loginerror").innerHTML = "The password is too short. It needs to be at least 8 characters.";
        return;
    }
    login(formData.loginemail.value, formData.loginpass.value);
}

var checkSignupForm = function(formData){
    if (!checkPassLength(formData.pass.value)){
        document.getElementById("signuperror").innerHTML = "The password is too short. It needs to be at least 8 characters.";
        return;
    }
    else if (formData.pass.value != formData.passag.value){
        document.getElementById("signuperror").innerHTML = "The passwords do not match!";
        return;
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (!returnData.success){
                document.getElementById("signuperror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
            else{
                login(formData.email.value, formData.pass.value);
            }
        }
    }

    xhttp.open("POST", "signup", true);
    var data = new FormData();
    data.append('firnam',formData.firnam.value);
    data.append('famnam',formData.famnam.value);
    data.append('gender',formData.gender.value);
    data.append('city',formData.city.value);
    data.append('country', formData.country.value);
    data.append('email', formData.email.value);
    data.append('password', formData.pass.value);
    xhttp.send(data);
}

// This function creates a hash based on the text in the 'blob' we send in as well as the token and the user's private key
// This hash is checked on the server to make sure we are the correct user
function hashBlob(blob){
    blob = blob + localStorage.getItem("token") + localStorage.getItem('private_key');
    blob = blob.replace(/\n/g,"");
    var hashed = CryptoJS.SHA512(blob);
    return hashed;
}

var showUserInfo = function(email, areaName){
    email = email || localStorage.getItem("email");

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success) {
                var infoArea = document.getElementById(areaName);

                infoArea.innerHTML = "First name: " + returnData.data.firstname + "</br>" +
                "Family name: " + returnData.data.familyname + "</br>" +
                "Gender: " + returnData.data.gender + "</br>" +
                "Email: " + returnData.data.email + "</br>" +
                "City: " + returnData.data.city + "</br>" +
                "Country: " + returnData.data.country;
                if(areaName == "searchinfo"){
                    document.getElementById("searchmessagearea").style.visibility = "visible";
                    document.getElementById("searchinfo").style.visibility = "visible";
                    localStorage.setItem("searchemail",email);
                }
            }
            else{
                document.getElementById("posterror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("get_user_data_by_email", {
        'user_email': email, 'token': localStorage.getItem("token"), 'hash': hashBlob(email)});
    xhttp.open("GET", url, true);
    xhttp.send();


}

function logOutIfNotLoggedIn(message){
    if(message == "User is not logged in"){
        localStorage.removeItem("token");
        changeView("welcome");
        attachHandlersLogin();
    }
}

function createGetURL(route,params){
    route += "?";
    for (param in params){
        route += param + "=" + params[param] + "&";
    }
    route = route.replace(/\+/g, '%2B');
    route = route.slice(0, -1);
    return route;
}

var postMessage = function(searcharea){
    var email = (searcharea ? localStorage.getItem("searchemail") : localStorage.getItem("email"));
    var posttext = (searcharea ? "searchposttext" : "posttext");
    var posterror = (searcharea ? "searchposterror" : "posterror");
    var messageToPost = document.getElementById(posttext).value;
    if (messageToPost == ""){
        document.getElementById(posterror).innerHTML = "Can't post messages that are emtpy!";
        return;
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success) {
                listAllMessages(searcharea);
                document.getElementById(posttext).value = "";
                cleanErrors();
            }
            else{
                document.getElementById(posterror).innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    messageToPost = messageToPost.replace(/\s+$/g,"")
    xhttp.open("POST", "post_message", true);
    var data = new FormData();
    data.append('token',localStorage.getItem("token"));
    data.append('message',messageToPost);
    data.append('email', email);
    data.append('hash', hashBlob(messageToPost + email));
    xhttp.send(data);
}

// This function is run on the message area to allow the mouse to drop items into it
function allowDrop(event){
    event.preventDefault();
    event.stopPropagation();
}

// This saves the message's text so we can drop it into the message area
function drag(event){
    event.dataTransfer.setData("text", event.target.innerHTML.replace(/<br>/g, ""));
}

// Here we add the saved message text to the message area
function drop(event){
    event.preventDefault();
    event.stopPropagation();
    event.target.value += event.dataTransfer.getData("text") + "\n";
}

var listAllMessages = function(searcharea){
    var email = (searcharea ? localStorage.getItem("searchemail") : localStorage.getItem("email"));
    var msgArea = (searcharea ? "searchmessages" : "messages");
    var messageArea = document.getElementById(msgArea);
    messageArea.innerHTML = "";

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success) {
                for(var i = returnData.data.length - 1; i >= 0; i--){
                    // We set the messages to draggable to allow them to be dragged (and copied) into the message area
                    messageArea.innerHTML += returnData.data[i].writer + "</br>" + "<div class=\"postedmessage\" draggable=\"true\" ondragstart=\"drag(event)\">" + returnData.data[i].content.replace(/</g,"&lt").replace(/\n/g,"<br>") + "</div></br>";
                }
                cleanErrors();
            }
            else{
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("get_user_messages_by_email", {
        'user_email': email, 'token': localStorage.getItem("token"), 'hash': hashBlob(email)});
    xhttp.open("GET", url, true);
    xhttp.send();

}

var checkPassLength = function(password){
    return (password.length > 7);
}

window.onload = function(){
    if(localStorage.getItem("token") != null){
        createSocket(localStorage.getItem("token"));
    }
    else{
        changeView("welcome");
        attachHandlersLogin();
    }
};
