# coding: utf8
from flask import Flask
from flask import request
import database_helper
import json
import os

app = Flask(__name__)

@app.route("/signup", methods=['POST'])
def signup():
    firstname = request.form['firnam']
    familyname = request.form['famnam']
    email = request.form['email']
    gender = request.form['gender']
    country = request.form['country']
    city = request.form['city']
    password = request.form['pass']
    if len(password) < 8:
        return json.dumps({'success': False, 'message': 'The password is too short'})
    if database_helper.check_email(email):
        return json.dumps({'success': False, 'message': 'A user with that email already exists'})
    database_helper.create_user(firstname, familyname, email, gender, country, city, password)
    return json.dumps({'success': True, 'message': 'All went well'})

@app.route("/signin", methods=["post"])
def signin():
    email = request.form["email"]
    password = request.form["password"]
    data = database_helper.get_password(email)
    if data is None:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    if data is not password:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    token = database_helper.get_token(email)
    if token is not None:
        return json.dumps({'success': True, 'message': 'Already logged in', 'data': token})
    else:
        token = os.urandom(32)
        database_helper.insert_token(email,token)
        return json.dumps({'success': True, 'message': 'Successfully logged in', 'data': token})

@app.route("/signout", methods=["post"])
def signout():
    database_helper.remove_token()
    return json.dumps({'success': True, 'message': 'The user was logged out'})

@app.route("/change_password", methods=["post"])
def change_password():
    oldPassword = request.form["oldpass"]
    newPassword = request.form["newpass"]
    token = request.form["token"]

    if len(newPassword) < 8:
        return json.dumps({'success': False, 'message': 'The password is too short'})

    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        if database_helper.get_password(email) == oldPassword:
            database_helper.change_password(email, newPassword)
            return json.dumps({'success': True, 'message': 'Password was changed successfully'})
        else:
            return json.dumps({'success': False, 'message': 'Wrong password'})

@app.route("/get_user_data_by_token", methods=["get"])
def get_user_data_by_token():
    token = request.form["token"]
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_data_by_email", methods=["get"])
def get_user_data_by_email():
    token = request.form["token"]
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        user_email = request.form["email"]
        data = database_helper.get_user(user_email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_messages_by_token", methods=["get"])
def get_user_messages_by_token():
    token = request.form["token"]
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_messages(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_messages_by_email", methods=["get"])
def get_user_messages_by_email():
    token = request.form["token"]
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        user_email = request.form["email"]
        data = database_helper.get_messages(user_email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/post_message", methods=["post"])
def post_message():
    token = request.form["token"]
    message = request.form["message"]
    email = request.form["email"]
    if database_helper.check_email(email) is False:
        return json.dumps({'success': False, 'message': 'User does not exist!'})
    senderEmail = database_helper.get_email(token)

    #
    # CONTINUE HERE
    #
    #

    if message is "":
        return json.dumps({'success':False, 'message': 'Message cannot be empty'})
    else:



if __name__ == '__main__':
    app.run()
