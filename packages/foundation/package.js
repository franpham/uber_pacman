Package.describe({
  name: "franpham:foundation",
  version: "5.5.3",
	summary: "Foundation by ZURB - an advanced responsive web framework"
});

Package.onUse(function (api) {
	api.use('jquery@1.11.4', 'client');

	var path = Npm.require('path');
  api.add_files(path.join('css', 'clearfix.css'), 'client');
	api.add_files(path.join('css', 'normalize.min.css'), 'client');
	api.add_files(path.join('css', 'foundation.min.css'), 'client');

	api.add_files(path.join('js', 'vendor', 'modernizr.js'), 'client');
	api.add_files(path.join('js', 'vendor', 'fastclick.js'), 'client');
	api.add_files(path.join('js', 'vendor', 'jquery.cookie.js'), 'client');
	api.add_files(path.join('js', 'vendor', 'placeholder.js'), 'client');
	api.add_files(path.join('js', 'foundation.min.js'), 'client');
});