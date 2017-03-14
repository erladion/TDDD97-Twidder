/**
 * Created by johja118 on 2017-01-24.
 */

print = console.log;

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

    homeTab.addEventListener("click", function() {page("/home");});
    browseTab.addEventListener("click", function() {page("/browse");});
    accountTab.addEventListener("click", function() {page("/account");});

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
    pieChart.width = 150;
    pieChart.height = 150;
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

    // Chart for showing the amount of users currently logged in
    var loggedInChart = document.getElementById("loggedinchart");
    loggedInChart.width = 150;
    loggedInChart.height = 150;
    var data2 = {
        labels: [
            "Logged In",
            "Logged Out"
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
    myLoggedInChart = new Chart(loggedInChart,{
        type: 'pie',
        data: data2,
        options: {
            responsive: false
        }
    });



}

var myPieChart;
var myLoggedInChart;

/**
 * Updates the view chart with given data
 */
function updateChart(data){
    // We update the pie chart with the data received from the server
    myPieChart.data.datasets[0].data = data;
    myPieChart.update();
}

/**
 * Updates the chart showing how many users are currently logged in
 */
function updateLoggedInChart(data){
    myLoggedInChart.data.datasets[0].data = [data[0], data[1]-data[0]];
    myLoggedInChart.update();
}

function cleanErrors(){
    var errors = document.getElementsByClassName("errormessage");
    for (var i = 0; i < errors.length; i++){
        errors[i].innerHTML = "";
    }
}

function search(email){
    localStorage.setItem("searchemail",email);
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
    data.append('email', localStorage.getItem("email"));
    data.append('newpass', formData.newpass.value);
    data.append('oldpass', formData.oldpass.value);
    var t = Date.now();
    data.append('time', t);
    data.append('hash', hashBlob(formData.oldpass.value + formData.newpass.value + localStorage.getItem("email") + t));
    xhttp.send(data);
}

function changeView(view, email){
    document.getElementById("content").innerHTML = document.getElementById(view + "view").innerHTML;
    if(view == "profile") {
        showUserInfo(email, "personalinfo");
        listAllMessages(false);
        getMediaList();
    }
}

function logout(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            localStorage.removeItem("token");
            page('/');
        }
    }
    xhttp.open("POST", "signout", true);
    var data = new FormData();
    data.append('email', localStorage.getItem("email"));
    var t = Date.now();
    data.append('time', t);
    data.append('hash', hashBlob(localStorage.getItem("email") + t));
    xhttp.send(data);
}

var changeTab = function(tabName){
    var tabContent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabContent.length; i++){
        tabContent[i].style.display = "none";
    }
    var tab = document.getElementById(tabName)
    if (tab != null) tab.style.display = "block";
    cleanErrors();
}

var socketCreated = false;
function createSocket(token, login) {
    if (socketCreated) return;
    socketCreated = true;
    var newSocket = new WebSocket("ws://127.0.0.1:5000/websocket")
    newSocket.onopen = function () {
        newSocket.send(JSON.stringify({'messageType': 'token', 'token': token}));

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
            // If we just logged in we redirect to the /home, otherwise we go to the given url
            if(login){
                page("/home");
            }else{
                var url = window.location.pathname.split('/');
                url = '/'+ url[1];
                page(url);
            }
        }
        // Here are the three possible updates of our live presentation
        // We have one messagetype for each type of data to update
        // The views updates our chart, while the others simply update a text field
        else if(returnData.messageType == 'views'){
            updateChart(returnData.message);
        }
        else if(returnData.messageType == 'loggedInStats'){
            updateLoggedInChart(returnData.message);
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
                localStorage.setItem("token", returnData.data);
                localStorage.setItem("email", email);
                changeView("profile");
                changeTab("home");
                attachHandlersHome();
                createSocket(returnData.data, true);
            }
        }
    }
    xhttp.open("POST", "signin", true);
    var data = new FormData();
    data.append('email', email);
    data.append('password', password);
    xhttp.send(data);
}

/**
 * Gets the files available to the user from the server and display them in a list
 */
function getMediaList(){
    email = localStorage.getItem("email");
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success) {
                var infoArea = document.getElementById("medialist");
                infoArea.innerHTML = "";
                // We go through the list of names we get and create buttons/links to each one
                for (filename in returnData.data) {
                    filename  = returnData.data[filename];
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
    var t = Date.now();
    var url = createGetURL("show_media", {
        'email': email, 'time': t,  'hash': hashBlob(email + t)});
    xhttp.open("GET", url, true);
    xhttp.send();
}

/**
 * Here we show the chosen file to the user, and hide the other "media type"
 */
function loadMedia(filename, email, filetype){
    var vid = document.getElementById("video");
    var img = document.getElementById("image");
    var t = Date.now();
    var url = createGetURL("view_media", {
        'email': localStorage.getItem("email"), 'name': filename, 'time': t, 'hash': hashBlob(filename + localStorage.getItem("email")+ t)});
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

/**
 * Upload the chosen file to the server and update the medialist
 */
function uploadMedia(formData, type){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            if (returnData.success){
                getMediaList();
            }
        }
    }
    if (formData["upload_" + type].files[0] == null)
        return;
    xhttp.open("POST", "upload_media", true);
    var data = new FormData();
    data.append('email',localStorage.getItem("email"));
    data.append('file', formData["upload_" + type].files[0]);
    data.append('filetype', type);
    var t = Date.now();
    data.append('time', t);
    data.append('hash', hashBlob(type + localStorage.getItem("email")+t))
    xhttp.send(data);
    // Magic to reset chosen file
    document.getElementById("upload_" + type).parentNode.innerHTML = document.getElementById("upload_" + type).parentNode.innerHTML;
}

/**
 * Toggle between the message and media view
 */
var mediaOn = false;
function toggleMedia(){
    mediaOn = !mediaOn;

    if (mediaOn){
        document.getElementById("mediaview").style.display = "block";
        document.getElementById("messagearea").style.display = "none";
        document.getElementById("mediabutton").innerHTML = "Messages";
    }
    else{
        document.getElementById("mediaview").style.display = "none";
        document.getElementById("messagearea").style.display = "block";
        document.getElementById("mediabutton").innerHTML = "Media";
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


/**
 * This function creates a hash based on the text in the 'blob' we send in as well as the token and the user's private key
 * This hash is checked on the server to make sure we are the correct user
 */
function hashBlob(blob){
    blob = blob + localStorage.getItem("token");
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
                }
            }
            else{
                document.getElementById("posterror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var t = Date.now();
    var url = createGetURL("get_user_data_by_email", {
        'user_email': email, 'email': localStorage.getItem("email"),'time': t, 'hash': hashBlob(email + localStorage.getItem("email")+t)});
    xhttp.open("GET", url, true);
    xhttp.send();


}

function logOutIfNotLoggedIn(message){
    if(message == "User is not logged in"){
        localStorage.removeItem("token");
        page('/');
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
    data.append('email',localStorage.getItem("email"));
    data.append('message',messageToPost);
    data.append('user_email', email);
    var t = Date.now();
    data.append('time', t);
    data.append('hash', hashBlob(messageToPost + email + localStorage.getItem("email")+ t));
    xhttp.send(data);
}
/**
 * This function is run on the message area to allow the mouse to drop items into it
 */
function allowDrop(event){
    event.preventDefault();
    event.stopPropagation();
}

/**
 * This saves the message's text so we can drop it into the message area
 */
function drag(event){
    event.dataTransfer.setData("message", event.target.childNodes[1].innerHTML.replace(/<br>/g, ""));
    event.dataTransfer.setData("writer", event.target.childNodes[0].innerHTML.replace(/<br>/g, ""));
}

/**
 * Here we add the saved message text to the message area
 */
function drop(event){
    event.preventDefault();
    event.stopPropagation();
    event.target.value += "\"" + event.dataTransfer.getData("message") + "\"\n - " + event.dataTransfer.getData("writer") + "\n";
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
                    messageArea.innerHTML += "<div draggable=\"true\" ondragstart=\"drag(event)\"><div>" + returnData.data[i].writer + "</div><div class=\"postedmessage\">" + returnData.data[i].content.replace(/</g,"&lt").replace(/\n/g,"<br>") + "</div></div></br>";
                }
                cleanErrors();
            }
            else{
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var t = Date.now();
    var url = createGetURL("get_user_messages_by_email", {
        'user_email': email, 'email': localStorage.getItem("email"), 'time': t, 'hash': hashBlob(email + localStorage.getItem("email")+t)});
    xhttp.open("GET", url, true);
    xhttp.send();

}

var checkPassLength = function(password){
    return (password.length > 7);
}

// Functions for url redirection
page('/', function(){
    if (localStorage.getItem("token") != null)
        page('/home');
    else {
        socketCreated = false;
        changeView("welcome");
        attachHandlersLogin();
    }
});

page('/home', function(){
    changeTab("home");
});

page('/account', function(){
    changeTab("account");
});

page('/browse', function(){
    changeTab("browse");
});

var startUp = function(){
    if(localStorage.getItem("token") != null){
        createSocket(localStorage.getItem("token"));
    }
    else{
        page('/');
    }
};
startUp();
page.start();

window.onload = startUp;
