// https://www.carlosag.net/tools/codetranslator/
// all amounts are for Ontario

const id = {
    ccp: 'ccp',
    desc: 'desc',
    empEnd: 'empEnd',
    empStart: 'empStart',
    expn: 'expenses',
    liraBal: 'liraBal',
    liraStart: 'liraStart',
    oas: 'oas',
    pension: 'pension',
    rrspBal: 'rrspBal',
    rrspStart: 'rrspStart',
    rrspEnd: 'rrspEnd',
    salary: 'salary',
    saveIn: 'saveInput',
    table: 'dataTable',
    yob: 'yob',
}

const saveOrder = [ id.yob, id.empStart, id.empEnd, id.oas, id.ccp, id.pension, id.salary, id.expn, id.rrspBal, id.rrspEnd, id.rrspStart, id.liraBal, id.liraStart, id.desc ];

// 2020 values
const YMPE = 58700;
const AMPE = 56440;

const table = document.getElementById(id.table);

// 0 index === age 55
const liraMax = [6.51, 6.57, 6.63, 6.70, 6.77, 6.85, 6.94, 7.04, 7.14, 7.26, 7.38, 7.52, 7.67, 7.83, 8.02, 8.22, 8.45, 8.71, 9.00, 9.34, 9.71, 10.15, 10.66, 11.25, 11.96, 12.82, 13.87, 15.19, 16.90, 19.19, 22.40, 27.23, 35.29, 51.46, 100.00];

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
        cell.innerHTML = t2i(tVal);
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
    Object.values(id).map(prop => {
        nugget[prop] = getVal(prop);
    });
    return nugget;
}

function t2i(textIn) {
    return parseInt(textIn);
}

function calcTax(iIncome, iAge) {
    // TODO update to 2020 brackets/rates
    let iTax;
    // fed
    // 15% on the first $47,630 of taxable income, plus.
    // 20.5% on the next $47,629 of taxable income (on the portion of taxable income over 47,630 up to $95,259), plus.
    // 26% on the next $52,408 of taxable income (on the portion of taxable income over $95,259 up to $147,667), plus.
    iTax = (iIncome * 0.15);
    if ((iIncome > 47629)) {
        iTax = (iTax + ((iIncome - 47629) * (0.205 - 0.15)));
        if ((iIncome > 95259)) {
            iTax = (iTax + ((iIncome - 95259) * (0.26 - 0.205)));
        }
    }

    // ont
    // first $43,906    5.05%
    // over $43,906 up To $87,813    9.15%
    // over $87,813 up To $150,000    11.16%
    iTax = (iTax + (iIncome * 0.0505));
    if ((iIncome > 43906)) {
        iTax = (iTax + ((iIncome - 43906) * (0.0915 - 0.0505)));
        if ((iIncome > 87813)) {
            iTax = (iTax + ((iIncome - 87813) * (0.1116 - 0.915)));
        }
    }

    // tax credits

    // PESRSONAL AMOUNT
    let canCred = 13229;
    let ontCred = 10783;

    // AGE AMOUNT
    if (iAge > 64) {
        // 2020 rates
        canCred += (7637 - (Math.max(0, iIncome - 38508) * 0.15 ));
        ontCred += (5265 - (Math.max(0, iIncome - 39546) * 0.15 ));
    }

    // PENSION INCOME AMOUNT
    // assuming will always have > 2000 income as pensionable (LIRA, CPSP)
    if (iAge > 64) {
        // 2020 rates
        canCred += 2000;
        ontCred += 1500;

    }

    iTax = iTax - ((canCred * 0.15) + (ontCred * 0.0505));

    return iTax;
}

function calcOas(iStartAge) {
    // 7.2% per year deferred
    // 2020 Rate (Guess)
    return ((609 + (609 * (0.072 * (iStartAge - 65)))) * 12);
}

function calcCpp(iStartAge) {
    // 7.2% per year early, 8.4% late
    // to get maximum, you need to contribute max amount for at least 39 years
    // age 55 is ~ 29 yrs
    // can view statement of contribution at https://www.canada.ca/en/employment-social-development/services/my-account.html
    // check out https://retirehappy.ca/enhanced-cpp/ and http://www.holypotato.net/?p=1694
    let iCpp = ( 625 * 12); // online calculator indicates the monthly is more like $625, not $1134
    if ((iStartAge < 65)) {
        iCpp = (iCpp - (iCpp * (0.072 * (65 - iStartAge))));
    } else if ((iStartAge > 65)) {
        iCpp = (iCpp + (iCpp * (0.084 * (iStartAge - 65))));
    }

    return iCpp;
}

function calcBridge(iYearsOfService) {
    return 0.00675 * AMPE * iYearsOfService;
}

function calcPension(iYearsOfService, iAge, iAvgSalaryFive) {
    // aS   = average highest salary of five years in a row
    // y = years Of service up To 35
    // AMPE = average pensionable earnings
    // unreduced annual amount = (max(As, AMPE) * 0.01375 * y) + (max(aS - ampe, 0) * 0.02 * y)
    // https://www.canada.ca/en/treasury-board-secretariat/services/pension-plan/plan-information/retirement-income-sources.html
    let iUnreducedPension = ((Math.min(iAvgSalaryFive, AMPE) * (0.01375 * iYearsOfService))
                + (Math.max((iAvgSalaryFive - AMPE), 0) * (0.02 * iYearsOfService)));

    if ((iAge > 59)) {
        return iUnreducedPension;
    } else {
        // factor = 0.05 * (60 - age)
        // reduced  amount = unreduced * (1 - factor)
        return (iUnreducedPension * (1 - (0.05 * (60 - iAge))));
    }

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
    const iRrspAmt = t2i(vals[id.rrspBal]);
    const iRrspEnd = t2i(vals[id.rrspEnd]);
    const iRrspStart = t2i(vals[id.rrspStart]);
    const iLraStart = t2i(vals[id.liraStart]);
    let iLiraAmt = t2i(vals[id.liraBal]);

    // algorithm:
    // For Each year
    // figure out what things are applicable
    // - rrsp
    // - cpp
    // - work p
    // - oas
    // subtract tax
    // expenses
    const iCppAmt = calcCpp(iCppAge);
    const iOasAmt = calcOas(iOasAge);
    const iYearsOfService = (iQuitAge - iStartAge);
    const iBridgeAmt = calcBridge(iYearsOfService);
    const iPensionAmt = calcPension(iYearsOfService, iPensionAge, iAvgSalary);
    const iRRSPAmt = (iRrspAmt / (1 + (iRrspEnd - iRrspStart))); // this is wrong, seems to be dropping a year

    clearTable();

    for (let iAge = iQuitAge; (iAge <= 95); iAge++) {
        const iRR = (((iAge >= iRrspStart) && (iAge <= iRrspEnd)) ? iRRSPAmt : 0 );
        const iCp = ((iAge >= iCppAge) ? iCppAmt : 0 );
        const iOa = ((iAge >= iOasAge) ? iOasAmt : 0 );
        const iBr = (((iAge >= iPensionAge) && (iAge < 65) && (iAge > 54)) ? iBridgeAmt : 0 );
        const iPn = ((iAge >= iPensionAge) ? iPensionAmt : 0 );
        let iLira = 0;
        if ((iAge > 54) && (iAge >= iLraStart) && (iLiraAmt > 0)) {
            iLira = iLiraAmt * (liraMax[iAge - 55] / 100.0);
            iLiraAmt -= iLira;
        }
        const iGross = iRR + iCp + iOa + iBr + iPn + iLira;
        const iTax = calcTax(iGross, iAge);
        const iNet = (iGross - (iTax + iExpenseAmt));


        // "Year", "Age", "Total Inc", "Net Inc", "TAX", "RRSP", "LIRA", "CPP", "OAS", "PEN", "BRD"
        addRow([iYob + iAge, iAge, iGross, iNet, iTax, iRR, iLira, iCp, iOa, iPn, iBr]);
    }

    // find something else?
    //My.Computer.Clipboard.SetText(string.Join("", oReport.ToArray()));
}


function saveData() {
    const vals = getAllInput();
    const saveString = saveOrder.map(s => vals[s]).join('~');
    const save64 = btoa(saveString);
    setVal(id.saveIn, save64);
    // TODO easy way to put in clipboard?
}

function loadData() {

    // get value, decode, split into array
    const save64 = getVal(id.saveIn);
    const saveString = atob(save64);
    const saveVals = saveString.split('~');

    // stuff into fields
    saveOrder.forEach((sId, i) => setVal(sId, saveVals[i]));

    // enhance
    grindProjection();
}


// click handlers
$(document).ready(function () {

    $('#cmdEnhance').click( function() {
        // run a projection
        grindProjection();
    });

    $('#cmdSave').click( function() {
        saveData();
    });

    $('#cmdLoad').click( function() {
        loadData();
    });

});