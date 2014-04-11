var port = process.env.PORT || 5000;

var express = require('express');
var app = express();
app.use(express.logger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.session({ secret: 'dy87sdvyh87j8fh' }));

var videos = require('./middleware/video.js');

app.locals.pubnub_key = process.env.PUBNUB_SUBSCRIBE_KEY;
app.locals.pubnub_channel = process.env.PUBNUB_CHANNEL;
app.locals.absolute_url = process.env.ABSOLUTE_URL;
app.locals.absolute_url_https = process.env.ABSOLUTE_URL_HTTPS;
app.locals.cameratag_appid = process.env.CAMERATAG_APPID;

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.set('partials', {header: 'partials/header', record_button: 'partials/record_button', socialmeta: 'partials/socialmeta', footer: 'partials/footer', chartbeat: 'partials/chartbeat'});
app.enable('view cache');
app.engine('html', require('hogan-express'));

var HoganTemplateCompiler = require('hogan-template-compiler'),
    templateDirectory = __dirname + "/views",
    hoganTemplateCompiler = HoganTemplateCompiler({
        partialsDirectory: templateDirectory + "/partials",
        layoutsDirectory: templateDirectory + "/layouts",
        sharedTemplatesTemplate: templateDirectory + "/sharedTemplates.html"
    });

app.get('/', function(request, response) {
    if (process.env.RECORD_ENABLED == "TRUE") {
        response.render('home', {title: 'Home'});
    } else {
        response.render('record_disabled');
    }
});

app.get('/record', function(request, response) {
    if (process.env.RECORD_ENABLED == "TRUE") {
        response.render('record', {title: 'Record', partials: {camera: 'partials/camera'}});
    } else {
        response.render('record_disabled');
    }
});

app.get("/templates.js",  function(req, res) {
    res.contentType(".js");
    res.send(hoganTemplateCompiler.getSharedTemplates());
});

app.use('/public', express.static(__dirname + '/public'));

app.get('/robots.txt', function(req, res){
    res.send(
        "Sitemap: " + app.locals.absolute_url + "/sitemap.xml"
    );
});

app.get('/sitemap.xml', function(req, res){
    res.set('Content-Type', 'text/xml');
    res.render('sitemap', {layout: 'layouts/sitemap'});
});

//app.get('/persist', videos.persistQueue, comments.persistQueue, videos.list, comments.refillCache);

app.get('/favicon.ico', function(req,res) {
    res.sendfile(__dirname + '/public/favicon.ico');
});

app.post('/video/create', videos.create);

app.get('/embed/:slug', videos.bySlug, videos.embed);

app.get('/:slug', videos.bySlug, videos.show);

// Listen on port

app.listen(port, function() {
  console.log("Listening on " + port);
});