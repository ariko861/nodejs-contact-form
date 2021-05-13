// Import Package
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path');
const nodemailer = require('nodemailer');
const { I18n } = require('i18n');
const config = require('./config');
const fields = require('./fields');
const db = require('./db');
const converter = require('json-2-csv');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

var memoryStore = new session.MemoryStore();
var keycloak = new Keycloak({ store: memoryStore });


const i18n = new I18n({
  locales: ['en', 'fr'],
  directory: path.join(__dirname, 'locales')
})

// Alert if successfully sending email
const successAlert = `
<div class="alert alert-success alert-dismissible fade show" role="alert">
Votre formulaire a bien été pris en compte !
<button type="button" class="close" data-dismiss="alert" aria-label="Close">
<span aria-hidden="true">&times;</span>
</button>
</div>
`;

// Alert if failed to sending email
const failAlert = `
<div class="alert alert-warning alert-dismissible fade show" role="alert">
Échec lors de l'envoi du message, veuillez réessayer plus tard.
<button type="button" class="close" data-dismiss="alert" aria-label="Close">
<span aria-hidden="true">&times;</span>
</button>
</div>
`;

const unAuthorizedAlert = `
<div class="alert alert-warning alert-dismissible fade show" role="alert">
Vous n'êtes pas autorisés.
<button type="button" class="close" data-dismiss="alert" aria-label="Close">
<span aria-hidden="true">&times;</span>
</button>
</div>
`;

// Set Package
const app = express();

db.createBookingTable();
db.createLinksTable();

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var adminRequestOptions = [];
// To use openid connect
if (config.openIDUse == "true") {
    let kcConfig = {
        clientId: config.keycloakclientID,
        serverUrl: config.keycloakURL,
        realm: config.keycloakRealm,
        realmPublicKey: config.kcRealmPublicKey,
        
    };
    let keycloak = new Keycloak({ store: memoryStore }, kcConfig);
    app.use( keycloak.middleware() );
    var adminRequestOptions.push(keycloak.protect('viale-admin'));
}

// Server Start Notification
app.listen(3000, () => console.log("Server Started on port 3000..."));

// Set Static Folder Path
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(i18n.init);

var todayRaw = new Date().toJSON();
today = todayRaw.substring(0, 10);

var columns = [];
fields.forEach((item, index) => {
    columns += item.name;
});

var renderVariables = {
    siteName: config.siteName,
    siteAdress: config.siteAdress,
    siteEmail: config.siteEmail,
    sitePhone:config.sitePhone,
    coordinates: {
        lat: config.mapLatitude,
        long: config.mapLongitude
    },
    mapboxToken: config.mapboxToken,
    fields: fields,
    today: today
}

// Get Index Page Request
app.get ('/', (req, res) => {
    
    if ( req.query && req.query.id ) {
        db.getLink(req.query.id, (err, row) => {
            if (err) { 
                console.error(err);
                res.render('home', {msg: failAlert});
            } else if (row) {
                renderVariables.hash = row.linkid;
                res.render('contact', renderVariables)
            } else {
                res.render('home', {msg: unAuthorizedAlert});
            }
        });
    } else {
        res.render('home', renderVariables);
    }
});


app.get('/admin', adminRequestOptions, (req, res) => {
    
    let methods = [];
    fields.forEach((item, index) => {
        if ( item.type === "date" ) methods.push(item);
    });
    res.render("admin", { methods: methods });
});

app.get('/admin/newlink', adminRequestOptions, (req, res) => {
    db.createNewLink((err, hash) => {
        if (err) {
            console.error(err)
        } else {
            var link = config.webAdress + "?id=" + hash;
            res.json({link: link});
        }
    });
    
});

app.post('/admin', adminRequestOptions, (req, res) => {
    db.getBookings(req.body.method, req.body.beginDate, req.body.endDate, (err, list) => {
        if (err) console.error(err);
        else {
            converter.json2csv(list, (err, csv) => {
                if (err) console.error(err);                
                else {
                    res.attachment('data.csv');
                    res.send(csv);
                }
            });
        }
    });
});

app.get ('/en', (req, res) => {
    i18n.setLocale(res, 'en');
    res.render(config.theme, renderVariables);

});

app.get ('/fr', (req, res) => {
    i18n.setLocale(res, 'fr');
    res.render(config.theme, renderVariables);

});



// Post Email Request
app.post('/send', (req, res) => {

    // Email Template
    var output = `
        <p>Une réservation a été faite sur le formulaire de contact !</p>
        <h3>Détails</h3>`;
        
        output += '<p>Numéro de la réservation: ' + req.body.hash + '</p>';
        
        fields.forEach( (item, index) => {
            output += '<p>' + item.label + `: ${req.body[item.name]}</p>`;
        });


    // Create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
            host:  config.host,
            port: config.port,
            secure: true,
            auth: {
                    user: config.user,
                    pass: config.pass
            },
            requireTLS: true
    });



    // Setup email settings
    let mailOptions = {
            from: config.from,
            to: config.to,
            subject: config.subject,
            html: output
    };
    
    if ( req.body.email ) mailOptions.replyTo = req.body.email;
    
    db.getLink(req.body.hash, (err, row) => {
        if (err) {
            console.error(err);
            res.render('contact', {msg: failAlert});
        } else if (row) {
            db.insertBooking(req.body, () => {
                if (err) {
                    console.error(err)
                    res.render('contact', {msg: failAlert});
                } else {
                    db.deleteLink(req.body.hash, (err) => {
                        if (err) {
                            console.error(err);
                            res.render('contact', {msg: failAlert});
                        } else {
                            transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                            console.error(err);
                                            res.render('contact', {msg: failAlert});
                                    } else {
                                        console.info(info);
                                        res.render('contact', {msg: successAlert});
                                    }
                            });
                        }
                    });
                }
            });
        } else {
            res.render('contact', {msg: unAuthorizedAlert});
        }
    });
});
