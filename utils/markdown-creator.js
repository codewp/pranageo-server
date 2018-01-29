const exec     = require('child_process').exec;
const fs       = require('fs');
const request  = require('request');
const cheerio  = require('cheerio');
const redis    = require('redis');
const config   = require('../config');
const RMD_Ext  = '.Rmd';
const MD_Ext   = '.md';

/**
 * Creating a markdown file from html and converting it to Rmd file.
 *
 * @since  1.0.0
 * @param  string   source
 * @param  int      index
 * @param  function callback
 */
function createMarkdown(source, index, callback) {
	if (! source) {
		return callback(new Error('Source required to creating markdown.'));
	}

	var name = source.split('/').pop().split('.').shift();
	if (name && name.length) {
		if (! fs.existsSync(config.FILES_DIR + name + RMD_Ext)) {
			exec('pandoc https://cran.r-project.org/' + source + ' -o ' + config.FILES_DIR + name + MD_Ext, (error, stdout, stderr) => {
				if (error) {
					return callback(new Error('Error occurred in converting html file to markdown file.'));
				}

				convertToRMarkdown(config.FILES_DIR + name + MD_Ext, function(error, value) {
					if (error || ! value) {
						return callback(new Error('Error occurred in converting markdown file to Rmarkdown file.'));
					}

					return callback(false, 'download/' + name + RMD_Ext, index);
				});
			});
		} else {
			return callback(false, 'download/' + name + RMD_Ext, index);
		}
	} else {
		return callback(new Error('error occurred in getting html file name.'));
	}
}

/**
 * Converting a markdown file to Rmd file.
 *
 * @since  1.0.0
 *
 * @param  string   fileName
 * @param  function callback
 */
function convertToRMarkdown(fileName, callback) {
	if (! fileName) {
		return callback(new Error('file name is required'), false);
	}

	fs.readFile(fileName, 'utf8', (err, data) => {
		if (err) {
			return callback(err, false);
		}
		if (data) {
			data = data.replace(new RegExp('``` {.example}', 'g'), '```{r}');
			fs.writeFile(fileName, data, (err) => {
				if (err) {
					return callback(new Error('error occurred in writing file.'), false);
				}

				fs.rename(fileName, fileName.substr(0, fileName.lastIndexOf('.')) + RMD_Ext, (err) => {
					if (err) {
						return callback(new Error('error occurred in renaming file.'), false);
					}

					return callback(false, true);
				});
			});
		} else {
			return callback(new Error('file is empty.'), false);
		}
	})
}

/**
 * Convertinn cran.r-project.org manuals to Rmd files.
 *
 * @since 1.0.0
 *
 * @param {function} callback a callback function that executes after items creation.
 */
function createItems(callback) {
	request('https://cran.r-project.org/manuals.html', function(error, response, html) {
		if (error) {
			return callback(new Error('Error occurred in request.'));
		}

		var $     = cheerio.load(html),
			items = [],
			name  = link = '';

		$('table tbody tr').each(function() {
			name = $( 'td:nth-child(1) strong', $(this) ).html();
			if ( 'The R Reference Index' === name ) {
				return true;
			}
			link = $('td:nth-child(2) a', $(this)).first().attr('href');
			if ( name && name.length && link && link.length ) {
				items.push( { 'name' : name, 'link' : link } );
			}
		});

		if (! items.length) {
			return callback(new Error('Can not find manuals.'));
		}

		// A flag counter to know about all of items markdown files created or no.
		var counter = 0;
		for (var i = 0, max = items.length; i < max; i++) {
			createMarkdown(items[i].link, i, function(err, value, index) {
				if (err) {
					return callback(err);
				}

				if (value) {
					items[ index ].link = 'http://localhost:' + config.PORT + '/' + value;
					if (++counter === items.length) {
						return callback(false, items);
					}
				}
			});
		}
	})
}

/**
 * Retrieve items from redis storage if they are exists otherwise creates them and saves on redis and returns.
 *
 * @since  1.0.0
 *
 * @param {function} callback a callback function that executes after getting items.
 */
function getItems(callback) {
	var client = redis.createClient();

	client.on('error', function (err) {
		console.log('Error occurred in creating redis client ' + err)
	});

	if (client) {
		client.hgetall('items', function(err, object) {
			if (object) {
				return object;
			} else {
				createItems(function(err, items) {
					if (err || ! items) {
						return callback(err);
					}

					client.hmset('items', items);
					return callback(false, items);
				});
			}
		});
	} else {
		createItems(function(err, items) {
			if (err || ! items) {
				return callback(err);
			}

			client.hmset('items', items);
			return callback(false, items);
		});
	}
}

module.exports.createMarkdown     = createMarkdown;
module.exports.createItems        = createItems;
module.exports.getItems           = getItems;
module.exports.convertToRMarkdown = convertToRMarkdown;
