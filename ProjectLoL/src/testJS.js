(function(){
  document.getElementById('graph').style.visibility = "hidden";
  document.getElementById("hourButton").addEventListener("click", function() {
    fillChart('Hour', gameByHour, null);
  });
  document.getElementById("dayButton").addEventListener("click", function() {
    fillChart('Day', gameByDay, weekday);
  });
  document.getElementById("monthDayButton").addEventListener("click", function() {
    fillChart('MonthDay', gameByMonthDay, null);
  });
  document.getElementById("monthButton").addEventListener("click", function() {
    fillChart('Month', gameByMonth, month);
  });
  document.getElementById("yearButton").addEventListener("click", function() {
    fillChart('Year', gameByYear, null);
  });
  document.getElementById("allButton").addEventListener("click", function() {
    fillChart('All', gameByAll, 'year');
  });

  let weekday = new Array(7);
  weekday[0]=  "Sunday";
  weekday[1] = "Monday";
  weekday[2] = "Tuesday";
  weekday[3] = "Wednesday";
  weekday[4] = "Thursday";
  weekday[5] = "Friday";
  weekday[6] = "Saturday";

  let month = new Array();
  month[0] = "January";
  month[1] = "February";
  month[2] = "March";
  month[3] = "April";
  month[4] = "May";
  month[5] = "June";
  month[6] = "July";
  month[7] = "August";
  month[8] = "September";
  month[9] = "October";
  month[10] = "November";
  month[11] = "December";

  /****
  Hérna skerum við niður file-ana
  ****/
  /*
  Viljum hafa eftirfarandi uppsetningu á filteredDb arrayinu:
  [
    0: date
    1: patch
    2: players
      [
        0: champion
        1: skin
        2: team
        3: summonername
        4: playertype
      ]
    3: bot_count;
    4: loading_time(game start)
    5: game_time(gameEnd - gameStart)
    6: deaths
      [
        0: time_of_death0 - gameStart
        .
        .
        N: time_of_deathN - gameStart
      ]
    6: game_result
  ]
  */
  let filteredDB = [];
  let testDB = [];

  //  Bæta evenlistener á formið
  document.getElementById('files').addEventListener('change', handleFileSelect, false);
  console.time('fileScanner');
  console.log('fileScanner started');
  //  Handler fyrir files
  function handleFileSelect(evt) {
    let files = evt.target.files; //  FileList object
    console.timeEnd('fileScanner');
    dataMinify(files);
  }

  function dataMinify(files) {
    //  files is a FileList of File objects. List some properties.
    let numOfFiles = 0;
    let counter = 0;
    console.time('lestur');
    console.log('lestur hefst');
    //  loopum i gegnum alla filea sem ad vid fengum
    for (let f; f = files[numOfFiles]; numOfFiles += 1) {
      const reader = new FileReader();

      //  thegar ad skjal er loadad keyrum adgerd
      reader.onload = function () {
        const text = reader.result;
        //  splittum a new line
        const textArray = text.split('\n');

        //  Saekjum thau gogn sem vid hofum ahuga a
        const reducedArray = textArray.filter(function (input) {
          return (input.includes('GAMESTATE_GAMELOOP Begin') ||
                  input.includes('"exit_code":"EXITCODE') ||
                  input.includes('Spawning champion') ||
                  input.includes('Build Version: Version') ||
                  input.includes('The Killer was'));
        });

        //  sækjum dagsetningu, og þvingum hana fremst í array
        const dateIndex = textArray[0].indexOf('started at') + 11;
        const date = stringToDate(textArray[0].substring(dateIndex, dateIndex + 19));
        reducedArray.unshift(date);

        testDB.push(reducedArray);
        counter += 1;
        /*if (counter % 20 === 0) {

          console.log('yo, we at file nr: ' + counter);
        }*/
        if (counter === numOfFiles) {
          console.timeEnd('lestur');
          procTest();
        }
      };
      reader.readAsText(f);
    }
  }

  //  Formatta streng og typecast yfir a date format
  function stringToDate(stringDate) {
    stringDate = stringDate.replace('T', ' ').replace(/-/g, '/');
    return new Date(stringDate);
  }

  /**
  Hérna hefst keyrsla á úrvinnslufallinu
  **/

  function procTest() {
    console.time('vinnslutimer');
    console.log('vinnsla hefst');
    testDB.forEach(function (textFile) {
      // býr til infofylkið
      try {
        const infoArray = {
          date: textFile.shift(),
          patch: null,
          players: [],
          bot_count: 0,
          loading_time: null,
          game_time: null,
          deaths: [],
          game_result: null,
        };
        // infoArray.patch
        const patchLine = textFile.shift();
        const patchStart = patchLine.substring(patchLine.indexOf('Build Version: Version') + 23);
        const patchString = patchStart.substring(0, patchStart.indexOf('.', 3));
        const patchSplit = patchString.split('.');
        infoArray.patch = patchString - 0;
        // if patch less then 3.10 throw away
        if (patchSplit[0] > 3 || (patchSplit[0] === 3 || patchSplit[1] > 9)) {
          // infoArray.game_time && infoArray.game_result
          const gameEndLine = textFile.filter(function (input) {
            return (input.includes('"exit_code":"EXITCODE'));
          })[0];
          // infoArray.game_result
          const gameResultCarNr = gameEndLine.indexOf('"Game exited","exit_code":"');
          infoArray.game_result = gameEndLine.substring(gameResultCarNr + 36, gameResultCarNr + 37);
          // if abandoned game, throw away
          if(infoArray.game_result !== 'A') {
            // infoArray.players
            const summonerArray = textFile.filter(function (input) {
              return (input.includes('Spawning champion'));
            });
            summonerArray.forEach(function (item) {
              const tempChamp = item.substring(item.indexOf('(') + 1, item.indexOf(')'));
              item = item.substring(item.indexOf(')') + 1);
              const tempSkin = item.substring(item.indexOf('skinID') + 7, item.indexOf('skinID') + 8);
              const tempTeam = item.substring(item.indexOf('team') + 5, item.indexOf('team') + 6);
              const tempName = item.substring(item.indexOf('(') + 1, item.indexOf(')'));
              item = item.substring(item.indexOf(')') + 1);
              const tempType = item.substring(item.indexOf('(') + 1, item.indexOf(')'));
              if (tempType === 'is BOT AI') {
                infoArray.bot_count += 1;
              } else {
                const playerArray = {
                  // k
                  champion: null,
                  skin: null,
                  team: null,
                  summonername: null,
                  playertype: null,
                };
                playerArray.champion = tempChamp;
                playerArray.skin = tempSkin;
                playerArray.team = tempTeam;
                playerArray.summonername = tempName;
                playerArray.playertype = tempType;
                infoArray.players.push(playerArray);
              }
            });
            // infoArray.loading_time
            infoArray.loading_time = textFile.filter(function (input) {
              return (input.includes('GAMESTATE_GAMELOOP Begin'));
            })[0].substring(0, 10) - 0;
            // infoArray.game_time
            infoArray.game_time = gameEndLine.substring(0, 10) - infoArray.loading_time;
            // infoArray.deaths
            const deathArray = textFile.filter(function (input) {
              return (input.includes('The Killer was'));
            });
            deathArray.forEach(function (item) {
              const deathTime = item.substring(0, 10) - infoArray.loading_time;
              infoArray.deaths.push(deathTime);
            });
            filteredDB.push(infoArray);
          } else {
            console.log('abandoned game, not used');
          }
        } else {
          console.log('file to old');
        }
      }
      catch(err) {
        console.log('error');
      }
    });
    console.log(filteredDB);
    console.timeEnd('vinnslutimer');
    urvinnsla();
  }

  // öll föll sem sjá um vinnslu verður kallað úr hér
  function urvinnsla() {
    vinnaFylki();

    fillChart('Hour', gameByHour);

  }
  // array með deaths flokkað eftir sekúndu
  const deathAtMinute = {};
  // array sem geymir death og gamelength saman
  const death_and_gameLength_and_result = [];
  // geymir total load time
  let loadingTime = 0;
  // geymir total play time
  let playTime = 0;
  // geymir wins og losses
  const winsLosses = {
    W: 0,
    L: 0,
  };
  //hvaða dag, viku ár etc... spilaru á
  // listOfProperties heldur utan um hvað er búið að pusha inn í.
  const gameByHour = {
    listOfProperties: [],
  };
  const gameByDay = {
    listOfProperties: [],
  };
  const gameByMonthDay = {
    listOfProperties: [],
  };
  const gameByMonth = {
    listOfProperties: [],
  };
  const gameByYear = {
    listOfProperties: [],
  };
  const gameByAll = {
    listOfProperties: [],
  };

  // fall sem keyrir í gegnum filteredDB fylkið
  function vinnaFylki() {
    // fyrir hvert stak, arrayStak, í fylkinu filteredDB
    filteredDB.forEach(function (arrayStak) {
      //fyrir hvern death hvern death
      arrayStak.deaths.forEach(function (deathStak) {
        const deathToMinute = formatTime(deathStak)[1];
        if(!deathAtMinute[deathToMinute])
          deathAtMinute[deathToMinute] = 0;
        ++deathAtMinute[deathToMinute];
      });
      //finnur gildi fyrir death_and_gameLength_and_result
      const deathToLength = [arrayStak.deaths.length, arrayStak.game_time, arrayStak.game_result];
      death_and_gameLength_and_result.push(deathToLength)
      // finnur gildi í loadingTime og playTime
      loadingTime += arrayStak.loading_time;
      playTime += arrayStak.game_time;
      winsLosses[arrayStak.game_result] += 1;
      //
      gameBy(arrayStak.date);
    });
  }

  // hleður inn í gameByX
  // feel free að endurskrifa ef finnið betri leið, forljótt
  function gameBy(date) {
    if(!gameByHour[date.getHours()]) {
      gameByHour[date.getHours()] = 0;
      gameByHour.listOfProperties.push(date.getHours());
    }
    ++gameByHour[date.getHours()];

    if(!gameByDay[date.getDay()]){
      gameByDay[date.getDay()] = 0;
      gameByDay.listOfProperties.push(date.getDay());
    }
    ++gameByDay[date.getDay()];

    if(!gameByMonthDay[date.getDate()]){
      gameByMonthDay[date.getDate()] = 0;}
      gameByMonthDay.listOfProperties.push(date.getDate());
    ++gameByMonthDay[date.getDate()];

    if(!gameByMonth[date.getMonth()]){
      gameByMonth[date.getMonth()] = 0;
      gameByMonth.listOfProperties.push(date.getMonth());
    }
    ++gameByMonth[date.getMonth()];

    if(!gameByYear[date.getFullYear()]){
      gameByYear[date.getFullYear()] = 0;
      gameByYear.listOfProperties.push(date.getFullYear());
    }
    ++gameByYear[date.getFullYear()];

    const tempFullDate = [date.getDate(), date.getMonth(), date.getFullYear()];
    if(!gameByAll[tempFullDate]){
      gameByAll[tempFullDate] = 0;
      gameByAll.listOfProperties.push(tempFullDate);
    }
    ++gameByAll[tempFullDate];
  }

  // breytir sekúndum í formatið [hh, mm, ss]
  function formatTime(seconds) {
    const hour = Math.floor(seconds / 3600);
    const minute = Math.floor((seconds - hour * 3600) / 60);
    const second = seconds % 60;
    return [hour, minute, second];
  }

  // GRAPH FUNCTION
  function fillChart(value, whatArray, axisChanger) {

    console.log(value);
    var array1 = [[value, value]];
    // console.log(array1);
    var array2 = formatDataForChart(whatArray, axisChanger);
    var array3 = array1.concat(array2);
    XXX = array3;
    console.log(XXX);
    document.getElementById('graph').style.visibility = "visible";
    drawChart1(value);
  }
  var XXX = [];
  //function fillChart() {
  //formatDataForChart(gameByHour,);
  //google.load("visualization", "1", {packages:["corechart"]});
  google.setOnLoadCallback(drawChart1);
  function drawChart1(value) {
    //var data = google.visualization.arrayToDataTable(['Hour', 'Amount'].unshift(formatDataForChart(gameByHour)));
    var data = google.visualization.arrayToDataTable(XXX);

    var options = {
      title: 'Hvenar loadar in-game by:',
      hAxis: {title: value, titleTextStyle: {color: 'red'}}
      //vAxis: {title: 'Fjöldi', titleTextStyle: {color: 'red'}}
    };
    var chart = new google.visualization.ColumnChart(document.getElementById('chart_div1'));
    chart.draw(data, options);
  }
  //formatar fylki með 2 stökum þannig hægt er að nota google charts með því
  function formatDataForChart(whatArray, axisChanger){
    const dataItemSetArray = [];
    whatArray.listOfProperties.forEach(function (dateItem) {
      let dataItemSetArrayItem;
      console.log(dateItem);
      if(axisChanger === 'year') {
        var stringTime = dateItem[0] + '.' + month[dateItem[1]] + '.' + dateItem[2];
        dataItemSetArrayItem = [stringTime, whatArray[dateItem]];
      } else if(axisChanger) {
        dataItemSetArrayItem = [axisChanger[dateItem], whatArray[dateItem]];
      } else {
        dataItemSetArrayItem = [dateItem, whatArray[dateItem]];
      }

      dataItemSetArray.push(dataItemSetArrayItem);
    });
    return dataItemSetArray;
  }

  $(window).resize(function(){
    drawChart1();
  });
  // Reminder: you need to put https://www.google.com/jsapi in the head of your document or as an external resource on codepen //

}());
