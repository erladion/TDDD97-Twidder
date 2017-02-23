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


}

function cleanErrors(){
    var errors = document.getElementsByClassName("errormessage");
    for (var i = 0; i < errors.length; i++){
        errors[i].innerHTML = "";
    }
}

function search(email){
    if (email == ""){
        document.getElementById("searcherror").innerHTML = "Please enter a user email";
        return;
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            console.log(xhttp.responseText);
            if (returnData.success) {
                document.getElementById("searchmessagearea").style.visibility = "visible";
                document.getElementById("searchinfo").style.visibility = "visible";
                localStorage.setItem("searchemail",email);
                showUserInfo(email, "searchinfo");
                listAllMessages(true);
            }
            else {
                document.getElementById("searcherror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("get_user_data_by_email", {'user_email': email, 'token': localStorage.getItem("token")});
    xhttp.open("GET", url, true);
    xhttp.send();
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
    xhttp.send(data);
}

function changeView(view, email){
    document.getElementById("content").innerHTML = document.getElementById(view + "view").innerHTML;
    if(view == "profile") {
        showUserInfo(email, "personalinfo");
        listAllMessages(email);
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

function createSocket(token) {
    var newSocket = new WebSocket("ws://127.0.0.1:5000/websocket")
    newSocket.onopen = function () {
        newSocket.send(JSON.stringify({'messageType': 'token', 'token': token}))
    }
    newSocket.onmessage = function (event) {
        var returnData = JSON.parse(event.data)
        if (returnData.messageType == 'logout') {
            localStorage.removeItem("token");
            changeView("welcome");
            attachHandlersLogin();
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
                createSocket(returnData.data);
            }
        }
    }
    xhttp.open("POST", "signin", true);
    var data = new FormData();
    data.append('email', email);
    data.append('password', password);
    xhttp.send(data);

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

var showUserInfo = function(email, areaName){
    email = email || localStorage.getItem("email");

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var returnData = JSON.parse(xhttp.responseText);
            console.log(xhttp.responseText);
            if (returnData.success) {
                var infoArea = document.getElementById(areaName);

                infoArea.innerHTML = "First name: " + returnData.data.firstname + "</br>" +
                "Family name: " + returnData.data.familyname + "</br>" +
                "Gender: " + returnData.data.gender + "</br>" +
                "Email: " + returnData.data.email + "</br>" +
                "City: " + returnData.data.city + "</br>" +
                "Country: " + returnData.data.country;
            }
            else{
                document.getElementById("posterror").innerHTML = returnData.message;
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("get_user_data_by_email", {'user_email': email, 'token': localStorage.getItem("token")});
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
    console.log(route);
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
    xhttp.open("POST", "post_message", true);
    var data = new FormData();
    data.append('token',localStorage.getItem("token"));
    data.append('message',messageToPost);
    data.append('email', email);
    xhttp.send(data);
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
            console.log(xhttp.responseText);
            if (returnData.success) {
                for(var i = returnData.data.length - 1; i >= 0; i--){
                    messageArea.innerHTML += returnData.data[i].writer + "</br>" + "<div class=\"postedmessage\">" + returnData.data[i].content.replace(/</g,"&lt") + "</div></br>";
                }
                cleanErrors();
            }
            else{
                logOutIfNotLoggedIn(returnData.message);
            }
        }
    }
    var url = createGetURL("get_user_messages_by_email", {'user_email': email, 'token': localStorage.getItem("token")});
    xhttp.open("GET", url, true);
    xhttp.send();

}

var checkPassLength = function(password){
    return (password.length > 7);
}

window.onload = function(){
    if(localStorage.getItem("token") != null){
        createSocket(localStorage.getItem("token"));
        changeView("profile");
        attachHandlersHome();
        changeTab("home");
    }
    else{
        changeView("welcome");
        attachHandlersLogin();
    }
};
