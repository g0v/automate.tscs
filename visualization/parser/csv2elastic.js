'use strict'

var URL = 'http://127.0.0.1:9200/_bulk',
	MAX_N_PER_YEAR = 7200,
	N_DOWN_SAMPLE = 10, // sample 1 record every N_DOWN_SAMPLE
	YEAR_INDX = 85,
	N_PER_REQEST = 200,
	TAKE_A_BREAK = 2000,
	CSV = null;

var _ = require('underscore');
var exec = require('child_process').exec;
var request = require( 'request' );
var readline = require( 'n-readlines' );

var header = [
		't','quest','pweight','female','age','age2','cohort_y','zyear','cohorty','b_place', // 0-9
		'fethnic','spouse_ch','spouse','unmarried','married','married_1','married_2','married_3', 'married_4','educyr', // 10-19
		'seducyr','feducyr','edu_boy','edu_girl','patrilocala','patrilocalb','patrilineal','conflict1','conflict2','conflict3', // 20-29
		'poshi','divorce','lineage','ggran','gran','fm','hw','sib','sd3','gsd3', // 30-39
		'singlef','bigf','inf','coref','hwf','inc','lninc','incf','lnincf','greenvote', // 40-49
		'social','urbanize','kao','tpi','ntpc','religion','tvt','web','foreign','beench', // 50-59
		'hardship','background','rich','ilazy','wlazy','happiness','geron','auto','tittat','confuse', // 60-69
		'freesp','ig','mparty','powerb','judgei','protest','webprotest','demo','taiwanese','indepen', // 70-79
		'proinde','prouni','egp','workforce','wclass','year','grandf','ageg' // 80-87
	],
	ignoreList = {
		t: true,
		pweight: true // from 老師， pweight is usually not used in analysis
	},

	serial = 0,
	nSucceeded = 0,
	nRequest = 0,
	nRetry = 0,
	nLineInCSV = 0,
	sampleData = [],

	requestHeader = {
		index: {
			'_index': 'tscs',
			'_type': 'common88'
		}
	};



function createPoint( data, serial ) {

	// use 01/30 every year to avoid year underflow, since influx can only be
	// group by week instead of month or year.
	var matrix = {},
		timestamp = Date.parse( data[ YEAR_INDX ] + '-01-30' )/1000 + ( serial % MAX_N_PER_YEAR );

	header.forEach( function( attr, i ) {
		if( !ignoreList[ attr ] && data[i] !== '' ) {

			matrix[ attr ] = i;

			// tag name cannot exist in field, influxdb issue #3783
			tagString.push( [ 'tag-', attr, '=', data[i] ].join('') );
			fieldString.push( [ attr, '=', data[i] ].join('') );
		}
	});

	return MEASUREMENT_NAME + ',' + 
		tagString.join(',') + ' ' + 
		fieldString.join(',') + ' ' + timestamp;
}

function createRecord( line ) {

	var tokens = line.split( ',' );

	if( serial % N_DOWN_SAMPLE != 0 ) {
		return;
	}

	var timestamp = Date.parse( tokens[ YEAR_INDX ] + '-01-30' ) + ( serial % MAX_N_PER_YEAR ),

		nAttr = 0,
		matrix = {
			'@timestamp': timestamp
		};

	header.forEach( function( attr, i ) {
		if( !ignoreList[ attr ] && tokens[i] !== '' ) {

			matrix[ attr ] = tokens[i]-0;
			nAttr++;
		}
	});

	if( nAttr ) {
		var recordString = JSON.stringify( requestHeader ) + "\n" + JSON.stringify( matrix );
		sampleData.push( recordString );
	}
}

function processLine() {

	var line = lineReader.next();

	if( line ) {
		createRecord( line.toString('ascii').replace(/(\n|\r)+$/, ''));
		serial++;
	}

	if( !line || sampleData.length > N_PER_REQEST ) {
		nRequest++;
		sendRequest();
	} else {
		processLine();
	}

}

function sendRequest() {

	var thisBody = sampleData.join('\n');

	if( thisBody ) {

		request({
			method: 'POST',
			url: URL,
			body: thisBody
		}, function( error, response, body ) {
			if( response && response.statusCode == 200 ) {
				nSucceeded++;
				process.stdout.write( '\r' + (serial*100/nLineInCSV).toFixed(2) + '%, Retry: ' + nRetry );
				sampleData = [];
				processLine();
			} else if( response ) {
				nRetry++;
				setTimeout( sendRequest, TAKE_A_BREAK );
				console.log( body );
			} else {
				console.error( 'Sth wrong in http request.', error );
			}
		});

	}
}

if( process.argv.length < 3 ) {
	console.error( 'Usage: ' + process.argv.slice(0,2).join(' ') + ' <csv path> [downsampling by N]' );
	process.exit(1);
}

CSV = process.argv[2];

if( process.argv.length >= 4 ) {
	N_DOWN_SAMPLE = parseInt( process.argv[3], 10 );
	if( N_DOWN_SAMPLE <= 0 ) {
		N_DOWN_SAMPLE = 1000;
	}
}

var lineReader = new readline( CSV );

exec('wc -l ' + CSV, function( error, results ) {

	nLineInCSV = results.split(' ')[0];
	console.log( 'Total', nLineInCSV, 'lines. Start!' );

	processLine();
});

