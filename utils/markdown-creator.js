const execSync = require('child_process').execSync;
const fs       = require('fs');
const request  = require('request');
const cheerio  = require('cheerio');
const redis    = require('redis');
const port     = 8081;

function createMarkdown(source) {
	if ( ! source ) {
		return false;
	}

	var name = source.split('/').pop().split('.').shift();
	if (name && name.length) {
		name += '.md';
		if (! fs.existsSync('./files/' + name)) {
			execSync('pandoc https://cran.r-project.org/' + source + ' -o ./files/' + name, (error, stdout, stderr) => {
				if (error) {
					return false;
				}
				return 'download/' + name;
			});
		} else {
			return 'download/' + name;
		}
	}

	return false;
}

function createItems() {
	return new Promise((resolve, reject) => {
		request('https://cran.r-project.org/manuals.html', function(error, response, html) {
			if (error) {
				reject('errors occurred in creating request.');
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
				reject('errors occurred in finding items.');
			}

			for (var i = 0, max = items.length; i < max; i++) {
				link = createMarkdown(items[i].link);
				// Try again.
				if (! link) {
					link = createMarkdown(items[i].link);
				}

				if (! link) {
					reject('errors occurred in creating markdown file.');
				}
				items[i].link = 'http://localhost:' + port + '/' + link;
			}

			resolve(items);
		})
	})
}

function getItems() {
	var client = redis.createClient();

	client.on('error', function (err) {
		console.log('Error occurred in creating redis client ' + err)
	});

	if (client) {
		client.hgetall('items', function(err, object) {
			if (object) {
				return object;
			} else {
				createItems().then(function(value) {
					client.hmset('items', value);
					return value;
				}).catch(function(reason) {
					console.log(reason);
					return false;
				});
			}
		});
	} else {
		createItems().then(function(value) {
			client.hmset('items', value);
			return value;
		}).catch(function(reason) {
			console.log(reason);
			return false;
		});
	}
}

module.exports.createMarkdown = createMarkdown;
module.exports.createItems    = createItems;
module.exports.getItems       = getItems;
