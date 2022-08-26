// https://www.carlosag.net/tools/codetranslator/
// all amounts are for Ontario

const id = {
  bigMoney: "bigMoney",
  endAge: "endAge",
  endCountAll: "endCountAll",
  endCountLIRA: "endCountLIRA",
  endCountMRGN: "endCountMRGN",
  endCountRRSP: "endCountRRSP",
  endCountTFSA: "endCountTFSA",
  endShareVal: "endShareVal",
  endValAll: "endValAll",
  endValLIRA: "endValLIRA",
  endValMRGN: "endValMRGN",
  endValRRSP: "endValRRSP",
  endValTFSA: "endValTFSA",
  initLIRA: "initLIRA",
  initMRGN: "initMRGN",
  initRRSP: "initRRSP",
  initShareVal: "initShareVal",
  initTFSA: "initTFSA",
  note: "note",
  startMonth: "startMonth",
  startYear: "startYear",
  saveIn: "saveInput",
  yob: "yob",
};

const saveOrder = [
  id.yob,
  id.startYear,
  id.startMonth,
  id.endAge,
  id.initShareVal,
  id.bigMoney,
  id.initLIRA,
  id.initRRSP,
  id.initTFSA,
  id.initMRGN,
  id.note,
];

// TODO while historically accurate, this is way too swingy on gains. attempt to make a more conservative sampling (e.g. average around 4-7 gain, fewer wild years)
/*
const yearPerfSource = [
  31.1, -4.41, 21.94, 11.93, 1.31, 13.81, 32.43, 15.88, 2.07, 14.87, 27.11,
  -37.22, 5.46, 15.74, 4.79, 10.82, 28.72, -22.27, -11.98, -9.11, 21.11, 28.73,
  33.67, 23.06, 38.02, 1.19, 10.17, 7.6, 30.95, -3.42, 32.0, 16.64, 5.69, 19.06,
  32.24, 5.96, 23.13, 21.22, -5.33, 32.76, 18.69, 6.41, -7.78, 24.2, 38.46,
  -26.95, -15.03, 19.15, 14.54, 3.6,
];
*/

// magic made up variant
const yearPerfSource = [
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2,
  2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, -1, -1, -1, -1, -2, -2, -2, -2, -3, -3,
  -4, -5, -6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 11, 12,
];

function scramblePerf() {
  const copy = yearPerfSource.slice();
  const final = [];
  while (copy.length > 0) {
    const targ = Math.floor(Math.random() * copy.length);
    final.push(copy[targ] / 1200);
    copy.splice(targ, 1);
  }
  return final;
  // 1200 = turning value into percentage, and then splitting into 12 for months
  // return yearPerf[Math.floor(Math.random() * yearPerf.length)] / 1200;
}

function getVal(elemId) {
  return $(`#${elemId}`).val();
}

function setVal(elemId, val) {
  $(`#${elemId}`).val(val);
}

// returns object with same keys as id, but values are box values
function getAllInput() {
  const nugget = {};
  Object.values(id).map((prop) => {
    nugget[prop] = getVal(prop);
  });
  return nugget;
}

function t2i(textIn) {
  return parseInt(textIn);
}

function t2f(textIn) {
  return parseFloat(textIn);
}

function divvy(shareCount, sharePrice) {
  const payday = shareCount * 0.13;
  return Math.floor(payday / sharePrice);
}

function dolla(amount) {
  return amount.toFixed(2);
}

function putResults(iLIRA, iMRGN, iRRSP, iTFSA, fSharePrice) {
  const iTotalEndShares = iLIRA + iMRGN + iRRSP + iTFSA;
  setVal(id.endCountLIRA, iLIRA);
  setVal(id.endCountMRGN, iMRGN);
  setVal(id.endCountRRSP, iRRSP);
  setVal(id.endCountTFSA, iTFSA);
  setVal(id.endCountAll, iTotalEndShares);

  setVal(id.endValLIRA, dolla(iLIRA * fSharePrice));
  setVal(id.endValMRGN, dolla(iMRGN * fSharePrice));
  setVal(id.endValRRSP, dolla(iRRSP * fSharePrice));
  setVal(id.endValTFSA, dolla(iTFSA * fSharePrice));
  setVal(id.endValAll, dolla(iTotalEndShares * fSharePrice));

  setVal(id.endShareVal, dolla(fSharePrice));
}

function grindProjection() {
  const vals = getAllInput();

  // const yearPerf = scramblePerf();

  const newRoomTFSA = 6000;
  const newRoomRRSP = 3800;

  // working vars
  let yearCounter = t2i(vals[id.startMonth]) - 1;
  let currYearPerf = 0.002583; // 3.1% div 12 months // yearPerf.pop();
  let roomTFSA = Math.max(0, 3 - yearCounter) * (newRoomTFSA / 3);
  let roomRRSP =
    yearCounter <= 4 ? newRoomRRSP : yearCounter === 5 ? newRoomRRSP / 2 : 0;

  const fYob = t2f(vals[id.yob]);
  let fCurrMonth = t2i(vals[id.startYear]) + yearCounter / 12;
  const fEndAge = t2f(vals[id.endAge]);
  let fSharePrice = t2f(vals[id.initShareVal]);
  let iBigMoney = t2i(vals[id.bigMoney]);
  let iLIRA = t2i(vals[id.initLIRA]);
  let iMRGN = t2i(vals[id.initMRGN]);
  let iRRSP = t2i(vals[id.initRRSP]);
  let iTFSA = t2i(vals[id.initTFSA]);

  const iterations = Math.floor((fYob + fEndAge - fCurrMonth) * 12);

  for (let iMon = 0; iMon <= iterations; iMon++) {
    // have we rolled over to January?
    if (yearCounter > 11) {
      yearCounter = 0;
      roomRRSP += newRoomRRSP;
      roomTFSA += newRoomTFSA;
      // currYearPerf = yearPerf.pop();

      // inflation
      // iBigMoney = iBigMoney * 1.018;

      // TODO factor in RRSP refund? Do that in march? Or just assume factored into bigMoney?
    }

    let monthAmt = iBigMoney;

    // adjust share price
    fSharePrice += fSharePrice * currYearPerf;

    // is it a dividend month?
    if (yearCounter % 3 === 0) {
      iLIRA += divvy(iLIRA, fSharePrice);
      iMRGN += divvy(iMRGN, fSharePrice);
      iRRSP += divvy(iRRSP, fSharePrice);
      iTFSA += divvy(iTFSA, fSharePrice);
    }

    // do we have tfsa room?
    if (roomTFSA > fSharePrice) {
      const buyT = Math.min(roomTFSA, monthAmt);
      iTFSA += Math.floor(buyT / fSharePrice);
      monthAmt -= buyT;
      roomTFSA -= buyT;
    }

    // do we have rrsp room?
    if (roomRRSP > fSharePrice && monthAmt > fSharePrice) {
      const buyR = Math.min(roomRRSP, monthAmt);
      iRRSP += Math.floor(buyR / fSharePrice);
      monthAmt -= buyR;
      roomRRSP -= buyR;
    }

    // any leftovers go to margin
    if (monthAmt > fSharePrice) {
      iMRGN += Math.floor(monthAmt / fSharePrice);
    }

    // increase year counter
    yearCounter++;
  }

  // we are done. populate output fields
  putResults(iLIRA, iMRGN, iRRSP, iTFSA, fSharePrice);
}

function runSim() {
  let totRRSP = 0;
  let totLIRA = 0;
  let totTFSA = 0;
  let totMRGN = 0;
  let totPrice = 0;

  const numSims = 10000;

  for (i = 0; i < numSims; i++) {
    grindProjection();
    totLIRA += t2i(getVal(id.endCountLIRA));
    totRRSP += t2i(getVal(id.endCountRRSP));
    totTFSA += t2i(getVal(id.endCountTFSA));
    totMRGN += t2i(getVal(id.endCountMRGN));
    totPrice += t2f(getVal(id.endShareVal));
  }

  putResults(
    Math.floor(totLIRA / numSims),
    Math.floor(totMRGN / numSims),
    Math.floor(totRRSP / numSims),
    Math.floor(totTFSA / numSims),
    totPrice / numSims
  );
}

function saveData() {
  const vals = getAllInput();
  const saveString = saveOrder.map((s) => vals[s]).join("~");
  const save64 = btoa(saveString);
  setVal(id.saveIn, save64);
  // TODO easy way to put in clipboard?
}

function loadData() {
  // get value, decode, split into array
  const save64 = getVal(id.saveIn);
  const saveString = atob(save64);
  const saveVals = saveString.split("~");

  // stuff into fields
  saveOrder.forEach((sId, i) => setVal(sId, saveVals[i]));

  // enhance
  grindProjection();
}

function copyData() {
  const saveField = document.getElementById(id.saveIn);

  // Select the text field
  saveField.select();
  saveField.setSelectionRange(0, 99999);

  // Copy the text inside the text field
  document.execCommand("copy");
}

function exportGrid() {
  let sOut = "";

  for (var i = 0, row; (row = table.rows[i]); i++) {
    //iterate through rows
    let valArr = [];
    for (var j = 0; j < row.cells.length; j++) {
      var cell = row.cells[j];
      valArr.push(cell.innerHTML);
    }
    sOut += valArr.join("\t") + "\n";
  }

  // temp text area to handle hard returns in grid export
  const exportTextarea = document.createElement("textarea");

  exportTextarea.innerHTML = sOut;

  const parentElement = document.getElementById("divExport");
  parentElement.appendChild(exportTextarea);

  exportTextarea.select();
  exportTextarea.setSelectionRange(0, 99999);

  document.execCommand("copy");

  parentElement.removeChild(exportTextarea);
}

// click handlers
$(document).ready(function () {
  $("#cmdEnhance").click(function () {
    // run a projection
    grindProjection();
  });

  $("#cmdSave").click(function () {
    saveData();
  });

  $("#cmdLoad").click(function () {
    loadData();
  });

  $("#cmdSim").click(function () {
    runSim();
  });

  /*

  $("#cmdCopy").click(function () {
    copyData();
  });

  $("#cmdExport").click(function () {
    exportGrid();
  });
  */
});
