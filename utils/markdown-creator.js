const execSync = require('child_process').execSync;
const fs       = require('fs');

function createMarkdown(itemName, source) {
	if ( ! itemName || ! source ) {
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

module.exports.createMarkdown = createMarkdown;
