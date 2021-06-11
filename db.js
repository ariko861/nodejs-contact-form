const sqlite3 = require('sqlite3');
const fields = require('./fields');
const crypto = require('crypto');

const db = new sqlite3.Database('storage/bookings.db', function(err){
    if (err) {
        console.error(err);
        return;
    }
    console.info('Connected to bookings.db database');
});

var dbSchema = `CREATE TABLE IF NOT EXISTS Bookings ( `;

dbSchema += 'hashid text NOT NULL, contactdate text, totalcost integer, '; // to register the date the form was made.

fields.forEach((item, index) => {
    dbSchema += item.name + ' text';
    let finale = ( index < fields.length - 1 ) ? ", ":")";
    dbSchema += finale;
});


linksSchema = `CREATE TABLE IF NOT EXISTS Links (linkid text NOT NULL PRIMARY KEY);`;

module.exports = {
  
    createBookingTable: () => {
        db.exec(dbSchema, (err) => {
            if (err) {
                console.error(err);
            }
        });
    },
    
    createLinksTable: () => {
        db.exec(linksSchema, (err) => {
            if (err) {
                console.error(err);
            }
        });
    },
    
    
    createNewLink: (callback) => {
      //var hash = crypto.randomBytes(20).toString('hex');
      var hash = Date.now().toString();
      db.run("INSERT INTO Links (linkid) VALUES ($hash)", {
          $hash: hash
      }, (err) => {
          if (err) callback(err)
          else callback("", hash);
      });        
    },
    
    getLink: (hash, callback) => {
        db.get("SELECT * FROM Links WHERE linkid = $hash", {
            $hash: hash
        }, (err, row) => {
            if (err) callback(err);
            else callback("", row);
                
        });
            
    },
    
    deleteLink: (hash, callback) => {
        db.run("DELETE FROM Links WHERE linkid = $hash", {
            $hash: hash
        }, (err) => {
            if (err) callback(err);
            else {
                callback();
            }
        });
        
    },
    
    insertBooking: (form, callback) => {
        var todayRaw = new Date().toJSON();
        today = todayRaw.substring(0, 10);

        var columns = "";
        var values = "";
        var points = "";
        //var valArray = [form.hash, today];
        
        fields.forEach((item, index) => {
            columns += (index === 0) ? "":", "
            columns += item.name;
            points += (index === 0) ? "":", "
            points += "?";
        });
        
        var dbCommand = "INSERT INTO Bookings (hashid, contactdate, totalcost, " + columns + ") VALUES (?, ? , ? , " + points + ")";
        var stmt = db.prepare(dbCommand);
        
        if ( form.persons ) {
            var dbValues = [];
            for ( i=0 ; i < form.persons.length ; i++ ) {
                let personValue = [form.hash, today, form.totalCost]
                fields.forEach((item, index) => {
                    if ( item.multiple ) {
                        if ( form.persons[i][item.name]) {
                            personValue.push(form.persons[i][item.name]);
                        }
                    } else {
                        personValue.push(form[item.name]);
                    }
                });
                dbValues.push(personValue);
            }
            
            db.serialize( (err)=> {
                for ( i=0 ; i < form.persons.length ; i++ ) {
                    stmt.run(dbValues[i]);
                }
                if (err) callback(err);
                else callback();
            });
            
            
            
            
        } else {
            var dbValues = [form.hash, today, form.totalCost]
            fields.forEach((item, index) => {
                if ( form[item.name] ){
                    dbValues.push(form[item.name]);
                }
            });
            stmt.run(dbValues, (err) => {
                if (err) callback(err);
                else callback();
            });
        }
                
        
    },
    
    getBookings: (method, beginDate, endDate, callback) => {
        var query = "SELECT * FROM Bookings WHERE " +  method + " BETWEEN '" + beginDate +"' AND '" + endDate + "'";
        db.all(query, (err, list) => {
            if (err) callback(err);
            else callback("", list);
        });
        
    },
    
    getOneBooking: (id, callback) => {
        db.get("SELECT * FROM Bookings WHERE hashid = $id", {
            $id: id
        }, (err, row) => {
            if (err) callback(err);
            else callback("", row);
                
        });
    },
    
    deleteBooking:(id, callback) => {
        db.run("DELETE FROM Bookings WHERE hashid = $id", {
            $id: id
        }, (err) => {
            if (err) callback(err);
            else {
                callback();
                
            }
        });
    }
}
