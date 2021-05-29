// https://www.carlosag.net/tools/codetranslator/

function getVal(elemId) {
    return $(`#${elemId}`).val();
}

function setVal(elemId, val) {
    $(`#${elemId}`).val(val);
}

function calcTax(iIncome) {
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

    // TODO factor in tax credits, how age affects that

    return iTax;
}

function calcOas(iStartAge) {
    // 7.2% per year deferred
    return ((600 + (600 * (0.072 * (iStartAge - 65)))) * 12);
}

function calcCpp(iStartAge) {
    // 7.2% per year early, 8.4% late
    //
    let iCpp = (1134 * 12);
    if ((iStartAge < 65)) {
        iCpp = (iCpp - (iCpp * (0.072 * (65 - iStartAge))));
    }
    else if ((iStartAge > 65)) {
        iCpp = (iCpp + (iCpp * (0.084 * (iStartAge - 65))));
    }

    return iCpp;
}

function calcBridge(iYearsOfService) {
    return (0.00625 * (YMPE * iYearsOfService));
}

function calcPension(iYearsOfService, iAge, iAvgSalaryFive) {
    // aS   = average highest salary of five years in a row
    // y = years Of service up To 35
    // YMPE = maximum pensionable earnings = 57400 In 2019
    // unreduced annual amount = (max(As, YMPE) * 0.01375 * y) + (max(aS - ympe, 0) * 0.02 * y)
    let iUnreducedPension = ((Math.Max(iAvgSalaryFive, YMPE) * (0.01375 * iYearsOfService))
                + (Math.Max((iAvgSalaryFive - YMPE), 0) * (0.02 * iYearsOfService)));
    if ((iAge > 59)) {
        return iUnreducedPension;
    }
    else {
        // factor = 0.05 * (60 - age)
        // reduced  amount = unreduced * (1 - factor)
        return (iUnreducedPension * (1 - (0.05 * (60 - iAge))));
    }

}

function grindProjection() {

    // TODO have a function that rips out all the params, puts them in an array.
    //      can leverage that for the save, and this

    // algorithm:
    // For Each year
    // figure out what things are applicable
    // - rrsp
    // - cpp
    // - work p
    // - oas
    // subtract tax
    // expenses
    let iCppAmt = calcCpp(this.CppAge);
    let iOasAmt = calcOas(this.OasAge);
    let iYearsOfService = (this.QuitAge - this.StartAge);
    let iBridgeAmt = calcBridge(iYearsOfService);
    let iPensionAmt = calcPension(iYearsOfService, this.PensionAge, this.AvgSalary);
    let iExpenseAmt = totalExpenses();
    let iRRSPAmt = (this.RrspAmt / (1 + (RrspEnd - RrspStart)));
    let oReport; // list of strings/stuff
    oReport.Add(Tabify("Age", "Total Inc", "Net Inc", "RRSP", "CPP", "OAS", "PEN", "BRD", "TAX", "EXP"));
    for (let iAge = this.QuitAge; (iAge <= 95); iAge++) {
        let iRR = (((iAge >= this.RrspStart) && (iAge <= this.RrspEnd)) ? iRRSPAmt : 0 );
        let iCp = ((iAge >= this.CppAge) ? iCppAmt : 0 );
        let iOa = ((iAge >= this.OasAge) ? iOasAmt : 0 );
        let iBr = (((iAge >= this.PensionAge) && (iAge < 65)) ? iBridgeAmt : 0 );
        let iPn = ((iAge >= this.PensionAge) ? iPensionAmt : 0 );
        let iGross = (iRR + (iCp + (iOa + (iBr + iPn))));
        let iTax = calcTax(iGross);
        let iNet = (iGross - (iTax - iExpenseAmt));
        oReport.Add(Tabify(iAge, iGross, iNet, iRR, iCp, iOa, iPn, iBr, iTax, iExpenseAmt));
    }

    My.Computer.Clipboard.SetText(string.Join("", oReport.ToArray()));
}



var childDataStore = {};

// decode from the customized base64 format
function decode64(string) {
    return atob(string.replace(/_/g, '/').replace(/-/g, '+'));
}

// takes an array of properties, plus the property settings in bookmark encoding.
// returns a human readable string of the properties
function dataToText (props, info, version) {
    var lookup = {
        opacity: function (value) {
            if (version !== 'A' && value === '99') {
                value = '100';
            }
            return parseInt(value) / 100;
        },
        visibility: function (value) {
            return value === '1';
        },
        boundingBox: function (value) {
            return value === '1';
        },
        snapshot: function (value) {
            return value === '1';
        },
        query: function (value) {
            return value === '1';
        }
    };

    var result = '';

    props.forEach(function(prop, index) {
        result += (prop + ': ' + lookup[prop](info[index]) + ', ' );
    });
    return result;
}

// returns a human readable string of properties for a child layer fragment of a bookmark
function childDataToText(childData, version) {
    var cFormat = /^(\d{2})(\d{1})(\d{1})(.+?)$/;
    var cInfo = childData.match(cFormat);
    return 'service index: ' + cInfo[4] + ', ' + dataToText([, 'opacity', 'visibility', 'query'], cInfo, version);
};

// keeping things totally separate to avoid piles of IF statements

function decodeVerA(bookmark) {

    var pattern = /^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)(?:$|,(.*)$)/i;
    // things for specific layers:[ layer type name, regex to strip data from id, regex to parse data, property names in data ]
    var layerSpec = [
        ['Feature', /^(.+?)(\d{7})$/, /^(\d{3})(\d{1})(\d{1})(\d{1})(\d{1})$/, [, 'opacity', 'visibility', 'boundingBox', 'snapshot', 'query']],
        ['Wms', /^(.+?)(\d{6})$/, /^(\d{3})(\d{1})(\d{1})(\d{1})$/, [, 'opacity', 'visibility', 'boundingBox', 'query']],
        ['Tile', /^(.+?)(\d{5})$/, /^(\d{3})(\d{1})(\d{1})$/, [, 'opacity', 'visibility', 'boundingBox']],
        ['Dynamic', /^(.+?)(\d{6})$/, /^(\d{3})(\d{1})(\d{1})(\d{1})$/, [, 'opacity', 'visibility', 'boundingBox', 'query']],
        ['Image', /^(.+?)(\d{5})$/, /^(\d{3})(\d{1})(\d{1})$/, [, 'opacity', 'visibility', 'boundingBox']]
    ];

    var info = bookmark.match(pattern);
    var version = info[1];
    var decoded = [2, 3, 4, 5].map(function (i) { return decode64(info[i]); });

    $('#version').val( 'A' );
    $('#scale').val( decoded[3] );
    $('#basemap').val( decoded[0] );
    $('#x').val( decoded[1] );
    $('#y').val( decoded[2] );

    var layerList = $('#layers')[0];
    clearList(layerList);
    childDataStore = {};

    if (info[6]) {
        var layers = info[6].split(',');

        // Generate text for all layers
        layers.forEach(function (layer, i) {
            layer = decode64(layer);

            // strip out integer that defines the layer type
            var layerType = parseInt(layer.substring(0, 2));
            // split the remaining data into layer id and layer data
            var layerGuts = layer.substring(2).match(layerSpec[layerType][1]);
            var layerId = layerGuts[1];
            // parse the data into discrete parts, specific to the layer type
            var layerData = layerGuts[2].match(layerSpec[layerType][2]);

            // show the raw data, and then a human friendly version of it
            var opt = document.createElement("option");
            opt.text = layerSpec[layerType][0] + ' Layer, id: ' + layerId + ', ' +
                    dataToText(layerSpec[layerType][3], layerData, 'A');
            opt.value = i;
            layerList.add(opt);

        });

    }
}

function clearList(listControl) {
    while (listControl.firstChild) {
        listControl.removeChild(listControl.firstChild);
    }
}

function dataToTextB (props, info) {

    var result = '';

    props.forEach(function(prop) {
        result += (prop + ': ' + info[prop].toString() + ', ' );
    });
    return result;
}

function encodeInteger(value, bitSize) {
    var binary = value.toString(2);
    return '0'.repeat(bitSize - binary.length) + binary;
}

function decodeBoolean(value) {
    // very complex
    return value === '1';
}

function hexToBinary(value) {
    var hexes = value.match(/./g); // split into single chars
    return hexes.map(function(h) {
        return encodeInteger(parseInt(h, 16), 4); // 4-digit padded binary
    }).join('');
}

function decodeOpacity(value) {
    return parseInt(value, 2) / 100;
}

function extractLayerSettings(layerSettingsHex) {
    var splitty = hexToBinary(layerSettingsHex).match(/^(.{7})(.)(.)(.)(.)(.{9})/);

    return {
        opacity: decodeOpacity(splitty[1]),
        visibility: decodeBoolean(splitty[2]),
        boundingBox: decodeBoolean(splitty[3]),
        snapshot: decodeBoolean(splitty[4]),
        query: decodeBoolean(splitty[5]),
        childCount: parseInt(splitty[6], 2)
    };
}

function extractChildSettings(childSettingsHex) {
    var splitty = hexToBinary(childSettingsHex).match(/^(.{7})(.)(.)(.)(.{12})/);

    return {
        opacity: decodeOpacity(splitty[1]),
        visibility: decodeBoolean(splitty[2]),
        query: decodeBoolean(splitty[3]),
        index: parseInt(splitty[5], 2),
        root: decodeBoolean(splitty[4])
    };
}

function decodeVerB(bookmark) {
    var pattern = /^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)(?:$|,(.*)$)/i;
    // things for specific layers:[ layer type name,  property names in data ]
    var layerSpec = [
        ['Feature', ['opacity', 'visibility', 'boundingBox', 'snapshot', 'query']],
        ['Wms', ['opacity', 'visibility', 'boundingBox', 'query']],
        ['Tile', ['opacity', 'visibility', 'boundingBox']],
        ['Dynamic', ['opacity', 'visibility', 'boundingBox', 'query', 'childCount']],
        ['Image', ['opacity', 'visibility', 'boundingBox']],
        ['WFS', ['opacity', 'visibility', 'boundingBox', 'snapshot', 'query']]
    ];

    var info = bookmark.match(pattern);
    var version = info[1];
    var decoded = [2, 3, 4, 5].map(function (i) { return decode64(info[i]); });

    // if we have the blank flag set, format it nicely
    var basemap = decoded[0].substring(0, decoded[0].length - 1);
    if (decoded[0].substr(decoded[0].length - 1, 1) === '1') {
        basemap = `blank basemap [${basemap}]`;
    }

    $('#version').val( 'B' );
    $('#scale').val( decoded[3] );
    $('#basemap').val( basemap );
    $('#x').val( decoded[1] );
    $('#y').val( decoded[2] );

    var layerList = $('#layers')[0];
    clearList(layerList);
    childDataStore = {};

    if (info[6]) {
        var layers = info[6].split(',');

        // Generate text for all layers
        layers.forEach(function (layer, i) {
            layer = decodeURIComponent(decode64(layer));

            // strip out hex char that defines the layer type
            var layerCode = parseInt(layer.substr(0, 1));

            // split the remaining data into layer id and layer data
            var layerSettings = extractLayerSettings(layer.substr(1, 5));
            var layerId = layer.substr(6 + (layerSettings.childCount * 6));

            // rip off child data if we are dynamic
            if (layerSettings.childCount > 0) {

                var textArray = [];
                var childrenInfo = layer.substr(6, layerSettings.childCount * 6);
                var childItems = childrenInfo.match(/.{6}/g);

                // process the children and store them in our persistant var, so it can be accessed if
                // someone clicks on the parent

                childItems.forEach(function (cData) {
                    var childSettings = extractChildSettings(cData);
                    var prefix = childSettings.root ? 'Root Child: ' : 'Non Root Child: ';

                    textArray.push( prefix  +
                        dataToTextB(['index', 'opacity', 'visibility', 'query' ], childSettings));
                });

                childDataStore[i.toString()] = textArray;

            }

            // show data
            var opt = document.createElement("option");
            opt.text = layerSpec[layerCode][0] + ' Layer, id: ' + layerId + ', ' +
                    dataToTextB(layerSpec[layerCode][1], layerSettings);
            opt.value = i;
            layerList.add(opt);

        });

    }
}

$(document).ready(function () {

    $('#cmdEnhance').click( function() {
        // enhance the bookmark into human readable form

        var bookmark = $('#encodebook').val();

        // if full URL is supplied, only take the rv param
        var keyStart = bookmark.indexOf('rv=');
        if (keyStart > -1) {
            var nextAnd = bookmark.indexOf('&', keyStart + 3);
            if (nextAnd === -1) {
                // no more url params after the bookmark, so set it up to read to the end of the string
                nextAnd = bookmark.length;
            }
            bookmark = bookmark.substring(keyStart + 3, nextAnd);
        }

        var version = bookmark.match(/^([^,]+)/)[0];

        switch (version) {
            case 'A':
                decodeVerA(bookmark);
                break;
            case 'B':
                decodeVerB(bookmark);
                break;
        }

    });

    $('#cmdRaw').click( function() {
        // enhance the bookmark into human readable form

        var bookmark = $('#encodebook').val();

        // if full URL is supplied, only take the rv param
        var keyStart = bookmark.indexOf('rv=');
        if (keyStart > -1) {
            var nextAnd = bookmark.indexOf('&', keyStart + 3);
            if (nextAnd === -1) {
                // no more url params after the bookmark, so set it up to read to the end of the string
                nextAnd = bookmark.length;
            }
            bookmark = bookmark.substring(keyStart + 3, nextAnd);
        }

        var rawOut = bookmark.split(',').map(function(nugget, idx) {
            if (idx === 0) {
                return nugget;
            } else {
                return decode64(nugget);
            }
        }).join(',');

        $('#rawout').val( rawOut );

    });

    $('#layers').click( function(e) {
        var idx = e.currentTarget.value;
        var childList = $('#childs')[0];

        clearList(childList);

        if (childDataStore[idx]) {
            // add some child stuff
            var textArray = childDataStore[idx];
            textArray.forEach(function(t, i) {

                var opt = document.createElement("option");
                opt.text = t;
                opt.value = i;
                childList.add(opt);

            });
        }
    });

});