require('dotenv').config();

module.exports = {
    // Theme
    theme: "darkSky",

    mapLatitude: process.env.MAP_LATITUDE, // latitude and longitude for the map
    mapLongitude: process.env.MAP_LONGITUDE,
    
    mapboxToken: process.env.MAPBOX_TOKEN,
    
    // Email notifier account (sender)
    host: process.env.SMTP_HOST, // Sender email smtp
    port: process.env.SMTP_PORT, // Sender email port
    user: process.env.SMTP_USER, // Sender email username
    pass: process.env.SMTP_PASSWORD, // Sender email password

    // Your email to receive notification (receiver)  
    from: process.env.MAIL_FROM, // Sender email address
    to: process.env.MAIL_TO, // Your email address
    subject: process.env.MAIL_SUBJECT, // Subject
};
