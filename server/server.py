from flask import Flask
from flask import request
import database_helper
import json

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
    result = database_helper.create_user(firstname, familyname, email, gender, country, city, password)
    if result:
        return json.dumps({'success': True, 'message': 'All went well'})
    else:
        return json.dumps({'success': False, 'message': 'User already exists'})






if __name__ == '__main__':
    app.run()
