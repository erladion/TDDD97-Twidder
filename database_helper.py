import sqlite3

connection = sqlite3.connect("database.db")
cur = connection.cursor()
def create_database():
    with open('database.schema') as dbscript:
        cur.executescript(dbscript.read())

def check_email(email):
    cur.execute("SELECT rowid FROM userInformation WHERE email LIKE ?", (email,))
    data = cur.fetchone()
    return data is not None

def get_password(email):
    cur.execute("SELECT password FROM userInformation WHERE email LIKE ?", (email,))
    data = cur.fetchone()
    return None if data is None else data[0]

def create_user(firstname,lastname,email,gender,country,city,password, privatekey):
    cur.execute('insert into userInformation values (?,?,?,?,?,?,?,0,0,?)',(firstname,lastname,email,gender,country,city,password,privatekey))
    connection.commit()

def insert_token(email,token):
    cur.execute('insert into loggedInUsers values (?,?)',(token,email))
    connection.commit()

def get_token(email):
    cur.execute("SELECT token FROM loggedInUsers WHERE email LIKE ?", (email,))
    data = cur.fetchone()
    return None if data is None else data[0]

def get_private_key(email):
    cur.execute("SELECT privateKey FROM userInformation WHERE email LIKE ?", (email,))
    data = cur.fetchone()
    return None if data is None else data[0]

def remove_token(token):
    cur.execute("delete from loggedInUsers where token = ?",(token,))
    connection.commit()

def get_email(token):
    cur.execute("SELECT email FROM loggedInUsers WHERE token LIKE ?", (token,))
    data = cur.fetchone()
    return None if data is None else data[0]

def change_password(email, password):
    cur.execute("UPDATE userInformation SET password=? WHERE email=?", (password, email))
    connection.commit()

def get_user(email):
    cur.execute("SELECT * FROM userInformation WHERE email = ?", (email,))
    data = cur.fetchone()
    return data

def get_messages(email):
    cur.execute("SELECT * FROM messages WHERE recieverEmail=?", (email,))
    data = cur.fetchall()
    return data

def post_message(senderEmail, recieverEmail, message):
    cur.execute("INSERT INTO messages VALUES (?, ?, ?)", (message, senderEmail, recieverEmail))
    connection.commit()

def updateViews(email, gender):
    print(gender)
    if(gender == "Female"):
        cur.execute("UPDATE userInformation SET femaleViews= femaleViews + 1 WHERE email = ?", (email,))
    else:
        cur.execute("UPDATE userInformation SET maleViews= maleViews + 1 WHERE email = ?", (email,))
    connection.commit()

def getViews(email):
    cur.execute("SELECT maleViews, femaleViews FROM userInformation WHERE email = ?", (email,))
    data = cur.fetchone()
    return data

def getLoggedInUsersCount():
    cur.execute("SELECT Count(*) FROM loggedInUsers")
    data = cur.fetchone()
    return data

def getAllUserCount():
    cur.execute("SELECT Count(*) FROM userInformation")
    data = cur.fetchone()
    return data