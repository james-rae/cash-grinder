// https://www.carlosag.net/tools/codetranslator/
// all amounts are for Ontario

const id = {
  ccp: "ccp",
  cohortA: "cohortA",
  desc: "desc",
  empEnd: "empEnd",
  empStart: "empStart",
  expn: "expenses",
  liraBal: "liraBal",
  liraStart: "liraStart",
  oas: "oas",
  pension: "pension",
  rrspBal: "rrspBal",
  rrspStart: "rrspStart",
  rrspEnd: "rrspEnd",
  salary: "salary",
  saveIn: "saveInput",
  table: "dataTable",
  yob: "yob",
};

const saveOrder = [
  id.yob,
  id.empStart,
  id.empEnd,
  id.oas,
  id.ccp,
  id.pension,
  id.salary,
  id.expn,
  id.rrspBal,
  id.rrspEnd,
  id.rrspStart,
  id.liraBal,
  id.liraStart,
  id.desc,
];

// 2023 values
const YMPE = 66600;
const AMPE = 61840;

const table = document.getElementById(id.table);

// 0 index === age 55
const liraMax = [
  6.51, 6.57, 6.63, 6.7, 6.77, 6.85, 6.94, 7.04, 7.14, 7.26, 7.38, 7.52, 7.67,
  7.83, 8.02, 8.22, 8.45, 8.71, 9.0, 9.34, 9.71, 10.15, 10.66, 11.25, 11.96,
  12.82, 13.87, 15.19, 16.9, 19.19, 22.4, 27.23, 35.29, 51.46, 100.0,
];

function clearTable() {
  while (table.rows.length > 1) {
    // delete last row
    table.deleteRow(-1);
  }
}

function addRow(inputArray) {
  const newRow = table.insertRow(-1);
  inputArray.forEach((tVal, i) => {
    const cell = newRow.insertCell(i);
    cell.innerHTML = t2i(tVal); // cast to int for cheap rounding
  });
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

function calcTax(iIncome, iAge) {
  // currently at 2023 tax year values
  let iTax;
  // fed
  // 15% on the first $53,395 of taxable income, plus.
  // 20.5% on the next $53,322 of taxable income (on the portion of taxable income over $53,395 up to $106,717), plus.
  // 26% on the next $58,713 of taxable income (on the portion of taxable income over $106,717 up to $165,430), plus.
  iTax = iIncome * 0.15;
  const fedBracket1 = 53395;
  const fedBracket2 = 106717;
  if (iIncome > fedBracket1) {
    iTax = iTax + (iIncome - fedBracket1) * (0.205 - 0.15);
    if (iIncome > fedBracket2) {
      iTax = iTax + (iIncome - fedBracket2) * (0.26 - 0.205);
    }
  }

  // ont
  // first $49,231    5.05%
  // over $49,231 up To $98,463    9.15%
  // over $98,463 up To $150,000    11.16%
  iTax = iTax + iIncome * 0.0505;
  const ontBracket1 = 49231;
  const ontBracket2 = 98463;
  if (iIncome > ontBracket1) {
    iTax = iTax + (iIncome - ontBracket1) * (0.0915 - 0.0505);
    if (iIncome > ontBracket2) {
      iTax = iTax + (iIncome - ontBracket2) * (0.1116 - 0.915);
    }
  }

  // tax credits

  // PESRSONAL AMOUNT (2023)
  let canCred = 15000;
  let ontCred = 11865;

  // AGE AMOUNT
  if (iAge > 64) {
    // 2023 rates
    canCred += 8369 - Math.max(0, iIncome - 42335) * 0.15;
    ontCred += 5793 - Math.max(0, iIncome - 43127) * 0.15;
  }

  // PENSION INCOME AMOUNT
  // assuming will always have > 2000 income as pensionable (LIRA, CPSP)
  if (iAge > 64) {
    // 2023 rates
    canCred += 2000;
    ontCred += 1641;
  }

  iTax = iTax - (canCred * 0.15 + ontCred * 0.0505);

  return iTax;
}

function calcOas(iStartAge) {
  // 7.2% per year deferred
  // 2023 Rate
  return (707 + 707 * (0.072 * (iStartAge - 65))) * 12;
}

function calcCpp(iStartAge, iQuitAge) {
  // 7.2% per year early, 8.4% late
  // to get maximum, you need to contribute max amount for at least 39 years
  // age 55 is ~ 29 yrs
  // can view statement of contribution at https://www.canada.ca/en/employment-social-development/services/my-account.html
  // check out https://retirehappy.ca/enhanced-cpp/ and http://www.holypotato.net/?p=1694
  // ---
  // updated. age 55 is ~ 31 years. Current max monthly in 2023 is $1306.
  // use formula (years/40)*max month
  // using prediction site, got 1243 so pretty close

  let iCpp = 1306 * (Math.min(31 - (55 - iQuitAge), 40) / 40) * 12;
  if (iStartAge < 65) {
    iCpp = iCpp - iCpp * (0.072 * (65 - iStartAge));
  } else if (iStartAge > 65) {
    iCpp = iCpp + iCpp * (0.084 * (iStartAge - 65));
  }

  return iCpp;
}

function calcBridge(iYearsOfService) {
  return 0.00675 * AMPE * iYearsOfService;
}

function calcPension(iYearsOfService, iAge, iAvgSalaryFive, iTireAge) {
  if (iAge < iTireAge - 10) {
    return 0;
  }

  // aS   = average highest salary of five years in a row
  // y = years Of service up To 35
  // AMPE = average pensionable earnings
  // unreduced annual amount = (max(As, AMPE) * 0.01375 * y) + (max(aS - ampe, 0) * 0.02 * y)
  // https://www.canada.ca/en/treasury-board-secretariat/services/pension-plan/plan-information/retirement-income-sources.html
  let iUnreducedPension =
    Math.min(iAvgSalaryFive, AMPE) * (0.01375 * iYearsOfService) +
    Math.max(iAvgSalaryFive - AMPE, 0) * (0.02 * iYearsOfService);

  if (iAge > iTireAge - 1) {
    return iUnreducedPension;
  }

  // factor = 0.05 * (60 - age)
  // reduced  amount = unreduced * (1 - factor)
  return iUnreducedPension * (1 - 0.05 * (iTireAge - iAge));
}

function grindProjection() {
  // TODO have a function that rips out all the params, puts them in an array.
  //      can leverage that for the save, and this

  // TODO add in LIRA

  const vals = getAllInput();

  const iYob = t2i(vals[id.yob]);
  const iStartAge = t2i(vals[id.empStart]);
  const iQuitAge = t2i(vals[id.empEnd]);
  const iOasAge = t2i(vals[id.oas]);
  const iCppAge = t2i(vals[id.ccp]);
  const iPensionAge = t2i(vals[id.pension]);
  const iAvgSalary = t2i(vals[id.salary]);
  const iExpenseAmt = t2i(vals[id.expn]);

  const iRrspEnd = t2i(vals[id.rrspEnd]);
  const iRrspStart = t2i(vals[id.rrspStart]);
  const iLraStart = t2i(vals[id.liraStart]);
  let iLiraAmt = Math.floor(t2i(vals[id.liraBal]) / 2); // lira trick. half goes to rrsp
  const iRrspAmt = t2i(vals[id.rrspBal]) + iLiraAmt;
  let stdPensionAge;
  if ($("#cohortA").prop("checked")) {
    stdPensionAge = 60;
  } else {
    stdPensionAge = 65;
  }

  // algorithm:
  // For Each year
  // figure out what things are applicable
  // - rrsp
  // - cpp
  // - work p
  // - oas
  // subtract tax
  // expenses
  const iCppAmt = calcCpp(iCppAge, iQuitAge);
  const iOasAmt = calcOas(iOasAge);
  const iYearsOfService = iQuitAge - iStartAge;
  const iBridgeAmt = calcBridge(iYearsOfService);
  const iPensionAmt = calcPension(
    iYearsOfService,
    iPensionAge,
    iAvgSalary,
    stdPensionAge
  );
  const iRRSPAmt = iRrspAmt / (1 + (iRrspEnd - iRrspStart)); // this is wrong, seems to be dropping a year

  clearTable();

  for (let iAge = iQuitAge; iAge <= 95; iAge++) {
    const iRR = iAge >= iRrspStart && iAge <= iRrspEnd ? iRRSPAmt : 0;
    const iCp = iAge >= iCppAge ? iCppAmt : 0;
    let iOa = iAge >= iOasAge ? iOasAmt : 0;
    if (iAge > 74) {
      // starting 2022, OAS increases 10% at age 75 and up
      iOa = iOa * 1.1;
    }
    const iBr = iAge >= iPensionAge && iAge < 65 && iAge > 54 ? iBridgeAmt : 0;
    const iPn = iAge >= iPensionAge ? iPensionAmt : 0;
    let iLira = 0;
    if (iAge > 54 && iAge >= iLraStart && iLiraAmt > 0) {
      iLira = iLiraAmt * (liraMax[iAge - 55] / 100.0);
      iLiraAmt -= iLira;
    }
    const iGross = iRR + iCp + iOa + iBr + iPn + iLira;
    const iTax = calcTax(iGross, iAge);
    const iNet = iGross - (iTax + iExpenseAmt);

    // "Year", "Age", "Total Inc", "Net Inc", "TAX", "RRSP", "LIRA", "CPP", "OAS", "PEN", "BRD"
    addRow([
      iYob + iAge,
      iAge,
      iGross,
      iNet,
      iTax,
      iRR,
      iLira,
      iCp,
      iOa,
      iPn,
      iBr,
    ]);
  }

  // find something else?
  //My.Computer.Clipboard.SetText(string.Join("", oReport.ToArray()));
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

  $("#cmdCopy").click(function () {
    copyData();
  });

  $("#cmdExport").click(function () {
    exportGrid();
  });
});
