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

app = Flask(__name__, static_url_path='')
bcrypt = Bcrypt(app)

wslist = {}

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
                wsock.send(json.dumps({'messageType': 'loggedInUsers', 'message': database_helper.getLoggedInUsersCount()}))
                wsock.send(json.dumps({'messageType': 'totalUsers', 'message': database_helper.getAllUserCount()}))

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
    # We generate a private key for the user which is used when hashing
    private_key = os.urandom(32)
    private_key = base64.b64encode(private_key).decode('utf-8)')

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
    database_helper.create_user(firstname, familyname, email, gender, country, city, hashed_password, private_key)
    for user in wslist:
        wslist[user].send(json.dumps({'messageType': 'totalUsers', 'message': database_helper.getAllUserCount()}))
    return json.dumps({'success': True, 'message': 'All went well'})

@app.route("/signin", methods=["post"])
def signin():
    email = request.form["email"]
    password = request.form["password"]
    data = database_helper.get_password(email)
    if data is None:
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    if bcrypt.check_password_hash(data, password):
        return json.dumps({'success': False, 'message': 'The email or password is incorrect'})

    token = database_helper.get_token(email)
    if token is not None:
        database_helper.remove_token(token)
        if(token in wslist):
            wslist[token].send(json.dumps({'messageType': 'logout', 'message': "You just got logged out!"}))
            wslist[token].close()
            wslist.pop(token)


    token = os.urandom(32)
    token = base64.b64encode(token).decode('utf-8)')
    database_helper.insert_token(email, token)
    private_key = database_helper.get_private_key(email)
    # When someone logs in, we send a message to all logged in users to update their 'logged in users' count
    for user in wslist:
        wslist[user].send(json.dumps({'messageType': 'loggedInUsers', 'message': database_helper.getLoggedInUsersCount()}))
    return json.dumps({'success': True, 'message': 'Successfully logged in', 'data': {'token': token, 'key': private_key}})

@app.route("/signout", methods=["post"])
def signout():
    token = request.form["token"]
    if(database_helper.get_email(token)):
        database_helper.remove_token(token)
        if token in wslist:
            wslist.pop(token)

        # When someone logs out, we send a message to all logged in users to update their 'logged in users' count
        for user in wslist:
            wslist[user].send(json.dumps({'messageType': 'loggedInUsers', 'message': database_helper.getLoggedInUsersCount()}))
        return json.dumps({'success': True, 'message': 'The user was logged out'})
    else:
        return json.dumps({'success': False, 'message': 'User is not logged in'})

# This is run on every server call except login and signup
# We create a hash using a 'blob' which is the text we have sent and compare it to the hash which was created
# on the client in the exact same way. If they are different we return True which means this is not a correct server call
def check_hash(blob,token,hash):
    key = database_helper.get_private_key(database_helper.get_email(token))
    blob = blob.replace('\r\n','') + token + key
    hashed = hashlib.sha512(blob).hexdigest()
    return hashed != hash

@app.route("/change_password", methods=["post"])
def change_password():
    oldPassword = request.form["oldpass"]
    newPassword = request.form["newpass"]
    token = request.form["token"]
    blob = oldPassword + newPassword
    if check_hash(blob, token, request.form["hash"]):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

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
    if check_hash("", token, request.args.get("hash")):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_user(email)
        retData = {'firstname': data[0], 'familyname': data[1], 'email': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]}
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})

@app.route("/get_user_data_by_email", methods=["get"])
def get_user_data_by_email():
    user_email = request.args.get("user_email")
    token = request.args.get("token")
    blob = user_email
    if check_hash(blob, token, request.args.get("hash")):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    email = database_helper.get_email(token)
    if email is None:
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
                wslist[tok].send(json.dumps({'messageType': 'views', 'message': [d[0],d[1]]}))
            retData = {'firstname': data[0], 'familyname': data[1], 'email': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]}
            return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": retData})
        else:
            return json.dumps({'success': False, 'message': 'The user does not exist'})

@app.route("/get_user_messages_by_token", methods=["get"])
def get_user_messages_by_token():
    token = request.args.get("token")
    if check_hash("", token, request.args.get("hash")):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
        data = database_helper.get_messages(email)
        return json.dumps({'success': True, 'message': 'Data retrieval successful', "data": data})

@app.route("/get_user_messages_by_email", methods=["get"])
def get_user_messages_by_email():
    token = request.args.get("token")
    user_email = request.args.get("user_email")
    blob = user_email
    if check_hash(blob, token, request.args.get("hash")):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    else:
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
    print(message)
    blob = message + email
    print(blob)
    if check_hash(blob, token, request.form["hash"]):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
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

# Returns the file the user has "clicked" on and shows it to the user
@app.route("/view_media", methods=["get"])
def view_media():
    token = request.args.get("token")
    email = request.args.get("user_email")
    name = request.args.get("name")

    useremail = database_helper.get_email(token)
    if useremail is None:
        return
    blob = email + name
    if check_hash(blob, token, request.args.get("hash")):
        return
    filePath = database_helper.getMedia(name, email)[0]
    return send_from_directory("media",filePath)

# Returns all the media a given user has
@app.route("/show_media", methods=["get"])
def show_media():
    token = request.args.get("token")
    user_email = request.args.get("user_email")
    email = database_helper.get_email(token)
    if email is None:
        return json.dumps({'success': False, 'message': 'User is not logged in'})
    blob = user_email

    if check_hash(blob, token, request.args.get("hash")):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})

    data = database_helper.getUserMedia(user_email)
    return json.dumps({'success': True, 'message':'Data retrieval successful', 'data': data})

# Here we receive a file and store it in /media/username
@app.route("/upload_media", methods=["post"])
def upload_media():
    token = request.form["token"]
    email = database_helper.get_email(token)
    file = request.files["file"]
    filetype = request.form["filetype"]
    blob = filetype

    if check_hash(blob, token, request.form["hash"]):
        return json.dumps({'success': False, 'message': 'You are trying to hack a user. You should be ashamed of yourself!'})
    if email is None:
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
