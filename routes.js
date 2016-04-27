
module.exports = function(app,rootPath)
{
	
	app.get('/', function(req, res){
		res.render('home');
	});

	app.get(rootPath, function(req, res){
		res.render('home');
	});
	
};