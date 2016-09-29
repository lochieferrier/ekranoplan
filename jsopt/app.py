from flask import Flask
from flask.ext.bower import Bower
app = Flask(__name__)
@app.route("/")
def main():
	return "wrong thing"
if __name__ == "__main__":
	app.run()
Bower(app)