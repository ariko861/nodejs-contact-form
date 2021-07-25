const got = require('got');
const stream = require('stream');

class NextcloudConnection {
    constructor(server, username, password){
      this.server = server;
      this.username = username;
      this.password = password;
      this.deckAPI = '/index.php/apps/deck/api/v1.0';
    }
    
    addDeckCard(boardId, stackId, title, date, description){
        let url = this.server + this.deckAPI + '/boards/'+ boardId + '/stacks/' + stackId + '/cards';
        let options = {
          username: this.username,
          password: this.password, 
          json: {
            title: title,
            type: 'plain',
            order: 0,
            description: description || "",
            duedate: date
          }
        };
        (async () => {
            try {
                const response = await got.post( url, options );
            } catch (error) {
               console.error(error); 
            }
        })();

    }
    
    addCalEvent(calURL, id, ics){
        let url = this.server + '/remote.php/dav/calendars/'+ calURL + id;
        let options = {
          username: this.username,
          password: this.password,
          method: 'PUT',
          body: ics,
          headers: {
              'Content-Type': 'text/calendar',
              'charset': 'utf-8'
          }
        };
        console.log(ics);
        console.log(url);
        (async () => {
            try {
                const response = await got( url, options );
            } catch (error) {
               console.error(error); 
            }
        })();

    }
}

module.exports = NextcloudConnection;