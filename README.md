# Node Contact Form
Contact form build with Bootstrap and Nodemailer

### Demo
[Demo Page](https://rezkyfm.herokuapp.com)

### Installation
1. Install the dependencies and start the server.
```
$ git clone https://github.com/rezkyfm/nodejs-contact-form.git
$ cd nodejs-contact-form
$ npm install && npm start
```
2. Open in browser
```
http://localhost:3000
```
### Configuration
Open config.js
```javascript
/* 
config.js
*/
module.exports = {
    // Theme
    theme: "lightBlue",

    // Email notifier account (sender)
    host: "smtp.mailtrap.io", // Sender email smtp
    port: "465", // Sender email port
    user: "username", // Sender email username
    pass: "password", // Sender email password

    // Your email to receive notification (receiver)  
    from: '"Contact Me" <noreply@example.com>', // Sender email address
    to: 'email@example.com', // Your email address
    subject: 'Contact Us', // Subject
};
```
### Config the fields with fields.json

```
    {
        "label": "Quel montant souhaiteriez vous payer ? ( selon vos moyens )",
        "name": "price",
        "type": "select",
        "options": ["11€", "15€"], ( only for "select" or "radio" )
        "select": true, ( can be "textarea" or "radio" )
        "required": true
    },
```

### Theme Screenshoot
#### lightBlue
![lightBlue](https://i.imgur.com/0I23zEr.png)
#### darkSky
![darkSky](https://i.imgur.com/YkCyI7D.png)
