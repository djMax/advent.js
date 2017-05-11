import request from 'superagent';

const sheetCache = {};

function getT(entry, prop) {
  if (entry[prop] && entry[prop].$t) {
    return entry[prop].$t;
  }
  return undefined;
}

function entryInfo(entry) {
  return {
    room: getT(entry, 'gsx$roomname'),
    prompt: getT(entry, 'gsx$prompt'),
    choice: getT(entry, 'gsx$choice'),
    changes: getT(entry, 'gsx$changes'),
    needs: getT(entry, 'gsx$needs'),
    next: getT(entry, 'gsx$nextroom'),
    message: getT(entry, 'gsx$message'),
    special: getT(entry, 'gsx$special'),
    image: getT(entry, 'gsx$image'),
  };
}

function parseSheet(rooms, sheetUrl, updated) {
  if (sheetCache[sheetUrl] && sheetCache[sheetUrl].updated === updated) {
    console.log('Cache hit', sheetUrl);
    Object.assign(rooms, sheetCache[sheetUrl].parsed);
    return;
  }

  let lastRoom;
  return new Promise(function (resolve) {
    request.get(sheetUrl)
      .end(function (error, content) {
        try {
          content.body.feed.entry.map(entryInfo).forEach(function (e) {
            if (e.room) {
              if (!lastRoom) {
                rooms['_firstRoom'] = e.room.toLowerCase();
              }
              lastRoom = rooms[e.room.toLowerCase()] = rooms[e.room] || {
                prompt: e.prompt,
                choices: [],
              };
            }
            delete e.room;
            delete e.prompt;
            lastRoom.choices.push(e);
          });
        } catch (error) {
          console.error('sheet parser error (ignoring sheet)', error);
        }
        sheetCache[sheetUrl] = {
          updated,
          parsed: rooms,
        };
        resolve();
      });
  });
}

export default function route(router) {
  /**
   * Fetch and parse a specially formatted Google Sheet (public access required) that has
   * one sheet per person, and on that sheet a set of "rooms" (as determined by a non-empty first column)
   * with choices and properties on those choices.
   */
  router.post('/:id', async (req, res) => {
    request
      .get(`https://spreadsheets.google.com/feeds/worksheets/${req.params.id}/public/full\?alt\=json`)
      .end(function (e, r) {
        const sheets = {};
        const toDo = [];
        r.body.feed.entry.forEach(function (person) {
          const who = person.title.$t;
          const rooms = {};
          toDo.push(parseSheet(rooms, person.link[0].href + '?alt=json', person.updated['$t']));
          sheets[who.toLowerCase()] = rooms;
        });
        Promise.all(toDo).then(function () {
          res.json(sheets);
        });
      });
  });
}