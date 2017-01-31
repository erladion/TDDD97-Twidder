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

    loginForm.setAttribute('onsubmit', "checkLoginForm(this); return false;");
    signupForm.setAttribute('onsubmit', "checkSignupForm(this); return false;");
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

}

function changePassword(formData){
    if (!checkPassLength(formData.newpass.value)){
        alert("The password is too short. It needs to be at least 8 characters.");
        return;
    }
    else if (formData.newpass.value != formData.newpassag.value){
        alert("The passwords do not match!");
        return;
    }
    var answer = serverstub.changePassword(localStorage.getItem("token"),formData.oldpass.value,formData.newpass.value);
    if(!answer.success){
        alert(answer.message);
    }
}

function changeView(view){
        document.getElementById("content").innerHTML = document.getElementById(view + "view").innerHTML;
}

function logout(){
    serverstub.signOut(localStorage.getItem("token"));
    localStorage.removeItem("token");
    changeView("welcome");
}

var changeTab = function(tabName){
    var tabContent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabContent.length; i++){
        tabContent[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";

}

function checkLoginForm(formData){
    if (!checkPassLength(formData.loginpass.value)){
        alert("The password is too short. It needs to be at least 8 characters.");
        return;
    }
    var loginAnswer = serverstub.signIn(formData.loginemail.value, formData.loginpass.value);
        alert(loginAnswer.message);
        alert(loginAnswer.data);
    if(!loginAnswer.success){
        alert(loginAnswer.message);
    }
    else{
        localStorage.setItem("token",loginAnswer.data);
        changeView("profile");
        attachHandlersHome();
    }
}

var checkSignupForm = function(formData){
    if (!checkPassLength(formData.pass.value)){
        alert("The password is too short. It needs to be at least 8 characters.");
        return;
    }
    else if (formData.pass.value != formData.passag.value){
        alert("The passwords do not match!");
        return;
    }
    var signupData = {
        email: formData.email.value,
        password: formData.pass.value,
        firstname:formData.firnam.value,
        familyname:formData.famnam.value,
        gender:formData.gender.value,
        city:formData.city.value,
        country:formData.country.value
    };

    var returnData = serverstub.signUp(signupData);
    if (!returnData.success){
        alert(returnData.message);
    }
    else{
        alert(returnData.message);
    }
}

var checkPassLength = function(password){
    return (password.length > 7);
}

window.onload = function(){
 //code that is executed as the page is loaded.
 //You shall put your own custom code here.
 //window.alert() is not allowed to be used in your implementation.
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
