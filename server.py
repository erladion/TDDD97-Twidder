# coding: utf8
from flask import Flask
from flask import request
from gevent.wsgi import WSGIServer
from geventwebsocket import WebSocketServer, WebSocketApplication, WebSocketError, Resource
from geventwebsocket.handler import WebSocketHandler
import database_helper
import json
import os
import base64
import re

app = Flask(__name__, static_url_path='')

wslist = {}

class TwidderApp(WebSocketApplication):
    def on_open(self):
        print("Hello, this is a new socket!")

    def on_message(self,message):
        message = json.loads(message)
        if(message['messageType'] == "token"):
            wslist[message['token']] = self.ws



    def on_close(self):
        print("Bye, socket is now dying!")

@app.route('/websocket')
def handle_websocket():
    wsock = request.environ.get('wsgi.websocket')
    if not wsock:
        print("fail")
        return
    while True:
        message = wsock.receive()
        print(type(message))
        if not message:
            continue
        obj = json.loads(message)
        print(type(obj))
        print(obj)
        if(obj['messageType'] == "token"):
            wslist[obj['token']] = wsock




@app.route("/", methods=['GET'])
def default():
    return app.send_static_file('client.html')
@app.route("/signup", methods=['POST'])
def signup():
    firstname = request.form['firnam']
    familyname = request.form['famnam']
    email = request.form['email']
    gender = request.form['gender']
    country = request.form['country']
    city = request.form['city']
    password = request.form['password']

    if(firstname == "" or familyname == "" or email == "" or gender == "" or country == "" or city == ""):
        return json.dumps({'success': False, 'message': 'Not all fields are filled'})
    if(gender != "Male" and gender != "Female"):
        return json.dumps({'success': False, 'message': 'The gender is not valid'})

    res = re.search("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",email)
    if(not res):
        return json.dumps({'success': False, 'message': 'That is not a valid email address'})
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
    print(data)
    print(password)
    if data is None:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    if data != password:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    token = database_helper.get_token(email)
    print(token)
    if token is not None:
        database_helper.remove_token(token)
        if(token in wslist):
            wslist[token].send(json.dumps({'messageType': 'logout', 'message': "You just got logged out!"}))
            wslist[token].close()
            wslist.pop(token)


    token = os.urandom(32)
    token = base64.b64encode(token).decode('utf-8)')
    print(token)
    database_helper.insert_token(email, token)
    return json.dumps({'success': True, 'message': 'Successfully logged in', 'data': token})

@app.route("/signout", methods=["post"])
def signout():
    token = request.form["token"]
    if(database_helper.get_email(token)):
        database_helper.remove_token(token)
        if token in wslist:
            wslist.pop(token)
        return json.dumps({'success': True, 'message': 'The user was logged out'})
    else:
        return json.dumps({'success': False, 'message': 'User is not logged in'})


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

@app.route("/get_user_data_by_token", methods=["GET"])
def get_user_data_by_token():
    token = request.args.get("token")
    email = database_helper.get_email(token)
    print(email)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_data_by_email", methods=["get"])
def get_user_data_by_email():
    user_email = request.args.get("user_email")
    token = request.args.get("token")
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(user_email)
        if data is not None:
            retData = {'firstname': data[0], 'familyname': data[1], 'email': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]}
            return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})
        else:
            return json.dumps({'success': False, 'message': 'The user does not exist'})

@app.route("/get_user_messages_by_token", methods=["get"])
def get_user_messages_by_token():
    token = request.args.get("token")
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_messages(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_messages_by_email", methods=["get"])
def get_user_messages_by_email():
    token = request.args.get("token")
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        user_email = request.args.get("user_email")
        data = database_helper.get_messages(user_email)
        retData = [];
        for d in data:
            retData.append({"writer": d[1], "content": d[0]})
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})

@app.route("/post_message", methods=["post"])
def post_message():
    token = request.form["token"]
    message = request.form["message"]
    email = request.form["email"]
    if database_helper.check_email(email) is False:
        return json.dumps({'success': False, 'message': 'User does not exist!'})
    senderEmail = database_helper.get_email(token)

    if senderEmail is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        if message is "":
            return json.dumps({'success': False, 'message': 'Message cannot be empty'})
        else:
            database_helper.post_message(senderEmail, email, message)
            return json.dumps({'success': True, 'message': 'Message posted'})

if __name__ == '__main__':

    http_server = WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()
    #WebSocketServer(('', 5000),Resource([('/socket', TwidderApp),]),debug=False).serve_forever()

    #app.run()
