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
const ics = require('ics-plus');
const { auth, requiresAuth, claimCheck } = require('express-openid-connect');
const NextcloudConnection = require('./nextcloud.js');


const i18n = new I18n({
  locales: ['fr', 'en', 'nl', 'de'],
  directory: path.join(__dirname, 'locales'),
  logWarnFn: function (msg) {
    console.log('warn', msg)
  },
  defaultLocale: 'fr',
})

const alternumerica = new NextcloudConnection(config.nextcloudURL, config.nextcloudUser, config.nextcloudPass );

const boardID = 14;
const stackIDs = [52, 57];

// Alert if successfully sending email
const successAlert = (string) => {
return `
<div class="alert alert-success alert-dismissible fade show" role="alert">
${string}
<button type="button" class="close" data-dismiss="alert" aria-label="Close">
<span aria-hidden="true">&times;</span>
</button>
</div>
`;
}

// Alert if failed to sending email
const failAlert = (string) => {
    return `
    <div class="alert alert-warning alert-dismissible fade show" role="alert">
    ${string}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
    </button>
    </div>
    `;
}

const unAuthorizedAlert = (string) => {
    return `
    <div class="alert alert-warning alert-dismissible fade show" role="alert">
    ${string}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
    </button>
    </div>
    `;
}
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
    app.use(
        auth({
            issuerBaseURL: config.openIDissuer,
            baseURL: config.webAdress,
            clientID: config.openIDclientID,
            secret: config.openIDsecret,
            clientSecret: config.openIDclientSecret,
            authRequired: false,
        })
    );
    adminRequestOptions.push(requiresAuth());
//     adminRequestOptions.push(claimCheck((req, claims) => {
//   return claims.isAdmin && claims.roles.includes('viale-admin');
// }));
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
    matrixRoom: config.matrixRoom,
    sitePhone:config.sitePhone,
    coordinates: {
        lat: config.mapLatitude,
        long: config.mapLongitude
    },
    mapboxToken: config.mapboxToken,
    fields: fields,
    today: today
}

const calculReservationCost = (reservation) => {
    let dateA = new Date(reservation.arrivaldate);
    let dateB = new Date(reservation.departuredate);
    var diff = Math.abs(dateB - dateA);
    var diffDays = Math.floor(diff / 86400000);
    let totalCost = 0;
    if ( reservation.persons ) {
        reservation.persons.forEach( (person, index) => {
            totalCost += diffDays * Number(person.price.slice(0, -1));
        });
    } else {
        totalCost = diffDays * Number(reservation.price.slice(0, -1));
    }
    return totalCost;
};

// Get Index Page Request
app.get ('/', (req, res) => {
    
    if ( req.query && req.query.id ) {
        db.getLink(req.query.id, (err, row) => {
            if (err) { 
                console.error(err);
                res.render('home', {msg: failAlert});
            } else if (row) {
                renderVariables.hash = row.linkid;
                fields.forEach((item, index) => {
                    renderVariables.fields[index].label = res.__(item.label);
                    renderVariables.fields[index].placeholder = res.__(item.placeholder);
                });
                renderVariables.msg = "";
                res.render('contact', renderVariables)
            } else {
                renderVariables.msg = unAuthorizedAlert(res.__("Vous n'êtes pas autorisés."));
                res.render('home', renderVariables);
            }
        });
    } else {
        renderVariables.msg = "";
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

if ( config.jsonToken ) {
    app.post('/admin/newlink', (req, res) => {
          var token = req.body['token'];
          if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
          
          if ( token === config.jsonToken ) {
            db.createNewLink((err, hash) => {
                if (err) {
                    console.error(err)
                } else {
                    var link = config.webAdress + "?id=" + hash;
                    return res.json({link: link});
                }
            });
          } else {
            
              return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
            
          }
             
          
    });
}


app.post('/admin/cancelreservation', adminRequestOptions, (req,res) => {
    
    db.getOneBooking(req.body.reservationID, (err, row) => {
        if (err) {
           console.error(err);
           res.status(401).json({result:res.__("Il y a eu une erreur avec la base de données"), type:"error"})
        } else if (row) {
            db.deleteBooking(req.body.reservationID, (err) => {
                if (err) {
                    console.error(err);
                    res.status(401).json({result: res.__("Il y a eu une erreur avec la base de données"), type:"error"});
                } else {
                    res.json({result: res.__("La réservation de %s a bien été supprimée", row.name), type: "success"});
                }
            });
        } else {
            res.json({result: res.__("Cette réservation n'existe pas"), type:"error"});
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
    res.render('home', renderVariables);

});

app.get ('/fr', (req, res) => {
    i18n.setLocale(res, 'fr');
    res.render('home', renderVariables);

});



// Post Email Request
app.post('/send', (req, res) => {
    
    try {
        // Email Template
        
        var output = `
            <p>Une réservation a été faite sur le formulaire de contact !</p>
            <h3>Détails</h3>`;
            
        output += '<p><b>Numéro de la réservation:</b> ' + req.body.hash + '</p>';
        
        output += '<p><b>Nombre de personnes:</b> ' + req.body.numberofpersons + '</p>';
        
        fields.forEach( (item, index) => { // To correct date format if client browser date format different from yyyy-mm-dd
            if ( item.type === 'date' ) {
                if ( !req.body[item.name].match(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/) ) {
                    let fieldDate = new Date(req.body[item.name]);
                    let correctedDate = fieldDate.getFullYear() + '-' + ( fieldDate.getMonth() + 1 ) + '-' + fieldDate.getDate();
                    req.body[item.name] = correctedDate;
                }
            }
        });
        
        
        var reservation = {
            hash: req.body.hash,
        }
        
        let addedpersons = req.body.addedpersons;
        if ( req.body.numberofpersons > 1 ) {
            output += "<ul><li>";
            reservation.persons = [];
            let newperson = {};
            fields.forEach( (item, index) => {
                if ( item.multiple && req.body[item.name] ) {
                    output += '<p><b>' + item.label + `</b>: ${req.body[item.name]}</p>`;
                    newperson[item.name] = req.body[item.name];
                }
            });
            output += "</li>";
            reservation.persons.push(newperson);
            for ( i = 1 ; i <= addedpersons + 1; i++ ) {
                output += "<li>";
                let person = {};
                fields.forEach( (item, index) => {
                    let value = item.name + i;
                    if ( item.multiple && req.body[value] ) {
                        output += '<p><b>' + item.label + `</b>: ${req.body[value]}</p>`;
                        person[item.name] = req.body[value];
                    }
                
                });
                if ( Object.keys(person).length !== 0 ) {
                    reservation.persons.push(person);
                    output += "</li>";
                } else {
                   output = output.slice(0, -4); 
                }
            }
            output += "</ul>";
            fields.forEach( (item, index) => {
                if ( !item.multiple ) {
                    output += '<p><b>' + item.label + `</b>: ${req.body[item.name]}</p>`;
                    reservation[item.name] = req.body[item.name];
                }
            });
            
        } else {
            fields.forEach( (item, index) => {
                output += '<p><b>' + item.label + `</b>: ${req.body[item.name]}</p>`;
                reservation[item.name] = req.body[item.name];
            });
        }
        
        reservation.totalCost = calculReservationCost(reservation);
        
        output += '<p><b>Coût du séjour</b>: ' + reservation.totalCost +'€</p>';
        
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


        let personsComing = "";
        if ( reservation.persons ) {
            reservation.persons.forEach((person, index) => {
                personsComing += person.surname + " " + person.name ;
                if ( index < reservation.persons.length -1 ) personsComing += ", ";
            });
        } else {
            personsComing = reservation.surname + " " + reservation.name;
        }
        
        // Setup email settings
        let mailOptions = {
                from: config.from,
                to: config.to,
                cc: config.cc,
                bcc: config.bcc,
                subject: config.subject + ' ' + personsComing,
                html: output
        };



        if ( req.body.email ) {
            mailOptions.replyTo = req.body.email;
            var clientOutput = "<p>Récapitulatif de votre réservation à " + config.siteName + "</p>" + output;
            
            clientOutput += "<p>" + res.__("Vous pouvez régler :") + "</p><ul>";
            if ( config.cartebancaire ) clientOutput += "<li>" + res.__("sur place par carte bancaire") + "</li>";
            if ( config.cash ) clientOutput += "<li>" + res.__("sur place en espèces") + "</li>";
            if ( config.iban ) clientOutput += "<li>" + res.__("par virement sur le compte %s, en mentionnant votre nom et votre numéro de réservation %s", config.iban, reservation.hash) + "</li>";
            clientOutput += "</ul>";
            
            
            var clientMailOptions = {
                from: config.from,
                 to: req.body.email,
                 subject: config.subject,
                 html: clientOutput
            }
        }
         // IS ICS ACTIVATED
        if ( config.sendIcs == "true" ) {

            var arrivalEvent = {};
            var departureEvent = {};
            const toNumbers = arr => arr.map(Number);
            // CREATE AN ICS FILE IF ARRIVALDATE
            if ( req.body.arrivaldate ) {
                let arrivalDate = new Date(req.body.arrivaldate);
                let endarrivalDate = new Date();
                endarrivalDate.setDate(arrivalDate.getDate() + 1);
                //let arrivalDate = req.body.arrivaldate.split("-");
                //arrivalDate = toNumbers(arrivalDate);
                
                arrivalEvent = {
                    start: [ arrivalDate.getFullYear(), arrivalDate.getMonth() + 1, arrivalDate.getDate() ],
                     end: [ arrivalDate.getFullYear(), arrivalDate.getMonth() + 1, endarrivalDate.getDate() ],
                     title: "Arrivée " + personsComing,
                     description: "Contacter " + req.body.email,
                     categories: ["Arrivées Viale"],
                     status: "CONFIRMED",
                     
                }
            }
            
            if ( req.body.departuredate ) {
                let departureDate = new Date(req.body.departuredate);
                let enddepartureDate = new Date();
                enddepartureDate.setDate(departureDate.getDate() + 1);
                //toNumbers(departureDate);
                departureEvent = {
                    start: [ departureDate.getFullYear(), departureDate.getMonth() + 1, departureDate.getDate() ],
                     end: [ departureDate.getFullYear(), departureDate.getMonth() + 1, enddepartureDate.getDate() ],
                     title: "Départ " + personsComing,
                     description: "Contacter " + req.body.email,
                     categories: ["Départs Viale"],
                     status: "CONFIRMED",
                     
                }
            }
        }
        
        let sendFail = (err) => {
            console.error(err);
            renderVariables.msg = failAlert(res.__("Échec lors de l'envoi du message, veuillez réessayer plus tard") + ".");
            res.render('home', renderVariables);
        };
        
        let sendSuccess = () => {
            renderVariables.msg = successAlert(res.__("Votre formulaire a bien été pris en compte") + " !");
            renderVariables.msg += "<p>" + res.__("Le coût total de votre réservation est de %s €", reservation.totalCost ) + "</p>";
            renderVariables.msg += "<p>" + res.__("Vous pouvez régler :") + "</p><ul>";
            if ( config.cartebancaire ) renderVariables.msg += "<li>" + res.__("sur place par carte bancaire") + "</li>";
            if ( config.cash ) renderVariables.msg += "<li>" + res.__("sur place en espèces") + "</li>";
            if ( config.iban ) renderVariables.msg += "<li>" + res.__("par virement sur le compte %s, en mentionnant votre nom et votre numéro de réservation %s", config.iban, reservation.hash) + "</li>";
            renderVariables.msg += "</ul>";
            
            if ( reservation.persons ) {
                reservation.persons.forEach( (person, index) => {
                    stackIDs.forEach( (stack, index) => {
                        alternumerica.addDeckCard(boardID, stack, person.surname + " " + person.name, reservation.arrivaldate);
                    });
                });
            } else {
                stackIDs.forEach( (stack, index) => {
                    alternumerica.addDeckCard(boardID, stack, reservation.surname + " " + reservation.name, reservation.arrivaldate);
                });
            }
            res.render('home', renderVariables);
        };
        
        db.getLink(reservation.hash, (err, row) => {
            if (err) {
                sendFail(err);
            } else if (row) {
                db.insertBooking(reservation, (err) => {
                    if (err) {
                        sendFail(err);
                    } else {
                        db.deleteLink(reservation.hash, (err) => {
                            if (err) console.error(err);
                            if ( config.sendIcs ) {
                                ics.createEvents([arrivalEvent, departureEvent], (error, attachment) => {
                                    if (error) console.error(error);
                                    else {
                                        mailOptions.attachments = [
                                            {
                                                filename: 'reservation.ics',
                                                content: attachment
                                            }
                                        ];
                                        transporter.sendMail(mailOptions, (error, info) => {
                                            if (error) {
                                                sendFail(error);
                                            } else {
                                                if ( clientOutput ) {
                                                    transporter.sendMail(clientMailOptions, (error, info) => {
                                                        if (error) {
                                                            console.error(error);
                                                        }
                                                    });
                                                }
                                                sendSuccess();
                                            }
                                        });
                                        
                                    }
                                });
                                                                 
                            } else {
                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        sendFail(error);
                                    } else {
                                        
                                        if ( clientOutput ) {
                                            transporter.sendMail(clientMailOptions, (error, info) => {
                                                if (error) {
                                                    console.error(error);
                                                }
                                            });
                                        }
                                        sendSuccess();
                                    }
                                });
                            }
                            
                                                                                
                        });
                    }
                });
            } else {
                renderVariables.msg = unAuthorizedAlert(res.__("Ce lien d'inscription n'est pas valide") + " !");
                res.render('home', renderVariables);
            }
        });
    } catch (err) {
        console.error(err);
    }
});
