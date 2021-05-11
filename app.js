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

const i18n = new I18n({
  locales: ['en', 'fr'],
  directory: path.join(__dirname, 'locales')
})

console.log(fields[0]);

// Set Package
const app = express();

db.createBookingTable();

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

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
    res.render(config.theme, renderVariables);
});

app.get ('/admin', (req, res) => {
    
    let methods = [];
    fields.forEach((item, index) => {
        if ( item.type === "date" ) methods.push(item);
    });
    res.render("admin", { methods: methods });
});

app.post('/admin', (req, res) => {
    db.getBookings(req.body.method, req.body.beginDate, req.body.endDate, (err, list) => {
        if (err) console.error(err);
        else {
            console.log('OK');
            //const csv = parse(list, columns);
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
        
        fields.forEach( (item, index) => {
            output += '<p>' + item.label + `: ${req.body[item.name]}</p>`;
        });


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

    // Use this is you want to use Gmail SMTP
//     let transporter = nodemailer.createTransport(
//             `smtps://${config.user}:${config.pass}@smtp.gmail.com`
//     );

    // Setup email settings
    let mailOptions = {
            from: config.from,
            to: config.to,
            subject: config.subject,
            html: output
    };
    
    if ( req.body.email ) mailOptions.replyTo = req.body.email;

    // Send mail with defined transport object
    db.insertBooking(req.body, () => {
        if (err) {
            console.log(err)
            res.render(config.theme, {msg: failAlert});
        } else {
            transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                            res.render(config.theme, {msg: failAlert});
                    }
                    res.render(config.theme, {msg: successAlert});
            });
        }
    });
});
