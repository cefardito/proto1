var express = require('express');
var http = require("http");
var nconf = require('nconf');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var app = express();
var jwt = require('jsonwebtoken'); //se usa para manejo de JSON Web Tokens

//=============================================================================
//Carga la configuración general del sistema
//=============================================================================
nconf.use('file', { file: './config/' + app.get('env') + '/sysconfig.json' });
nconf.load();
console.log(nconf.get('rootPath'));

//se usa el body parser para obtener la información del método POST y/o parámetros de la URL
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

//se usa morgan para loggear los requests en la consola
app.use(morgan('dev'));

//=============================================================================

//set up handlebars view engine
var handlebars = require('express3-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine','handlebars');

app.set('port', process.env.PORT || 3000);


//Declara el middleware del directorio publico, donde reside el contenido estático
app.use(express.static(__dirname + '/public'));


app.use(require('body-parser')());

//====================================================================================================
//ROUTES CON ACCESO IRRESTRINGIDO
//====================================================================================================
app.get('/login', function(req, res){
		res.render('login', {layout:null});
	});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
app.post('/authenticate', function(req, res) {
    //find the user
    console.log(req.body.username);
    console.log(req.body.password);

    if(req.body.username != 'admin') {
        res.json({ success: false, message: 'Authentication failed. Wrong password.'});
    } else {

        // check if password matches
        if (req.body.password != 'secreto') {
            res.json({ success: false, message: 'Authentication failed. Wrong password.'});
        } else {

            //if user is found and password is right, create a token
            var token = jwt.sign('admin', nconf.get('superSecret'), {
                expiresInMinutes: 1440 //expires in 24 hours
            });

            //return the information including token as JSON
            res.json({
                success: true,
                message: 'Enjoy your token!',
                token: token
            });
        }
    }
    
});
//====================================================================================================


//====================================================================================================
//VALIDA LA VALIDEZ DEL TOKEN DE AUTORIZACION
//====================================================================================================
// route middleware to verify a token
app.use(function(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    //decode token
    if (token) {

        //verifies secret and checks exp
        jwt.verify(token, nconf.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'No se pudo autenticar el token de seguridad.'});
            } else {
                //if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });

    } else {

        //if there is no token return an error
        res.status(403);
        res.render('403',{layout:null});
    }
    
});
//====================================================================================================

//Se quitaron los routes y se pasaron al archivo routes.js
require('./routes.js')(app,nconf.get('rootPath'));

//====================================================================================================
//Este bloque sirve para renderizar automaticamente las vistas basadas en templates handlebars
//====================================================================================================

var autoViews = {};
var fs = require('fs');

app.use(function(req,res,next)
	{
		var path = req.path.toLowerCase();
		console.log(path);
		//check cache; if it's there, render the view
		if(autoViews[path]) return res.render(autoViews[path],{layout:null});
		//if it's not in the cache, see if there's a .handlebars file that matches
		if(fs.existsSync(__dirname + '/views' + path + '.handlebars')){
			autoViews[path] = path.replace(/^\//,'');
			return res.render(autoViews[path],{layout:null});
		}
		//no view found; pass on to 404 handler
		next();
	}
);
//====================================================================================================

// custom 404 page
app.use
(
	function(req, res, next)
	{
		res.status(404);
		res.render('404');
	}
);

//custom 500 page
app.use
(
	function(err, req, res, next)
	{
		console.error(err.stack);
		res.status(500).render('500');
		//res.status(500);
		//res.render('500');
	}
);


/*
app.listen
(
	app.get('port'), function()
	{
		console.log('Express started in ' + app.get('env') + ' mode on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
	}
);
*/


function startServer()
{
	http.createServer(app).listen(app.get('port'), function(){
			console.log( 'Express started in ' + app.get('env') + ' mode on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
		});
}

if(require.main === module)
{
	//application run directly; start up server
	startServer();
}
else
{
	//application imported as a module via "require": export function to create a server
	module.exports = startServer;
}

