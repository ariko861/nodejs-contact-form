const sqlite3 = require('sqlite3');
const fields = require('./fields');


const db = new sqlite3.Database('bookings.db', function(err){
    if (err) {
        console.error(err);
        return;
    }
    console.info('Connected to bookings.db database');
});

var dbSchema = `CREATE TABLE IF NOT EXISTS Bookings ( `;

dbSchema += 'contactdate text, '; // to register the date the form was made.

fields.forEach((item, index) => {
    dbSchema += item.name + ' text';
    let finale = ( index < fields.length - 1 ) ? ", ":")";
    dbSchema += finale;
});

console.log(dbSchema);

module.exports = {
  
    createBookingTable: () => {
        db.exec(dbSchema, (err) => {
            if (err) {
                console.error(err);
            }
        });
    },
    
    insertBooking: (form, callback) => {
        var todayRaw = new Date().toJSON();
        today = todayRaw.substring(0, 10);

        var columns = "";
        var values = "";
        var points = "";
        var valArray = [today];
        fields.forEach((item, index) => {
            if ( form[item.name] ){
                columns += (index === 0) ? "":", "
                columns += item.name;
                points += (index === 0) ? "":", "
                points += "?";
                valArray.push(form[item.name]);
            }
        });
        
        var dbCommand = "INSERT INTO Bookings (contactdate, " + columns + ") VALUES (? , " + points + ")";
        var stmt = db.prepare(dbCommand);

        stmt.run(valArray, (err) => {
            if (err) callback(err);
                 else callback();
        });
    },
    //method + " < '" + endDate + " 23:59:59' AND " +
    getBookings: (method, beginDate, endDate, callback) => {
        var query = "SELECT * FROM Bookings WHERE " +  method + " BETWEEN '" + beginDate +"' AND '" + endDate + "'";
        db.all(query, (err, list) => {
            if (err) callback(err);
            else callback("", list);
        });
        
    }
}
