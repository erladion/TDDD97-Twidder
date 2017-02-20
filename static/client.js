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
    var data = serverstub.getUserDataByEmail(localStorage.getItem("token"), email);
    if (data.success) {
        localStorage.setItem("searchemail",email);
        showUserInfo(email, "searchinfo");
        listAllMessages(true);
    }
    else {
        document.getElementById("searcherror").innerHTML = data.message;
    }
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
    var answer = serverstub.changePassword(localStorage.getItem("token"),formData.oldpass.value,formData.newpass.value);
    if(!answer.success){
        document.getElementById("changepasserror").innerHTML = answer.message;
    }
    else{
        document.getElementById("oldpass").reset();
        document.getElementById("newpass").reset();
        document.getElementById("newpassag").reset();
        cleanErrors();
        document.getElementById("changepasserror").innerHTML = "Password changed successfully";
    }
}

function changeView(view, email){
    document.getElementById("content").innerHTML = document.getElementById(view + "view").innerHTML;
    if(view == "profile") {
        showUserInfo(email, "personalinfo");
        listAllMessages(email);
    }
}

function logout(){
    serverstub.signOut(localStorage.getItem("token"));
    localStorage.removeItem("token");
    changeView("welcome");
    attachHandlersLogin();
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

function checkLoginForm(formData){
    if (!checkPassLength(formData.loginpass.value)){
        document.getElementById("loginerror").innerHTML = "The password is too short. It needs to be at least 8 characters.";
        return;
    }
    var loginAnswer = serverstub.signIn(formData.loginemail.value, formData.loginpass.value);
    if(!loginAnswer.success){
        document.getElementById("loginerror").innerHTML = loginAnswer.message;
    }
    else{
        localStorage.setItem("token",loginAnswer.data);
        localStorage.setItem("email", formData.loginemail.value);
        changeView("profile", formData.loginemail.value);
        changeTab("home");
        attachHandlersHome();
    }
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
            }
            else{
                 var loginAnswer = serverstub.signIn(formData.email.value, formData.pass.value);

                localStorage.setItem("token",loginAnswer.data);
                localStorage.setItem("email", formData.email.value);
                changeView("profile");
                changeTab("home");
                attachHandlersHome();
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
    data.append('pass', formData.pass.value);
    xhttp.send(data);
}

var showUserInfo = function(email, areaName){
    email = email || localStorage.getItem("email");
    var info = serverstub.getUserDataByEmail(localStorage.getItem("token"), email);
    if (info.success) {
        var infoArea = document.getElementById(areaName);

        infoArea.innerHTML = "First name: " + info.data.firstname + "</br>" +
        "Family name: " + info.data.familyname + "</br>" +
        "Gender: " + info.data.gender + "</br>" +
        "Email: " + info.data.email + "</br>" +
        "City: " + info.data.city + "</br>" +
        "Country: " + info.data.country;
    }
    else{
        document.getElementById("posterror").innerHTML = info.message;
    }
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
    var post = serverstub.postMessage(localStorage.getItem("token"), messageToPost, email);
    listAllMessages(searcharea);
    document.getElementById(posttext).value = "";
    cleanErrors();
}

var listAllMessages = function(searcharea){
    var email = (searcharea ? localStorage.getItem("searchemail") : localStorage.getItem("email"));
    var msgArea = (searcharea ? "searchmessages" : "messages");
    var messages = serverstub.getUserMessagesByEmail(localStorage.getItem("token"),email);
    var messageArea = document.getElementById(msgArea);
    messageArea.innerHTML = "";
    for(var i = 0; i < messages.data.length; i++){
        messageArea.innerHTML += messages.data[i].writer + "</br>" + "<div class=\"postedmessage\">" + messages.data[i].content.replace(/</g,"&lt") + "</div></br>";
    }
    cleanErrors();
}

var checkPassLength = function(password){
    return (password.length > 7);
}

window.onload = function(){
    if(localStorage.getItem("token") != null){
        changeView("profile");
        attachHandlersHome();
        changeTab("home");
    }
    else{
        changeView("welcome");
        attachHandlersLogin();
    }
};
