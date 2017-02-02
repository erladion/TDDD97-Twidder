import sqlite3

connection = sqlite3.connect("database.db")
cur = connection.cursor()

def create_database():
    with open('database.schema') as dbscript:
        cur.executescript(dbscript.read())

