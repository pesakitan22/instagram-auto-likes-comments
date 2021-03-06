const express = require('express');
const path = require('path');
const co = require('co');
const Nightmare = require('nightmare');
const router = express.Router();

router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/../views/home.html'));
});

router.post('/', function (req, res) {
    const nightmare = Nightmare({
        show: true,
        webPreferences: {
            partition: 'nopersist'
        },
    });

    const username = req.body.username;
    const password = req.body.password;
    const search = req.body.search;
    const comment = req.body.comment;
    const posts = req.body.posts;

    const searchSelector = 'input[placeholder="Search"]'; // "Search" is text in findline in your language(e.g.: "Search", "Поиск")
    const heartClass = 'coreSpriteHeartOpen';
    const spriteComment = '.coreSpriteComment';
    const commentSelector = 'textarea[placeholder="Add a comment..."]'; // "Add a comment..." is text in form for comment in your language("..." required)

    function *run() {
        const topPostClass = yield nightmare
            .goto('http://instagram.com')
            .wait('a[href="javascript:;"]')
            .click('a[href="javascript:;"]') // log in option
            .wait('input[name=username]')
            .insert('input[name=username]', username)
            .insert('input[name=password]', password)
            .click('button') // login button
            .wait(searchSelector)
            .insert(searchSelector, search)
            .wait('div div a')
            .wait(1000)
            .evaluate(function (selector) {
                const node = document.querySelector(selector).parentNode.childNodes[3];
                return node.childNodes[1].childNodes[0].childNodes[0].className;
            }, searchSelector);

        yield nightmare.click(`.${topPostClass}`).wait('h1');

        const postClass = yield nightmare
            .evaluate(function () {
                let position;
                const a = document.getElementsByTagName('a');
                for (let i = 0; i < a.length; i++) {
                    const link = a[i].getAttribute('href');
                    if (/\/p\//.test(link)) {
                        position = i;
                        break;
                    }
                }
                return a[position].parentNode.className.split(' ')[0];
            });

        yield nightmare
            .click(`.${postClass} a`) // click post
            .wait(spriteComment);

        const likeClass = yield nightmare
            .evaluate(function (selector) {
                const cls = document.querySelector(selector).parentNode.parentNode.childNodes[0].className;
                return cls.split(' ')[0];
            }, spriteComment);

        for (let i = 0; i < posts; i++) {
            nightmare.wait(Math.random() * (5 - 1) * 1000); // wait random time from 1 to 5 sec

            const liked = yield nightmare
                .evaluate(function (selector) {
                    return document.querySelector(`.${selector}`).childNodes[0].className.split(' ')[1];
                }, likeClass);

            if (heartClass === liked) nightmare.click(`.${likeClass}`); // like
            nightmare.type(commentSelector, comment) // comment
                .wait(Math.random() * (5 - 2) * 1000) // wait random time from 2 to 5 sec
                .type(commentSelector, '\u000d')
                .wait(Math.random() * (5 - 1) * 1000) // wait random time from 1 to 5 sec
                .click('.coreSpriteRightPaginationArrow'); // next
        }

        nightmare
            .wait(1000)
            .end()
            .then(function () {
                res.json({ status: 'success' });
            })
            .catch(function () {
                res.json({ status: 'error' });
            });
    }

    co(run).catch(function () {
        res.json({ status: 'error' });
    });
});

module.exports = router;