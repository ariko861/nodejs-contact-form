require('dotenv').config();

module.exports = {
    // Theme
    theme: "darkSky",
    
    webAdress: process.env.WEB_ADRESS,
    
    openIDUse: process.env.OPENID_USE,
    openIDissuer: process.env.OPENID_LOGIN_ADRESS,
    openIDclientID: process.env.OPENID_CLIENTID,
    openIDsecret: process.env.OPENID_SECRET,
    openIDclientSecret: process.env.OPENID_CLIENTSECRET,
    
    siteName: process.env.SITE_NAME,
    siteAdress: process.env.SITE_ADRESS,
    siteEmail: process.env.SITE_EMAIL,
    sitePhone: process.env.SITE_PHONE,
    matrixRoom: process.env.MATRIX_ROOM,
    
    cartebancaire: process.env.CARTEBANCAIRE,
    cash: process.env.CASH,
    iban: process.env.IBAN,
    
    sendIcs: process.env.SEND_ICS, //wether an ics file should be sent
    
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
    cc: process.env.MAIL_CC, // Your email address
    bcc: process.env.MAIL_BCC, // Your email address
    subject: process.env.MAIL_SUBJECT, // Subject
    
};
