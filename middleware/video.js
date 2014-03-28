var pg = require('pg');
var redis = require('redis-url').connect(process.env.REDISCLOUD_URL);

module.exports = {
    show: function(req, res) {
        //var cfpartial;
        //if (req.user) cfpartial = 'partials/commentform';
        //else cfpartial = 'partials/socialconnect';
        //if (res.locals.maxid && res.locals.video.minid && (res.locals.video.minid < res.locals.maxid)) res.locals.morecomments = true;
        res.render('video', {
            title: res.locals.video.slug
        });
    },
    bySlug: function (req, res, next) {
        var videokey = 'video_' + req.params.slug;
        redis.get(videokey, function (err, value) {
            if (value) {
                res.locals.video = JSON.parse(value);
                next();
            } else {
                pg.connect(process.env.HEROKU_POSTGRESQL_TEAL_URL, function (err, client, done) {
                    client.query('SELECT v.* FROM videos v WHERE v.slug = $1', [req.params.slug], function (err, result) {
                        done();
                        if (err) return console.error(err);

                        if (result.rows.length > 0) {
                            var video = result.rows[0];
                            res.locals.video = video;
                            redis.set(videokey, JSON.stringify(video));
                            next();
                        } else {
                            res.status(404).render('notfound');
                        }
                    });
                });
            }
        });
    },
    create: function (req, res) {

        var video = {
            uuid: req.body.uuid,
            ip: req._remoteAddress,
            date: new Date().toISOString()
        };
        var video_array = [req.body.uuid, req._remoteAddress, video.date];

        pg.connect(process.env.HEROKU_POSTGRESQL_TEAL_URL, function (err, client, done) {
            client.query('INSERT INTO videos(uuid, ip, date) VALUES($1, $2, $3) RETURNING id, slug', video_array, function (err, result) {
                done();
                if (err) next(err);
                video.id = result.rows[0].id;
                video.slug = result.rows[0].slug;

                redis.set('video_' + video.slug, JSON.stringify(video));

                res.send(video);
            });
        });
    }
}