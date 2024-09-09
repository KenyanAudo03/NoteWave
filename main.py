from website import create_app
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, render_template
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)