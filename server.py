# coding: utf8
from flask import Flask
from flask import send_from_directory
from werkzeug.utils import secure_filename
from flask_bcrypt import Bcrypt
from flask import request
from gevent.wsgi import WSGIServer
from geventwebsocket import WebSocketServer, WebSocketApplication, WebSocketError, Resource
from geventwebsocket.handler import WebSocketHandler
import database_helper
import json
import os
import base64
import re
import hashlib
import time

app = Flask(__name__, static_url_path='')
bcrypt = Bcrypt(app)

wslist = {}

def send_message(socket,message):
    try:
        socket.send(message)
    except WebSocketError:
        wslist.pop(socket)

@app.route('/websocket')
def handle_websocket():
    wsock = request.environ.get('wsgi.websocket')
    if not wsock:
        return
    while True:
        try:
            message = wsock.receive()
            if not message:
                continue
            obj = json.loads(message)
            if(obj['messageType'] == "token"):
                wslist[obj['token']] = wsock
                # Here we send the live stats to the user as soon as he logs in
                wsock.send(json.dumps({"messageType": 'login'}))
                wsock.send(json.dumps({'messageType': 'loggedInStats', 'message': [database_helper.getLoggedInUsersCount(), database_helper.getAllUserCount()]}))

        except WebSocketError:
            wslist.pop(wsock)
            break



# Redirect all possible client-side urls to the client.html download
@app.route("/", methods=['GET'])
@app.route("/home", methods=['GET'])
@app.route("/browse", methods=['GET'])
@app.route("/account", methods=['GET'])
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
    # We hash the password before we store it so that we don't store plain text
    hashed_password = bcrypt.generate_password_hash(password)

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
    database_helper.create_user(firstname, familyname, email, gender, country, city, hashed_password)
    for user in wslist:
        send_message(wslist[user], json.dumps({'messageType': 'loggedInStats', 'message': [database_helper.getLoggedInUsersCount(), database_helper.getAllUserCount()]}))
    return json.dumps({'success': True, 'message': 'All went well'})

@app.route("/signin", methods=["post"])
def signin():
    email = request.form["email"]
    password = request.form["password"]
    data = database_helper.get_password(email)
    if data is None:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    if not bcrypt.check_password_hash(data, password):
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    token = database_helper.get_token(email)
    if token is not None:
        database_helper.remove_token(token)
        if(token in wslist):
            try:
                wslist[token].send(json.dumps({'messageType': 'logout', 'message': "You just got logged out!"}))
            except WebSocketError:
                pass
            wslist[token].close()
            wslist.pop(token)


    token = os.urandom(32)
    token = base64.b64encode(token).decode('utf-8)')
    database_helper.insert_token(email, token)
    # When someone logs in, we send a message to all logged in users to update their 'logged in users' count
    for user in wslist:
        send_message(wslist[user],json.dumps({'messageType': 'loggedInStats', 'message': [database_helper.getLoggedInUsersCount(), database_helper.getAllUserCount()]}))
    return json.dumps({'success': True, 'message': 'Successfully logged in', 'data': token})

@app.route("/signout", methods=["post"])
def signout():
    email = request.form["email"]
    time_stamp = request.form["time"]
    token = database_helper.get_token(email)
    blob = email

    if check_hash(blob, email, request.form["hash"], time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

    if token:
        database_helper.remove_token(token)
        if token in wslist:
            wslist.pop(token)

        # When someone logs out, we send a message to all logged in users to update their 'logged in users' count
        for user in wslist:
            send_message(wslist[user], json.dumps({'messageType': 'loggedInStats', 'message': [database_helper.getLoggedInUsersCount(), database_helper.getAllUserCount()]}))
        return json.dumps({'success': True, 'message': 'The user was logged out'})
    else:
        return json.dumps({'success': False, 'message': 'User is not logged in'})


def check_hash(blob,email,hash, time_stamp):
    """
    This is run on every server call except login and signup
    We create a hash using a 'blob' which is the text we have sent and compare it to the hash which was created
    on the client in the exact same way. If they are different we return True which means this is not a correct server call
    """
    if time.time() - int(time_stamp) > 10:
        return True
    blob = blob.replace('\r\n','') + time_stamp + database_helper.get_token(email)
    hashed = hashlib.sha512(blob).hexdigest()
    return hashed != hash

@app.route("/change_password", methods=["post"])
def change_password():
    oldPassword = request.form["oldpass"]
    newPassword = request.form["newpass"]
    time_stamp = request.form["time"]
    email = request.form["email"]
    blob = oldPassword + newPassword + email
    if check_hash(blob, email, request.form["hash"], time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

    if len(newPassword) < 8:
        return json.dumps({'success': False, 'message': 'The password is too short'})

    token = database_helper.get_token(email)
    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        if bcrypt.check_password_hash(database_helper.get_password(email),oldPassword):
            database_helper.change_password(email, bcrypt.generate_password_hash(newPassword))
            return json.dumps({'success': True, 'message': 'Password was changed successfully'})
        else:
            return json.dumps({'success': False, 'message': 'Wrong password'})

@app.route("/get_user_data_by_token", methods=["GET"])
def get_user_data_by_token():
    token = request.args.get("token")
    time_stamp = request.args.get("time")
    email = database_helper.get_email(token)
    if check_hash("", email, request.args.get("hash"),time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(email)
        retData = {'firstname': data[0], 'familyname': data[1], 'email': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]}
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})

@app.route("/get_user_data_by_email", methods=["get"])
def get_user_data_by_email():
    user_email = request.args.get("user_email")
    email = request.args.get("email")
    time_stamp = request.args.get("time")
    blob = user_email + email
    if check_hash(blob, email, request.args.get("hash"),time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    token = database_helper.get_token(email)
    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(user_email)
        tok = database_helper.get_token(user_email)

        if data is not None:
            if user_email != email:
                # If the user is not checking his own page, we update the looked-at-user's view count
                da = database_helper.get_user(email)
                database_helper.updateViews(user_email, da[3])
            if tok is not None and tok in wslist:
                # here we send the user's view count (which could be the sender himself if he just started his home page)
                d = database_helper.getViews(user_email)
                send_message(wslist[tok], json.dumps({'messageType': 'views', 'message': [d[0],d[1]]}))
            retData = {'firstname': data[0], 'familyname': data[1], 'email': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]}
            return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})
        else:
            return json.dumps({'success': False, 'message': 'The user does not exist'})

@app.route("/get_user_messages_by_token", methods=["get"])
def get_user_messages_by_token():
    token = request.args.get("token")
    time_stamp = request.args.get("time")
    if check_hash("", database_helper.get_email(token), request.args.get("hash"),time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_messages(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_messages_by_email", methods=["get"])
def get_user_messages_by_email():
    user_email = request.args.get("user_email")
    email = request.args.get("email")
    time_stamp = request.args.get("time")
    blob = user_email + email
    if check_hash(blob, email, request.args.get("hash"), time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    token = database_helper.get_token(email)
    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_messages(user_email)
        retData = []
        for d in data:
            retData.append({"writer": d[1], "content": d[0]})
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})

@app.route("/post_message", methods=["post"])
def post_message():
    email = request.form["email"]
    message = request.form["message"]
    user_email = request.form["user_email"]
    time_stamp = request.form["time"]
    blob = message + user_email + email
    if check_hash(blob, email, request.form["hash"], time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    if database_helper.check_email(user_email) is False:
        return json.dumps({'success': False, 'message': 'User does not exist!'})
    token = database_helper.get_token(email)

    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        if message is "":
            return json.dumps({'success': False, 'message': 'Message cannot be empty'})
        else:
            database_helper.post_message(email, user_email, message)
            return json.dumps({'success': True, 'message': 'Message posted'})

@app.route("/view_media", methods=["get"])
def view_media():
    """
    Returns the file the user has "clicked" on and shows it to the users
    """
    email = request.args.get("email")
    name = request.args.get("name")
    time_stamp = request.args.get("time")

    token = database_helper.get_token(email)
    if token is None:
        return
    blob = name + email
    if check_hash(blob, email, request.args.get("hash"), time_stamp):
        return
    filePath = database_helper.getMedia(name, email)[0]
    return send_from_directory("media",filePath)

@app.route("/show_media", methods=["get"])
def show_media():
    """
    Returns all the media a given user has
    """
    email = request.args.get("email")
    time_stamp = request.args.get("time")

    token = database_helper.get_token(email)
    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    blob = email

    if check_hash(blob, email, request.args.get("hash"), time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

    data = database_helper.getUserMedia(email)
    return json.dumps({'success': True, 'message':'Data retrieval successful', 'data': data})

@app.route("/upload_media", methods=["post"])
def upload_media():
    """
    Receivte a file and store it in /media/username
    """
    email = request.form["email"]
    file = request.files["file"]
    filetype = request.form["filetype"]
    time_stamp = request.form["time"]
    blob = filetype+ email

    if check_hash(blob, email, request.form["hash"], time_stamp):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

    token = database_helper.get_token(email)
    if token is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    if file.filename == '':
        return json.dumps({'success': False, 'message': 'No file to be uploaded'})
    if file:
        # Check if the "user" has a folder, else we create one to store the files
        if not os.path.isdir('./media/' + email):
            os.makedirs('./media/'+email)
        # Make sure the filename is not bad, example ../../.. etc, so we don't get users trying to hack the server
        filename = secure_filename(file.filename)
        filePath = email + "/" + filename
        if database_helper.getMedia(filename, email) is not None:
            return json.dumps({'success': False, 'message': 'File already exists'})
        # We both save the file on disk as well as save the path in the database
        file.save(os.path.join("media", filePath))
        database_helper.saveMedia(filename, filePath, email, filetype)
        return json.dumps({'success': True, 'message': 'Upload successful'})

if __name__ == '__main__':

    http_server = WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()
    #WebSocketServer(('', 5000),Resource([('/socket', TwidderApp),]),debug=False).serve_forever()

    #app.run()
